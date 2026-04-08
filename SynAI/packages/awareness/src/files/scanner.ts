import { open, readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type {
  FileAwarenessSnapshot,
  FileAwarenessSummary,
  FileCatalogEntry,
  FileChangeEntry,
  FileContentSlice,
  FileFolderPreview,
  FileFolderSummary,
  MediaCatalogEntry,
  PrivacyScope
} from "../../../contracts/src/awareness";
import {
  DEFAULT_MAX_CHANGES,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_FOLDERS,
  DEFAULT_MAX_MEDIA,
  FILE_FRESHNESS_WINDOW_MS,
  MAX_CONTEXT_LIST_ITEMS,
  SUMMARY_FRESHNESS_WINDOW_MS,
  chooseRoots,
  clone,
  createObservationFreshness,
  classifyPrivacyScope,
  extensionFromPath,
  formatBytes,
  inferContentHint,
  inferMediaKind,
  inferMimeType,
  inferTags,
  isWithinPath,
  isPubliclyVisibleScope,
  jsonFingerprint,
  normalizePathForMatch,
  readJsonIfExists,
  safeStat,
  shouldHashFile,
  walkAncestors,
  writeJson
} from "./shared";

interface FolderAccumulator {
  path: string;
  parentPath: string | null;
  name: string;
  totalSizeBytes: number;
  fileCount: number;
  folderCount: number;
  largeFileCount: number;
  recentChangeCount: number;
  fileTypeCounts: Record<string, number>;
  newestModifiedAtMs: number | null;
  oldestModifiedAtMs: number | null;
  topFiles: FileFolderPreview[];
}

interface RootCandidate {
  path: string;
  label: string;
  source: "default" | "workspace" | "user";
}

const fileSignature = (entry: Pick<FileCatalogEntry, "sizeBytes" | "modifiedAt" | "extension" | "hash">): string =>
  [entry.sizeBytes ?? -1, entry.modifiedAt ?? "", entry.extension ?? "", entry.hash ?? ""].join("|");

const buildFolder = (map: Map<string, FolderAccumulator>, folderPath: string): FolderAccumulator => {
  const normalized = normalizePathForMatch(folderPath);
  const existing = map.get(normalized);
  if (existing) {
    return existing;
  }

  const accumulator: FolderAccumulator = {
    path: normalized,
    parentPath: path.dirname(normalized) === normalized ? null : normalizePathForMatch(path.dirname(normalized)),
    name: path.basename(normalized) || normalized,
    totalSizeBytes: 0,
    fileCount: 0,
    folderCount: 0,
    largeFileCount: 0,
    recentChangeCount: 0,
    fileTypeCounts: {},
    newestModifiedAtMs: null,
    oldestModifiedAtMs: null,
    topFiles: []
  };

  map.set(normalized, accumulator);
  return accumulator;
};

const pushTopFile = (folder: FolderAccumulator, file: FileCatalogEntry): void => {
  folder.topFiles.push({
    path: file.path,
    sizeBytes: file.sizeBytes,
    modifiedAt: file.modifiedAt,
    mediaKind: file.mediaKind
  });
  folder.topFiles.sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0));
  if (folder.topFiles.length > 6) {
    folder.topFiles.length = 6;
  }
};

const registerFile = (map: Map<string, FolderAccumulator>, rootPath: string, file: FileCatalogEntry): void => {
  walkAncestors(file.parentPath ?? rootPath, rootPath, (ancestor) => {
    const folder = buildFolder(map, ancestor);
    folder.totalSizeBytes += file.sizeBytes ?? 0;
    folder.fileCount += 1;
    if ((file.sizeBytes ?? 0) >= 50 * 1024 * 1024) {
      folder.largeFileCount += 1;
    }
    const key = file.mediaKind ?? file.contentHint ?? file.extension ?? "unknown";
    folder.fileTypeCounts[key] = (folder.fileTypeCounts[key] ?? 0) + 1;
    const modifiedMs = file.modifiedAt ? Date.parse(file.modifiedAt) : null;
    if (modifiedMs != null && !Number.isNaN(modifiedMs)) {
      folder.newestModifiedAtMs = folder.newestModifiedAtMs == null ? modifiedMs : Math.max(folder.newestModifiedAtMs, modifiedMs);
      folder.oldestModifiedAtMs = folder.oldestModifiedAtMs == null ? modifiedMs : Math.min(folder.oldestModifiedAtMs, modifiedMs);
    }
    pushTopFile(folder, file);
  });
};

