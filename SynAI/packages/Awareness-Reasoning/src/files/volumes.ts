import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type {
  FileJournalCursor,
  FileRootSource,
  FolderListingEntry,
  FolderListingSummary,
  VolumeAwarenessSnapshot,
  VolumeAwarenessType,
  VolumeMonitorState
} from "../contracts/awareness";
import { runPowerShellJson } from "../windows/powershell";
import { refreshVolumeJournalState } from "./journal";
import {
  createObservationFreshness,
  extensionFromPath,
  inferMediaKind,
  normalizePathForMatch,
  safeStat,
  classifyPrivacyScope
} from "./shared";

const VOLUME_TIMEOUT_MS = 8_000;
const MAX_FOLDER_LISTING_ENTRIES = 60;

interface PowerShellVolumeEntry {
  id?: string | null;
  rootPath?: string | null;
  label?: string | null;
  driveLetter?: string | null;
  fileSystem?: string | null;
  volumeType?: string | null;
  totalBytes?: number | null;
  freeBytes?: number | null;
  indexedSearchCapable?: boolean | null;
  ntfsJournalCapable?: boolean | null;
}

const volumeScript = `
Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue |
Where-Object { $_.DriveType -in 2,3 } |
ForEach-Object {
  [PSCustomObject]@{
    id = if ($_.DeviceID) { [string]$_.DeviceID } else { [string]$_.Caption }
    rootPath = if ($_.DeviceID) { ([string]$_.DeviceID + '\\\\') } else { $null }
    label = if ($_.VolumeName) { [string]$_.VolumeName } else { [string]$_.DeviceID }
    driveLetter = if ($_.DeviceID) { [string]$_.DeviceID } else { $null }
    fileSystem = if ($_.FileSystem) { [string]$_.FileSystem } else { $null }
    volumeType = if ($_.DriveType -eq 3) { 'fixed' } elseif ($_.DriveType -eq 2) { 'removable' } else { 'unknown' }
    totalBytes = if ($_.Size -ne $null) { [int64]$_.Size } else { $null }
    freeBytes = if ($_.FreeSpace -ne $null) { [int64]$_.FreeSpace } else { $null }
    indexedSearchCapable = $true
    ntfsJournalCapable = if ($_.FileSystem -and [string]$_.FileSystem -match '^NTFS$') { $true } else { $false }
  }
} | ConvertTo-Json -Depth 6
`;

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && Number.isFinite(Number(value))
      ? Number(value)
      : null;

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toVolumeType = (value: string | null | undefined): VolumeAwarenessType => {
  switch ((value ?? "").toLowerCase()) {
    case "fixed":
      return "fixed";
    case "removable":
      return "removable";
    case "network":
      return "network";
    default:
      return "unknown";
  }
};

const buildDriveLetter = (value: string): string | null => {
  const match = normalizePathForMatch(value).match(/^[A-Za-z]:/);
  return match ? match[0].toUpperCase() : null;
};

const normalizeVolume = (entry: PowerShellVolumeEntry, capturedAt: string, observedAt: Date): VolumeAwarenessSnapshot | null => {
  const rootPath = toStringOrNull(entry.rootPath);
  if (!rootPath) {
    return null;
  }

  const normalizedRoot = normalizePathForMatch(rootPath);
  const driveLetter = toStringOrNull(entry.driveLetter) ?? buildDriveLetter(normalizedRoot);
  const fileSystem = toStringOrNull(entry.fileSystem);
  const totalBytes = toNumberOrNull(entry.totalBytes);
  const freeBytes = toNumberOrNull(entry.freeBytes);
  const volumeType = toVolumeType(toStringOrNull(entry.volumeType));

  return {
    id: toStringOrNull(entry.id) ?? driveLetter ?? normalizedRoot,
    rootPath: normalizedRoot,
    label: toStringOrNull(entry.label) ?? driveLetter ?? normalizedRoot,
    driveLetter,
    fileSystem,
    volumeType,
    totalBytes,
    freeBytes,
    indexedSearchCapable: entry.indexedSearchCapable !== false,
    ntfsJournalCapable: entry.ntfsJournalCapable === true || (fileSystem?.toUpperCase() === "NTFS"),
    watcherHealth: "idle",
    freshness: createObservationFreshness(capturedAt, capturedAt, 60 * 60 * 1000, observedAt)
  };
};

