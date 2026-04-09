import { mkdir, readFile, stat as fsStat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type {
  FileAwarenessSnapshot,
  FileContentSlice,
  FileFolderPreview,
  EvidenceRef,
  FileJournalCursor,
  FileMediaKind,
  FileRootSource,
  FolderListingSummary,
  PrivacyScope,
  VolumeAwarenessSnapshot,
  VolumeMonitorState
} from "../contracts/awareness";

export const FILE_FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SUMMARY_FRESHNESS_WINDOW_MS = 60 * 60 * 1000;
export const DEFAULT_MAX_DEPTH = 5;
export const DEFAULT_MAX_ENTRIES = 2500;
export const DEFAULT_MAX_FILES = 1500;
export const DEFAULT_MAX_FOLDERS = 600;
export const DEFAULT_MAX_MEDIA = 300;
export const DEFAULT_MAX_CHANGES = 100;
export const MAX_TOP_FILES_PER_FOLDER = 6;
export const MAX_CONTEXT_LIST_ITEMS = 5;

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const digestHash = (value: string): string => createHash("sha256").update(value).digest("hex");

export const jsonFingerprint = (value: unknown): string => digestHash(JSON.stringify(value));

export const normalizePathForMatch = (value: string): string => path.normalize(value);

export const lowerPath = (value: string): string => normalizePathForMatch(value).toLowerCase();

export const pathSegments = (value: string): string[] =>
  lowerPath(value)
    .split(/[\\/]+/)
    .filter(Boolean);

export const compactPath = (value: string, segments = 2): string => {
  const parts = path.normalize(value).split(path.sep).filter(Boolean);
  return parts.length <= segments ? path.normalize(value) : parts.slice(-segments).join(path.sep);
};

export const formatBytes = (value: number | null): string => {
  if (value == null || Number.isNaN(value)) {
    return "n/a";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return unit === 0 ? `${Math.round(size)}${units[unit]}` : `${size.toFixed(1)}${units[unit]}`;
};

export const createObservationFreshness = (
  capturedAt: string,
  observedAt: string | null | undefined,
  staleAfterMs = FILE_FRESHNESS_WINDOW_MS,
  now = new Date()
): { capturedAt: string; generatedAt: string; observedAt: string; ageMs: number; staleAfterMs: number; isFresh: boolean } => {
  const observed = observedAt ?? capturedAt;
  const ageMs = Math.max(0, Date.parse(now.toISOString()) - Date.parse(observed));

  return {
    capturedAt,
    generatedAt: capturedAt,
    observedAt: observed,
    ageMs,
    staleAfterMs,
    isFresh: ageMs <= staleAfterMs
  };
};

export const isWithinPath = (candidate: string, parentPath: string): boolean => {
  const candidatePath = lowerPath(candidate);
  const parent = lowerPath(parentPath);
  return candidatePath === parent || candidatePath.startsWith(`${parent}${path.sep}`);
};

export const walkAncestors = (folderPath: string, rootPath: string, callback: (ancestor: string) => void): void => {
  let current = normalizePathForMatch(folderPath);
  const root = normalizePathForMatch(rootPath);

  while (true) {
    callback(current);
    if (current === root) {
      return;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }

    current = parent;
  }
};

export const excludedSegments = new Set([
  ".git",
  ".runtime",
  ".cache",
  ".vite",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "release",
  "debug",
  "tmp",
  "temp",
  "cache",
  "caches",
  "__pycache__"
]);

export const sensitivePathPatterns = [
  "password",
  "passwords",
  "secret",
  "secrets",
  "credential",
  "credentials",
  "token",
  "tokens",
  "oauth",
  "vault",
  "private",
  "bank",
  "tax",
  "invoice",
  "id_rsa",
  "id_ed25519",
  ".ssh",
  ".gnupg"
];

export const protectedPathPatterns = [
  "dumpstack.log",
  "hiberfil.sys",
  "pagefile.sys",
  "swapfile.sys",
  "login data",
  "cookies",
  "local storage",
  "session storage",
  "indexeddb",
  "webcache",
  "code cache",
  "gpcache",
  "gpucache",
  "keychain",
  "prefetch",
  "system volume information",
  "$recycle.bin",
  "appdata\\local\\temp",
  "appdata\\local\\microsoft\\windows\\inetcache",
  "appdata\\local\\microsoft\\windows\\history",
  "appdata\\local\\google\\chrome\\user data\\default\\login data",
  "appdata\\local\\microsoft\\edge\\user data\\default\\login data",
  "appdata\\roaming\\mozilla\\firefox"
];

export const mediaExtToKind: Record<string, FileMediaKind> = {
  ".jpg": "photo",
  ".jpeg": "photo",
  ".png": "photo",
  ".gif": "photo",
  ".webp": "photo",
  ".bmp": "photo",
  ".tiff": "photo",
  ".tif": "photo",
  ".heic": "photo",
  ".heif": "photo",
  ".mp4": "video",
  ".mov": "video",
  ".mkv": "video",
  ".avi": "video",
  ".wmv": "video",
  ".webm": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".flac": "audio",
  ".aac": "audio",
  ".m4a": "audio",
  ".ogg": "audio",
  ".pdf": "document",
  ".doc": "document",
  ".docx": "document",
  ".ppt": "document",
  ".pptx": "document",
  ".xls": "document",
  ".xlsx": "document"
};

export const extensionToMimeType: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".csv": "text/csv",
  ".log": "text/plain",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".html": "text/html",
  ".css": "text/css",
  ".xml": "application/xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".wmv",
  ".webm",
  ".mp3",
  ".wav",
  ".flac",
  ".aac",
  ".m4a",
  ".ogg",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".zip",
  ".rar",
  ".7z",
  ".gz",
  ".tar",
  ".exe",
  ".dll",
  ".msi"
]);