const imageDimensions = async (filePath: string, sizeBytes: number): Promise<{ width: number | null; height: number | null; codec: string | null }> => {
  const extension = extensionFromPath(filePath);
  if (!extension) {
    return { width: null, height: null, codec: null };
  }

  try {
    const handle = await open(filePath, "r");
    const buffer = Buffer.alloc(Math.min(sizeBytes, 256 * 1024));
    try {
      await handle.read(buffer, 0, buffer.length, 0);
    } finally {
      await handle.close();
    }

    if (extension === ".png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), codec: "png" };
    }

    if (extension === ".gif" && buffer.subarray(0, 3).toString("ascii") === "GIF") {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), codec: "gif" };
    }

    if (extension === ".jpg" || extension === ".jpeg") {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        const segmentLength = buffer.readUInt16BE(offset + 2);
        const frame =
          marker === 0xc0 ||
          marker === 0xc1 ||
          marker === 0xc2 ||
          marker === 0xc3 ||
          marker === 0xc5 ||
          marker === 0xc6 ||
          marker === 0xc7 ||
          marker === 0xc9 ||
          marker === 0xca ||
          marker === 0xcb;
        if (frame) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), codec: "jpeg" };
        }
        if (segmentLength <= 0) {
          break;
        }
        offset += 2 + segmentLength;
      }
    }
  } catch {
    return { width: null, height: null, codec: null };
  }

  return { width: null, height: null, codec: null };
};

const buildFileEntry = async (
  filePath: string,
  source: "default" | "workspace" | "user",
  capturedAt: string,
  now: Date,
  scanRoot?: string
): Promise<{ entry: FileCatalogEntry; media: MediaCatalogEntry | null }> => {
  const fileStat = await safeStat(filePath);
  if (!fileStat || !fileStat.isFile()) {
    throw new Error(`Unable to stat file: ${filePath}`);
  }

  const extension = extensionFromPath(filePath);
  const mediaKind = inferMediaKind(extension);
  const privacy = classifyPrivacyScope(filePath, source, scanRoot);
  const freshness = createObservationFreshness(capturedAt, fileStat.mtime.toISOString(), FILE_FRESHNESS_WINDOW_MS, now);
  const hash = shouldHashFile(filePath, fileStat.size, privacy.privacyScope)
    ? createHash("sha256").update(await readFile(filePath)).digest("hex")
    : null;

  const entry: FileCatalogEntry = {
    path: normalizePathForMatch(filePath),
    parentPath: normalizePathForMatch(path.dirname(filePath)),
    name: path.basename(filePath),
    kind: "file",
    extension,
    sizeBytes: fileStat.size,
    createdAt: fileStat.birthtime.toISOString(),
    modifiedAt: fileStat.mtime.toISOString(),
    accessedAt: fileStat.atime.toISOString(),
    owner: process.env.USERNAME ?? process.env.USER ?? null,
    mimeType: inferMimeType(extension, mediaKind),
    contentHint: inferContentHint(extension, mediaKind),
    hash,
    mediaKind,
    privacyScope: privacy.privacyScope,
    freshness,
    isSensitive: privacy.isSensitive,
    isProtected: privacy.isProtected
  };

  const media: MediaCatalogEntry | null = mediaKind
    ? {
        path: entry.path,
        parentPath: entry.parentPath,
        name: entry.name,
        mediaKind,
        extension,
        sizeBytes: entry.sizeBytes,
        createdAt: entry.createdAt,
        modifiedAt: entry.modifiedAt,
        accessedAt: entry.accessedAt,
        owner: entry.owner,
        mimeType: entry.mimeType,
        contentHint: entry.contentHint,
        width: null,
        height: null,
        durationSeconds: null,
        codec: null,
        pageCount: null,
        previewRef: null,
        tags: inferTags(filePath, mediaKind),
        privacyScope: entry.privacyScope,
        freshness: entry.freshness
      }
    : null;

  if (media && media.mediaKind === "photo") {
    const dimensions = await imageDimensions(filePath, fileStat.size);
    media.width = dimensions.width;
    media.height = dimensions.height;
    media.codec = dimensions.codec;
  }

  return { entry, media };
};