const buildVolumeFromRoot = (rootPath: string, source: FileRootSource, observedAt: Date): VolumeAwarenessSnapshot => {
  const normalizedRoot = normalizePathForMatch(rootPath);
  const driveLetter = buildDriveLetter(normalizedRoot);
  const capturedAt = observedAt.toISOString();

  return {
    id: driveLetter ?? normalizedRoot,
    rootPath: normalizedRoot,
    label: path.basename(normalizedRoot) || driveLetter || normalizedRoot,
    driveLetter,
    fileSystem: null,
    volumeType: source === "workspace" ? "fixed" : "unknown",
    totalBytes: null,
    freeBytes: null,
    indexedSearchCapable: false,
    ntfsJournalCapable: false,
    watcherHealth: "idle",
    freshness: createObservationFreshness(capturedAt, capturedAt, 60 * 60 * 1000, observedAt)
  };
};

export const enumerateLocalVolumes = async (
  observedAt = new Date()
): Promise<VolumeAwarenessSnapshot[]> => {
  const capturedAt = observedAt.toISOString();
  const result = await runPowerShellJson<PowerShellVolumeEntry[] | PowerShellVolumeEntry>(volumeScript, {
    timeoutMs: VOLUME_TIMEOUT_MS
  });
  const entries = Array.isArray(result) ? result : result ? [result] : [];
  const volumes = entries
    .map((entry) => normalizeVolume(entry, capturedAt, observedAt))
    .filter((entry): entry is VolumeAwarenessSnapshot => Boolean(entry))
    .filter((entry) => entry.volumeType !== "network");

  return volumes.sort((left, right) => left.rootPath.localeCompare(right.rootPath));
};

export const buildVolumeAwarenessState = async (input: {
  roots?: string[];
  workspaceRoot?: string;
  additionalRoots?: string[];
  previousCursors?: FileJournalCursor[];
  previousMonitor?: VolumeMonitorState | null;
  observedAt?: Date;
}): Promise<{
  rootCandidates: Array<{ path: string; label: string; source: FileRootSource }>;
  volumes: VolumeAwarenessSnapshot[];
  journalCursors: FileJournalCursor[];
  monitor: VolumeMonitorState;
}> => {
  const observedAt = input.observedAt ?? new Date();
  const explicitRoots = input.roots?.map((root) => normalizePathForMatch(root)).filter(Boolean) ?? [];
  const volumes =
    explicitRoots.length > 0
      ? explicitRoots.map((rootPath) => buildVolumeFromRoot(rootPath, "user", observedAt))
      : await enumerateLocalVolumes(observedAt);
  const rootCandidates: Array<{ path: string; label: string; source: FileRootSource }> = [];
  const seenRoots = new Set<string>();

  const pushRootCandidate = (rootPath: string, label: string, source: FileRootSource): void => {
    const normalizedRoot = normalizePathForMatch(rootPath);
    const key = normalizedRoot.toLowerCase();
    if (seenRoots.has(key) || !existsSync(normalizedRoot)) {
      return;
    }
    seenRoots.add(key);
    rootCandidates.push({
      path: normalizedRoot,
      label,
      source
    });
  };

  if (explicitRoots.length > 0) {
    for (const rootPath of explicitRoots) {
      pushRootCandidate(rootPath, path.basename(rootPath) || rootPath, "user");
    }
  } else {
    const home = os.homedir();
    const safeDefaultRoots = [
      { path: path.join(home, "Desktop"), label: "Desktop", source: "default" as const },
      { path: path.join(home, "Documents"), label: "Documents", source: "default" as const },
      { path: path.join(home, "Downloads"), label: "Downloads", source: "default" as const },
      { path: path.join(home, "Pictures"), label: "Pictures", source: "default" as const },
      { path: path.join(home, "Videos"), label: "Videos", source: "default" as const }
    ];

    for (const candidate of safeDefaultRoots) {
      pushRootCandidate(candidate.path, candidate.label, candidate.source);
    }

    if (input.workspaceRoot) {
      const normalizedWorkspace = normalizePathForMatch(input.workspaceRoot);
      pushRootCandidate(normalizedWorkspace, path.basename(normalizedWorkspace) || normalizedWorkspace, "workspace");
    }

    for (const volume of volumes) {
      if (volume.volumeType === "removable") {
        pushRootCandidate(volume.rootPath, volume.label, "volume");
      }
    }
  }

  for (const additionalRoot of input.additionalRoots ?? []) {
    const normalizedRoot = normalizePathForMatch(additionalRoot);
    pushRootCandidate(normalizedRoot, path.basename(normalizedRoot) || normalizedRoot, "user");
  }

  if (rootCandidates.length === 0 && input.workspaceRoot) {
    const normalizedWorkspace = normalizePathForMatch(input.workspaceRoot);
    pushRootCandidate(normalizedWorkspace, path.basename(normalizedWorkspace) || normalizedWorkspace, "workspace");
  }

  const { journalCursors, monitor } = await refreshVolumeJournalState({
    volumes,
    previousCursors: input.previousCursors,
    previousMonitor: input.previousMonitor,
    observedAt
  });

  return {
    rootCandidates,
    volumes,
    journalCursors,
    monitor
  };
};