export interface FileRootCandidate {
  path: string;
  label: string;
  source: FileRootSource;
}

export interface FolderAccumulator {
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

export interface FileCatalogState {
  capturedAt: string;
  observedAt: Date;
  roots: FileAwarenessSnapshot["roots"];
  files: FileAwarenessSnapshot["files"];
  folders: FileAwarenessSnapshot["folders"];
  media: FileAwarenessSnapshot["media"];
  changes: FileAwarenessSnapshot["changes"];
  blockedScopes: Set<PrivacyScope>;
  truncated: boolean;
}

export interface FileAwarenessRuntimePaths {
  runtimeRoot: string;
  currentCatalogPath: string;
  previousCatalogPath: string;
  recentChangesPath: string;
  latestSummaryPath: string;
}

export interface FileCaptureOptions {
  workspaceRoot?: string;
  roots?: string[];
  additionalRoots?: string[];
  rootCandidates?: FileRootCandidate[];
  volumes?: VolumeAwarenessSnapshot[];
  journalCursors?: FileJournalCursor[];
  monitor?: VolumeMonitorState | null;
  now?: () => Date;
  maxDepth?: number;
  maxEntries?: number;
  maxFiles?: number;
  maxFolders?: number;
  maxMedia?: number;
  maxChanges?: number;
  previousSnapshot?: FileAwarenessSnapshot | null;
}

export interface FileContentSliceOptions {
  startLine?: number;
  endLine?: number;
  maxBytes?: number;
}

export interface FileAwarenessState {
  readonly paths: FileAwarenessRuntimePaths;
  readonly snapshot: FileAwarenessSnapshot;
  refresh(reason?: string): Promise<FileAwarenessSnapshot>;
  listRoots(): FileAwarenessSnapshot["roots"];
  listVolumes(): VolumeAwarenessSnapshot[];
  searchFiles(query: string, limit?: number): FileAwarenessSnapshot["files"];
  searchMedia(query: string, limit?: number): FileAwarenessSnapshot["media"];
  searchFolders(query: string, limit?: number): FileAwarenessSnapshot["folders"];
  getLargestFiles(limit?: number): FileAwarenessSnapshot["files"];
  getNewestFiles(limit?: number): FileAwarenessSnapshot["files"];
  getRecentChanges(limit?: number): FileAwarenessSnapshot["changes"];
  getFolderSummary(folderPath: string): FileAwarenessSnapshot["folders"][number] | null;
  browseFolder(folderPath: string): Promise<FolderListingSummary | null>;
  getMonitorStatus(): VolumeMonitorState | null;
  readFileContentSlice(filePath: string, options?: FileContentSliceOptions): Promise<FileContentSlice | null>;
}

export const buildFileAwarenessRuntimePaths = (runtimeRoot: string): FileAwarenessRuntimePaths => ({
  runtimeRoot,
  currentCatalogPath: path.join(runtimeRoot, "current-catalog.json"),
  previousCatalogPath: path.join(runtimeRoot, "previous-catalog.json"),
  recentChangesPath: path.join(runtimeRoot, "recent-changes.json"),
  latestSummaryPath: path.join(runtimeRoot, "latest-summary.json")
});

export const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const safeStat = async (filePath: string) => {
  try {
    return await fsStat(filePath);
  } catch {
    return null;
  }
};

export const extensionFromPath = (filePath: string): string | null => {
  const ext = path.extname(filePath).toLowerCase();
  return ext || null;
};

export const inferMediaKind = (extension: string | null): FileMediaKind | null => {
  if (!extension) {
    return null;
  }

  return mediaExtToKind[extension.toLowerCase()] ?? null;
};

export const inferMimeType = (extension: string | null, mediaKind: FileMediaKind | null): string | null => {
  if (extension && extensionToMimeType[extension.toLowerCase()]) {
    return extensionToMimeType[extension.toLowerCase()];
  }

  switch (mediaKind) {
    case "photo":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "document":
      return "application/*";
    default:
      return null;
  }
};

export const inferContentHint = (extension: string | null, mediaKind: FileMediaKind | null): string | null => {
  if (mediaKind) {
    return mediaKind;
  }

  if (!extension) {
    return null;
  }

  if (
    [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json", ".xml", ".yaml", ".yml", ".md", ".txt", ".csv", ".log"].includes(
      extension
    )
  ) {
    return "text";
  }

  if ([".zip", ".rar", ".7z", ".gz", ".tar"].includes(extension)) {
    return "archive";
  }

  if ([".exe", ".dll", ".msi"].includes(extension)) {
    return "binary";
  }

  return null;
};

export const inferTags = (filePath: string, mediaKind: FileMediaKind | null): string[] => {
  const tokens = path
    .basename(filePath)
    .replace(/\.[^.]+$/, "")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 2);