const summarizeFolders = (
  folderMap: Map<string, FolderAccumulator>,
  previousSnapshot: FileAwarenessSnapshot | null | undefined,
  capturedAt: string,
  now: Date,
  maxFolders: number
): FileFolderSummary[] => {
  const previousFolders = new Map((previousSnapshot?.folders ?? []).map((folder) => [normalizePathForMatch(folder.path), folder] as const));
  const folders = [...folderMap.values()].map((folder) => {
    const newestModifiedAt = folder.newestModifiedAtMs != null ? new Date(folder.newestModifiedAtMs).toISOString() : null;
    const oldestModifiedAt = folder.oldestModifiedAtMs != null ? new Date(folder.oldestModifiedAtMs).toISOString() : null;
    return {
      path: folder.path,
      parentPath: folder.parentPath,
      name: folder.name,
      totalSizeBytes: folder.totalSizeBytes,
      fileCount: folder.fileCount,
      folderCount: folder.folderCount,
      largeFileCount: folder.largeFileCount,
      recentChangeCount: folder.recentChangeCount,
      fileTypeCounts: clone(folder.fileTypeCounts),
      newestModifiedAt,
      oldestModifiedAt,
      growthBytes: previousFolders.has(folder.path) ? folder.totalSizeBytes - (previousFolders.get(folder.path)?.totalSizeBytes ?? 0) : null,
      hotScore: folder.recentChangeCount * 6 + folder.largeFileCount * 2 + Math.round(folder.totalSizeBytes / (10 * 1024 * 1024)),
      privacyScope: "user-visible local content" as PrivacyScope,
      freshness: createObservationFreshness(capturedAt, newestModifiedAt ?? capturedAt, SUMMARY_FRESHNESS_WINDOW_MS, now),
      topFiles: folder.topFiles.map(clone)
    } satisfies FileFolderSummary;
  });

  folders.sort((a, b) => b.hotScore - a.hotScore || (b.totalSizeBytes ?? 0) - (a.totalSizeBytes ?? 0) || a.path.localeCompare(b.path));
  return folders.slice(0, maxFolders);
};

const summarizeChanges = (changes: FileChangeEntry[], limit: number): FileChangeSummaryItem[] =>
  [...changes]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map((change) => ({
      type: change.type,
      path: change.path,
      previousPath: change.previousPath,
      timestamp: change.timestamp
    }));

const summarizeLargestFiles = (files: FileCatalogEntry[], limit: number): FileAwarenessSummary["largestFiles"] =>
  [...files]
    .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0) || (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? ""))
    .slice(0, limit)
    .map((file) => ({
      path: file.path,
      sizeBytes: file.sizeBytes,
      modifiedAt: file.modifiedAt,
      category: file.mediaKind ?? file.contentHint ?? file.extension,
      mediaKind: file.mediaKind
    }));