export const browseFolderSummary = async (
  folderPath: string,
  observedAt = new Date()
): Promise<FolderListingSummary | null> => {
  const normalizedPath = normalizePathForMatch(folderPath);
  const folderStat = await safeStat(normalizedPath);
  if (!folderStat || !folderStat.isDirectory()) {
    return null;
  }

  const privacy = classifyPrivacyScope(normalizedPath, "user", normalizedPath);
  if (privacy.shouldExclude) {
    const capturedAt = observedAt.toISOString();
    return {
      path: normalizedPath,
      parentPath: path.dirname(normalizedPath) === normalizedPath ? null : normalizePathForMatch(path.dirname(normalizedPath)),
      exists: true,
      privacyScope: privacy.privacyScope,
      freshness: createObservationFreshness(capturedAt, folderStat.mtime.toISOString(), 60 * 60 * 1000, observedAt),
      folders: [],
      files: [],
      totals: {
        folders: 0,
        files: 0,
        totalSizeBytes: 0
      }
    };
  }

  const directoryEntries = await readdir(normalizedPath, { withFileTypes: true }).catch(() => []);
  const folders: FolderListingEntry[] = [];
  const files: FolderListingEntry[] = [];
  let totalSizeBytes = 0;

  for (const entry of directoryEntries.slice(0, MAX_FOLDER_LISTING_ENTRIES)) {
    const childPath = normalizePathForMatch(path.join(normalizedPath, entry.name));
    const childPrivacy = classifyPrivacyScope(childPath, "user", normalizedPath);
    if (childPrivacy.shouldExclude) {
      continue;
    }

    const childStat = await safeStat(childPath);
    if (!childStat) {
      continue;
    }

    const listingEntry: FolderListingEntry = {
      path: childPath,
      name: entry.name,
      kind: childStat.isDirectory() ? "folder" : "file",
      sizeBytes: childStat.isFile() ? childStat.size : null,
      modifiedAt: childStat.mtime.toISOString(),
      mediaKind: childStat.isFile() ? inferMediaKind(extensionFromPath(childPath)) : null,
      privacyScope: childPrivacy.privacyScope
    };

    if (listingEntry.kind === "folder") {
      folders.push(listingEntry);
    } else {
      files.push(listingEntry);
      totalSizeBytes += listingEntry.sizeBytes ?? 0;
    }
  }

  folders.sort((left, right) => left.name.localeCompare(right.name));
  files.sort((left, right) => {
    const sizeDelta = (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0);
    if (sizeDelta !== 0) {
      return sizeDelta;
    }
    return left.name.localeCompare(right.name);
  });

  const capturedAt = observedAt.toISOString();
  return {
    path: normalizedPath,
    parentPath: path.dirname(normalizedPath) === normalizedPath ? null : normalizePathForMatch(path.dirname(normalizedPath)),
    exists: true,
    privacyScope: privacy.privacyScope,
    freshness: createObservationFreshness(capturedAt, folderStat.mtime.toISOString(), 60 * 60 * 1000, observedAt),
    folders,
    files,
    totals: {
      folders: folders.length,
      files: files.length,
      totalSizeBytes
    }
  };
};