  const tags = new Set<string>(tokens.slice(0, 4));
  if (mediaKind) {
    tags.add(mediaKind);
  }

  return [...tags];
};

export const classifyPrivacyScope = (
  filePath: string,
  rootSource: FileRootSource,
  scanRoot?: string
): { privacyScope: PrivacyScope; isSensitive: boolean; isProtected: boolean; shouldExclude: boolean } => {
  const normalized = lowerPath(filePath);
  const rootNorm = scanRoot ? lowerPath(normalizePathForMatch(scanRoot)) : null;

  // Check segments and patterns relative to the scan root so that ancestor path
  // components above the root (e.g. "Temp" in AppData\Local\Temp when the root is
  // inside there for tests or edge-case mounts) do not falsely trigger exclusions.
  const relativePart = rootNorm && normalized.startsWith(rootNorm)
    ? normalized.slice(rootNorm.length).replace(/^[/\\]+/, "")
    : normalized;
  const segments = relativePart ? pathSegments(relativePart) : pathSegments(normalized);

  if (
    segments.some((segment) => excludedSegments.has(segment)) ||
    relativePart.includes(`${path.sep}node_modules${path.sep}`.toLowerCase()) ||
    relativePart.includes(`${path.sep}.git${path.sep}`.toLowerCase())
  ) {
    return {
      privacyScope: "protected/system-sensitive surfaces",
      isSensitive: false,
      isProtected: true,
      shouldExclude: true
    };
  }

  if (protectedPathPatterns.some((pattern) => relativePart.includes(pattern))) {
    return {
      privacyScope: "protected/system-sensitive surfaces",
      isSensitive: true,
      isProtected: true,
      shouldExclude: true
    };
  }

  // Sensitive-path check uses the full normalized path so that credential-named files
  // anywhere in the tree are caught even when called without a scan root context.
  if (sensitivePathPatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      privacyScope: "sensitive local content",
      isSensitive: true,
      isProtected: false,
      shouldExclude: false
    };
  }

  return {
    privacyScope: rootSource === "workspace" ? "public metadata" : "user-visible local content",
    isSensitive: false,
    isProtected: false,
    shouldExclude: false
  };
};

export const isPubliclyVisibleScope = (privacyScope: PrivacyScope): boolean =>
  privacyScope === "public metadata" || privacyScope === "user-visible local content";

export const shouldHashFile = (filePath: string, sizeBytes: number, privacyScope: PrivacyScope): boolean => {
  if (!isPubliclyVisibleScope(privacyScope)) {
    return false;
  }

  if (sizeBytes > 128 * 1024) {
    return false;
  }

  const extension = extensionFromPath(filePath);
  return !extension || !binaryExtensions.has(extension.toLowerCase());
};

export const chooseRoots = (options: FileCaptureOptions): FileRootCandidate[] => {
  const candidates: Array<{ path: string; source: FileRootSource }> = [];

  if (options.rootCandidates?.length) {
    for (const root of options.rootCandidates) {
      candidates.push({ path: root.path, source: root.source });
    }
  } else if (options.roots?.length) {
    for (const root of options.roots) {
      candidates.push({ path: root, source: "user" });
    }
  } else {
    const home = os.homedir();
    const defaults = [
      path.join(home, "Desktop"),
      path.join(home, "Documents"),
      path.join(home, "Downloads"),
      path.join(home, "Pictures"),
      path.join(home, "Videos")
    ];

    for (const root of defaults) {
      if (existsSync(root)) {
        candidates.push({ path: root, source: "default" });
      }
    }

    if (options.workspaceRoot && existsSync(options.workspaceRoot)) {
      candidates.push({ path: options.workspaceRoot, source: "workspace" });
    }

    for (const root of options.additionalRoots ?? []) {
      candidates.push({ path: root, source: "user" });
    }
  }

  const deduped = new Map<string, FileRootCandidate>();
  for (const candidate of candidates) {
    const resolved = normalizePathForMatch(candidate.path);
    const key = lowerPath(resolved);
    if (!deduped.has(key)) {
      deduped.set(key, {
        path: resolved,
        label: path.basename(resolved) || resolved,
        source: candidate.source
      });
    }
  }

  return [...deduped.values()];
};

export const createImagePreviewRef = (filePath: string): EvidenceRef => ({
  id: filePath,
  kind: "file",
  label: "preview",
  path: filePath
});