const summarizeRootSummaries = (roots: FileRootSnapshot[]): FileAwarenessSummary["rootSummaries"] =>
  roots.map((root) => ({
    path: root.path,
    label: root.label,
    fileCount: root.fileCount,
    folderCount: root.folderCount,
    totalSizeBytes: root.totalSizeBytes,
    recentChangeCount: root.recentChangeCount,
    hotScore: root.recentChangeCount * 6 + root.largeFolderCount * 2 + Math.round(root.totalSizeBytes / (10 * 1024 * 1024))
  }));

const summarizeHotFolders = (folders: FileFolderSummary[], limit: number): FileAwarenessSummary["hotFolders"] =>
  [...folders]
    .sort((a, b) => b.hotScore - a.hotScore || (b.totalSizeBytes ?? 0) - (a.totalSizeBytes ?? 0))
    .slice(0, limit)
    .map((folder) => ({
      path: folder.path,
      totalSizeBytes: folder.totalSizeBytes,
      recentChangeCount: folder.recentChangeCount,
      hotScore: folder.hotScore
    }));

const buildFingerprint = (snapshot: Pick<FileAwarenessSnapshot, "roots" | "files" | "folders" | "media" | "changes">): string =>
  jsonFingerprint({
    roots: snapshot.roots.map((root) => ({
      path: root.path,
      label: root.label,
      fileCount: root.fileCount,
      folderCount: root.folderCount,
      totalSizeBytes: root.totalSizeBytes,
      recentChangeCount: root.recentChangeCount
    })),
    files: snapshot.files.map((entry) => ({
      path: entry.path,
      sizeBytes: entry.sizeBytes,
      modifiedAt: entry.modifiedAt,
      mediaKind: entry.mediaKind
    })),
    folders: snapshot.folders.map((folder) => ({
      path: folder.path,
      totalSizeBytes: folder.totalSizeBytes,
      fileCount: folder.fileCount,
      folderCount: folder.folderCount,
      recentChangeCount: folder.recentChangeCount,
      hotScore: folder.hotScore
    })),
    media: snapshot.media.map((entry) => ({
      path: entry.path,
      mediaKind: entry.mediaKind,
      sizeBytes: entry.sizeBytes,
      width: entry.width,
      height: entry.height
    })),
    changes: snapshot.changes.map((entry) => ({
      type: entry.type,
      path: entry.path,
      previousPath: entry.previousPath,
      sizeBytes: entry.sizeBytes
    }))
  });

const rebuildChangeCounts = (map: Map<string, FolderAccumulator>, changes: FileChangeEntry[]): void => {
  for (const folder of map.values()) {
    folder.recentChangeCount = 0;
  }
  for (const change of changes) {
    for (const folder of map.values()) {
      if (isWithinPath(change.path, folder.path) || (change.previousPath ? isWithinPath(change.previousPath, folder.path) : false)) {
        folder.recentChangeCount += 1;
      }
    }
  }
};

const detectChanges = (
  currentFiles: FileCatalogEntry[],
  previousSnapshot: FileAwarenessSnapshot | null | undefined,
  capturedAt: string,
  now: Date,
  maxChanges: number
): FileChangeEntry[] => {
  const previousFiles = new Map((previousSnapshot?.files ?? []).map((entry) => [entry.path, entry] as const));
  const currentFilesByPath = new Map(currentFiles.map((entry) => [entry.path, entry] as const));
  const created: FileCatalogEntry[] = [];
  const deleted: FileCatalogEntry[] = [];
  const modified: FileCatalogEntry[] = [];

  for (const file of currentFiles) {
    const previous = previousFiles.get(file.path);
    if (!previous) {
      created.push(file);
    } else if (fileSignature(previous) !== fileSignature(file)) {
      modified.push(file);
    }
  }

  for (const previous of previousFiles.values()) {
    if (!currentFilesByPath.has(previous.path)) {
      deleted.push(previous);
    }
  }

  const renamed: Array<{ previous: FileCatalogEntry; current: FileCatalogEntry }> = [];
  const remainingCreated = [...created];
  const remainingDeleted = [...deleted];
  for (const deletedEntry of [...remainingDeleted]) {
    const signature = fileSignature(deletedEntry);
    const matchIndex = remainingCreated.findIndex((entry) => fileSignature(entry) === signature);
    if (matchIndex >= 0) {
      const [currentEntry] = remainingCreated.splice(matchIndex, 1);
      const deletedIndex = remainingDeleted.findIndex((entry) => entry.path === deletedEntry.path);
      if (deletedIndex >= 0) {
        remainingDeleted.splice(deletedIndex, 1);
      }
      renamed.push({ previous: deletedEntry, current: currentEntry });
    }
  }

  const changes: FileChangeEntry[] = [];
  const pushChange = (type: FileChangeEntry["type"], file: FileCatalogEntry, previousPath: string | null, hash = file.hash): void => {
    changes.push({
      id: randomUUID(),
      timestamp: capturedAt,
      type,
      path: file.path,
      previousPath,
      rootPath: file.parentPath ?? file.path,
      kind: "file",
      sizeBytes: file.sizeBytes,
      hash,
      privacyScope: file.privacyScope,
      freshness: createObservationFreshness(capturedAt, file.modifiedAt ?? capturedAt, FILE_FRESHNESS_WINDOW_MS, now)
    });
  };

  for (const file of remainingCreated) {
    pushChange("created", file, null);
  }
  for (const file of modified) {
    pushChange("modified", file, file.path);
  }
  for (const pair of renamed) {
    pushChange("renamed", pair.current, pair.previous.path, pair.current.hash ?? pair.previous.hash);
  }
  for (const file of remainingDeleted) {
    pushChange("deleted", file, file.path);
  }

  changes.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.path.localeCompare(b.path));
  return changes.slice(0, maxChanges);
};

const scanDirectory = async (
  directoryPath: string,
  candidate: RootCandidate,
  capturedAt: string,
  now: Date,
  limits: { maxDepth: number; maxEntries: number; maxFiles: number; maxFolders: number; maxMedia: number },
  state: { files: FileCatalogEntry[]; media: MediaCatalogEntry[]; blockedScopes: Set<PrivacyScope>; truncated: boolean },
  folderMap: Map<string, FolderAccumulator>,
  counters: { entries: number; files: number; folders: number; media: number },
  depth = 0
): Promise<void> => {
  if (state.truncated || counters.entries >= limits.maxEntries || depth > limits.maxDepth) {
    state.truncated = true;
    return;
  }

  let entries: Array<Awaited<ReturnType<typeof readdir>>[number]> = [];
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (state.truncated || counters.entries >= limits.maxEntries) {
      state.truncated = true;
      return;
    }

    const childPath = normalizePathForMatch(path.join(directoryPath, entry.name));
    const classification = classifyPrivacyScope(childPath, candidate.source, candidate.path);
    if (classification.shouldExclude) {
      state.blockedScopes.add(classification.privacyScope);
      continue;
    }
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      counters.entries += 1;
      counters.folders += 1;
      const childFolder = buildFolder(folderMap, childPath);
      walkAncestors(path.dirname(childPath), candidate.path, (ancestor) => {
        buildFolder(folderMap, ancestor).folderCount += 1;
      });
      if (counters.folders <= limits.maxFolders) {
        childFolder.name = entry.name;
      }
      await scanDirectory(childPath, candidate, capturedAt, now, limits, state, folderMap, counters, depth + 1);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await safeStat(childPath);
    if (!fileStat) {
      continue;
    }

    counters.entries += 1;
    counters.files += 1;
    const { entry: fileEntry, media } = await buildFileEntry(childPath, candidate.source, capturedAt, now, candidate.path);
    if (counters.files <= limits.maxFiles) {
      state.files.push(fileEntry);
    } else {
      state.truncated = true;
    }
    if (media && counters.media < limits.maxMedia) {
      state.media.push(media);
      counters.media += 1;
    }
    if (isPubliclyVisibleScope(fileEntry.privacyScope)) {
      registerFile(folderMap, candidate.path, fileEntry);
    }
  }
};

const buildSummaryText = (snapshot: FileAwarenessSnapshot): string => {
  const roots = snapshot.roots.filter((root) => root.included).map((root) => root.label).slice(0, 4);
  const largest = snapshot.summary.largestFiles
    .slice(0, 2)
    .map((entry) => `${path.basename(entry.path)} (${formatBytes(entry.sizeBytes)})`);
  const recent = snapshot.summary.recentChanges.slice(0, 2).map((entry) => `${entry.type} ${path.basename(entry.path)}`);
  const parts = [
    `${snapshot.summary.counts.roots} roots`,
    `${snapshot.summary.counts.files} files`,
    `${snapshot.summary.counts.folders} folders`,
    `${snapshot.summary.counts.media} media`,
    `${snapshot.summary.counts.recentChanges} changes`
  ];
  if (roots.length > 0) {
    parts.push(`roots ${roots.join(", ")}`);
  }
  if (largest.length > 0) {
    parts.push(`largest ${largest.join(", ")}`);
  }
  if (recent.length > 0) {
    parts.push(`recent ${recent.join(", ")}`);
  }
  if (snapshot.isTruncated) {
    parts.push("partial");
  }
  return parts.join(" | ");
};

export const captureFileAwarenessSnapshot = async (
  options: {
    workspaceRoot?: string;
    roots?: string[];
    additionalRoots?: string[];
    now?: () => Date;
    maxDepth?: number;
    maxEntries?: number;
    maxFiles?: number;
    maxFolders?: number;
    maxMedia?: number;
    maxChanges?: number;
    previousSnapshot?: FileAwarenessSnapshot | null;
  } = {}
): Promise<FileAwarenessSnapshot> => {
  const now = options.now ?? (() => new Date());
  const observedAt = now();
  const capturedAt = observedAt.toISOString();
  const candidates = chooseRoots(options).map((candidate) => ({
    path: candidate.path,
    label: candidate.label,
    source: candidate.source
  }));
  const folderMap = new Map<string, FolderAccumulator>();
  const state = { roots: [] as FileRootSnapshot[], files: [] as FileCatalogEntry[], folders: [] as FileFolderSummary[], media: [] as MediaCatalogEntry[], changes: [] as FileChangeEntry[], blockedScopes: new Set<PrivacyScope>(), truncated: false };
  const counters = { entries: 0, files: 0, folders: 0, media: 0 };

  for (const candidate of candidates) {
    const rootStat = await safeStat(candidate.path);
    const included = Boolean(rootStat && rootStat.isDirectory());
    state.roots.push({
      path: normalizePathForMatch(candidate.path),
      label: candidate.label,
      source: candidate.source,
      privacyScope: candidate.source === "workspace" ? "public metadata" : "user-visible local content",
      included,
      excludedReason: included ? null : "not found or not a directory",
      freshness: createObservationFreshness(capturedAt, included ? capturedAt : null, SUMMARY_FRESHNESS_WINDOW_MS, observedAt),
      totalSizeBytes: 0,
      fileCount: 0,
      folderCount: 0,
      largeFolderCount: 0,
      hotFolderCount: 0,
      recentChangeCount: 0,
      isTruncated: false
    });
    if (!included) {
      state.blockedScopes.add("protected/system-sensitive surfaces");
      continue;
    }
    await scanDirectory(candidate.path, candidate, capturedAt, observedAt, {
      maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
      maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
      maxFiles: options.maxFiles ?? DEFAULT_MAX_FILES,
      maxFolders: options.maxFolders ?? DEFAULT_MAX_FOLDERS,
      maxMedia: options.maxMedia ?? DEFAULT_MAX_MEDIA
    }, state, folderMap, counters, 0);
  }

  const previousFiles = new Map((options.previousSnapshot?.files ?? []).map((entry) => [entry.path, entry] as const));
  const currentFilesByPath = new Map(state.files.map((entry) => [entry.path, entry] as const));
  const created: FileCatalogEntry[] = [];
  const deleted: FileCatalogEntry[] = [];
  const modified: FileCatalogEntry[] = [];
  for (const file of state.files) {
    const previous = previousFiles.get(file.path);
    if (!previous) {
      created.push(file);
    } else if (fileSignature(previous) !== fileSignature(file)) {
      modified.push(file);
    }
  }
  for (const previous of previousFiles.values()) {
    if (!currentFilesByPath.has(previous.path)) {
      deleted.push(previous);
    }
  }
  const renamed: Array<{ previous: FileCatalogEntry; current: FileCatalogEntry }> = [];
  const remainingCreated = [...created];
  const remainingDeleted = [...deleted];
  for (const deletedEntry of [...remainingDeleted]) {
    const signature = fileSignature(deletedEntry);
    const matchIndex = remainingCreated.findIndex((entry) => fileSignature(entry) === signature);
    if (matchIndex >= 0) {
      const [currentEntry] = remainingCreated.splice(matchIndex, 1);
      const deletedIndex = remainingDeleted.findIndex((entry) => entry.path === deletedEntry.path);
      if (deletedIndex >= 0) {
        remainingDeleted.splice(deletedIndex, 1);
      }
      renamed.push({ previous: deletedEntry, current: currentEntry });
    }
  }

  const pushChange = (type: FileChangeEntry["type"], file: FileCatalogEntry, previousPath: string | null, hash = file.hash): void => {
    state.changes.push({
      id: randomUUID(),
      timestamp: capturedAt,
      type,
      path: file.path,
      previousPath,
      rootPath: file.parentPath ?? file.path,
      kind: "file",
      sizeBytes: file.sizeBytes,
      hash,
      privacyScope: file.privacyScope,
      freshness: createObservationFreshness(capturedAt, file.modifiedAt ?? capturedAt, FILE_FRESHNESS_WINDOW_MS, observedAt)
    });
  };
  for (const file of remainingCreated) pushChange("created", file, null);
  for (const file of modified) pushChange("modified", file, file.path);
  for (const pair of renamed) pushChange("renamed", pair.current, pair.previous.path, pair.current.hash ?? pair.previous.hash);
  for (const file of remainingDeleted) pushChange("deleted", file, file.path);
  state.changes.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.path.localeCompare(b.path));
  state.changes = state.changes.slice(0, options.maxChanges ?? DEFAULT_MAX_CHANGES);

  const publicFiles = state.files.filter((entry) => isPubliclyVisibleScope(entry.privacyScope));
  const publicChanges = state.changes.filter((entry) => isPubliclyVisibleScope(entry.privacyScope));
  const publicMedia = state.media.filter((entry) => isPubliclyVisibleScope(entry.privacyScope));

  rebuildChangeCounts(folderMap, publicChanges);
  for (const root of state.roots) {
    const accumulator = folderMap.get(normalizePathForMatch(root.path));
    if (accumulator) {
      root.totalSizeBytes = accumulator.totalSizeBytes;
      root.fileCount = accumulator.fileCount;
      root.folderCount = accumulator.folderCount;
      root.largeFolderCount = accumulator.largeFileCount;
      root.hotFolderCount = accumulator.recentChangeCount;
      root.recentChangeCount = accumulator.recentChangeCount;
      root.isTruncated = state.truncated;
    }
  }

  state.folders = summarizeFolders(folderMap, options.previousSnapshot, capturedAt, observedAt, options.maxFolders ?? DEFAULT_MAX_FOLDERS);
  state.media.sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0) || a.path.localeCompare(b.path));
  if (state.media.length > (options.maxMedia ?? DEFAULT_MAX_MEDIA)) {
    state.media.length = options.maxMedia ?? DEFAULT_MAX_MEDIA;
    state.truncated = true;
  }

  const blockedScopes = [...state.blockedScopes];
  const counts: FileAwarenessSummary["counts"] = {
    roots: state.roots.length,
    files: publicFiles.length,
    folders: state.folders.length,
    media: publicMedia.length,
    recentChanges: publicChanges.length,
    protectedEntries: blockedScopes.filter((scope) => scope === "protected/system-sensitive surfaces").length,
    sensitiveEntries: blockedScopes.filter((scope) => scope === "sensitive local content").length
  };
  const summary: FileAwarenessSummary = {
    capturedAt,
    freshness: createObservationFreshness(capturedAt, capturedAt, SUMMARY_FRESHNESS_WINDOW_MS, observedAt),
    summary: "",
    isTruncated: state.truncated,
    counts,
    changeCounts: {
      created: state.changes.filter((change) => change.type === "created").length,
      modified: state.changes.filter((change) => change.type === "modified").length,
      deleted: state.changes.filter((change) => change.type === "deleted").length,
      renamed: state.changes.filter((change) => change.type === "renamed").length
    },
    rootSummaries: summarizeRootSummaries(state.roots),
    largestFiles: summarizeLargestFiles(publicFiles, MAX_CONTEXT_LIST_ITEMS),
    recentChanges: summarizeChanges(publicChanges, MAX_CONTEXT_LIST_ITEMS),
    hotFolders: summarizeHotFolders(state.folders, MAX_CONTEXT_LIST_ITEMS),
    blockedScopes
  };
  const snapshot: FileAwarenessSnapshot = {
    capturedAt,
    freshness: summary.freshness,
    roots: state.roots,
    files: state.files,
    folders: state.folders,
    media: state.media,
    changes: state.changes,
    summary,
    fingerprint: "",
    isTruncated: state.truncated
  };
  snapshot.summary.summary = buildSummaryText(snapshot);
  snapshot.fingerprint = buildFingerprint(snapshot);
  return snapshot;
};

const readTextSlice = async (filePath: string, maxBytes: number): Promise<string> => {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
};

export const readFileContentSlice = async (
  filePath: string,
  options: { startLine?: number; endLine?: number; maxBytes?: number } = {}
): Promise<FileContentSlice | null> => {
  const normalized = normalizePathForMatch(filePath);
  const fileStat = await safeStat(normalized);
  if (!fileStat || !fileStat.isFile()) {
    return null;
  }

  const privacy = classifyPrivacyScope(normalized, "user");
  if (privacy.shouldExclude || privacy.privacyScope === "protected/system-sensitive surfaces" || privacy.privacyScope === "sensitive local content") {
    return null;
  }

  const extension = extensionFromPath(normalized);
  const mediaKind = inferMediaKind(extension);
  const maxBytes = Math.max(512, options.maxBytes ?? 8192);
  const raw = await readTextSlice(normalized, Math.min(maxBytes, fileStat.size));
  const lines = raw.split(/\r?\n/);
  const startLine = Math.max(1, options.startLine ?? 1);
  const endLine = Math.max(startLine, options.endLine ?? startLine + 39);
  const content = lines.slice(startLine - 1, endLine).join("\n");

  return {
    path: normalized,
    startLine,
    endLine,
    content,
    truncated: endLine < lines.length || fileStat.size > maxBytes,
    privacyScope: privacy.privacyScope,
    freshness: createObservationFreshness(fileStat.mtime.toISOString(), fileStat.mtime.toISOString(), FILE_FRESHNESS_WINDOW_MS),
    mimeType: inferMimeType(extension, mediaKind),
    contentHint: inferContentHint(extension, mediaKind)
  };
};

export const buildFileAwarenessSummary = (snapshot: FileAwarenessSnapshot): FileAwarenessSummary => snapshot.summary;
export const readFileAwarenessSnapshot = readJsonIfExists<FileAwarenessSnapshot>;
export const writeFileAwarenessSnapshot = writeJson;
