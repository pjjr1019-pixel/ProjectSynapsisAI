import * as path from "node:path";
import type { FileCatalogEntry, MediaCatalogEntry } from "../contracts/awareness";
import { runPowerShellJson, type RunPowerShellJsonOptions } from "../windows/powershell";
import {
  classifyPrivacyScope,
  createObservationFreshness,
  extensionFromPath,
  extensionToMimeType,
  inferMediaKind,
  inferTags,
  normalizePathForMatch
} from "./shared";

const WINDOWS_SEARCH_TIMEOUT_MS = 7_500;
const WINDOWS_SEARCH_MAX_RESULTS = 40;

interface RawWindowsSearchHit {
  itemPath?: string | null;
  fileName?: string | null;
  sizeBytes?: number | string | null;
  modifiedAt?: string | null;
  fileExtension?: string | null;
  kind?: string | null;
}

export interface WindowsSearchQueryOptions {
  limit?: number;
  volumeRoots?: string[];
  mode?: "files" | "media";
  now?: Date;
  executor?: <T>(script: string, options?: RunPowerShellJsonOptions) => Promise<T | null>;
}

export interface WindowsSearchQueryResult {
  source: "windows-search";
  files: FileCatalogEntry[];
  media: MediaCatalogEntry[];
}

const escapePowerShellSingleQuoted = (value: string): string => value.replace(/'/g, "''");

const tokenizeQuery = (query: string): string[] =>
  query
    .toLowerCase()
    .replace(/[^a-z0-9.\-_/\\]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .slice(0, 6);

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && Number.isFinite(Number(value))
      ? Number(value)
      : null;

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const buildWindowsSearchScript = (
  query: string,
  options: Required<Pick<WindowsSearchQueryOptions, "limit" | "mode">> & { volumeRoots: string[] }
): string => {
  const tokens = tokenizeQuery(query);
  const serializedTokens = tokens.map((token) => `'${escapePowerShellSingleQuoted(token)}'`).join(", ");
  const serializedScopes = options.volumeRoots
    .map((volumeRoot) => normalizePathForMatch(volumeRoot))
    .filter(Boolean)
    .map((volumeRoot) => `'${escapePowerShellSingleQuoted(volumeRoot)}'`)
    .join(", ");
  const mediaOnlyClause =
    options.mode === "media"
      ? "($kindText -match 'picture|video|music|audio|document' -or $extension -match '^\\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|heic|heif|mp4|mov|mkv|avi|wmv|webm|mp3|wav|flac|aac|m4a|ogg|pdf|doc|docx|ppt|pptx|xls|xlsx)$')"
      : "$true";

  return `
$tokens = @(${serializedTokens})
$scopes = @(${serializedScopes})
$limit = ${options.limit}
try {
  $connection = New-Object -ComObject ADODB.Connection
  $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
  $whereParts = New-Object System.Collections.Generic.List[string]

  if ($scopes.Count -gt 0) {
    $scopeClauses = New-Object System.Collections.Generic.List[string]
    foreach ($scope in $scopes) {
      $escapedScope = [string]$scope
      if (-not [string]::IsNullOrWhiteSpace($escapedScope)) {
        $scopeClauses.Add("(SCOPE='file:$($escapedScope.Replace(\"'\", \"''\"))')")
      }
    }
    if ($scopeClauses.Count -gt 0) {
      $whereParts.Add("(" + ($scopeClauses -join " OR ") + ")")
    }
  }

  if ($tokens.Count -gt 0) {
    $tokenClauses = New-Object System.Collections.Generic.List[string]
    foreach ($token in $tokens) {
      $escapedToken = [string]$token
      if (-not [string]::IsNullOrWhiteSpace($escapedToken)) {
        $escapedLike = $escapedToken.Replace("'", "''")
        $tokenClauses.Add("(System.FileName LIKE '%$escapedLike%' OR System.ItemPathDisplay LIKE '%$escapedLike%' OR System.ItemName LIKE '%$escapedLike%')")
      }
    }
    if ($tokenClauses.Count -gt 0) {
      $whereParts.Add("(" + ($tokenClauses -join " AND ") + ")")
    }
  }

  $sql = "SELECT TOP $limit System.ItemPathDisplay AS ItemPath, System.FileName AS FileName, System.Size AS SizeBytes, System.DateModified AS ModifiedAt, System.FileExtension AS FileExtension, System.Kind AS ItemKind FROM SYSTEMINDEX"
  if ($whereParts.Count -gt 0) {
    $sql += " WHERE " + ($whereParts -join " AND ")
  }
  $sql += " ORDER BY System.DateModified DESC"

  $recordset = $connection.Execute($sql)
  $rows = @()
  while (-not $recordset.EOF) {
    $itemPath = [string]$recordset.Fields.Item("ItemPath").Value
    $fileName = [string]$recordset.Fields.Item("FileName").Value
    $modifiedAt = if ($recordset.Fields.Item("ModifiedAt").Value) { [datetime]$recordset.Fields.Item("ModifiedAt").Value } else { $null }
    $extension = [string]$recordset.Fields.Item("FileExtension").Value
    $kindText = [string]$recordset.Fields.Item("ItemKind").Value
    if (-not (${mediaOnlyClause})) {
      $recordset.MoveNext()
      continue
    }
    $rows += [PSCustomObject]@{
      itemPath = if ($itemPath) { $itemPath } else { $null }
      fileName = if ($fileName) { $fileName } else { $null }
      sizeBytes = if ($recordset.Fields.Item("SizeBytes").Value -ne $null) { [int64]$recordset.Fields.Item("SizeBytes").Value } else { $null }
      modifiedAt = if ($modifiedAt) { $modifiedAt.ToString("o") } else { $null }
      fileExtension = if ($extension) { $extension } else { $null }
      kind = if ($kindText) { $kindText } else { $null }
    }
    $recordset.MoveNext()
  }
  $recordset.Close()
  $connection.Close()
  $rows | ConvertTo-Json -Depth 6
} catch {
  @() | ConvertTo-Json -Depth 4
}
`;
};

const mapHitToFileEntry = (hit: RawWindowsSearchHit, observedAt: Date): FileCatalogEntry | null => {
  const normalizedPath = toStringOrNull(hit.itemPath);
  if (!normalizedPath) {
    return null;
  }

  const fullPath = normalizePathForMatch(normalizedPath);
  const privacy = classifyPrivacyScope(fullPath, "volume", path.parse(fullPath).root || undefined);
  if (privacy.shouldExclude) {
    return null;
  }

  const modifiedAt = toStringOrNull(hit.modifiedAt);
  const capturedAt = observedAt.toISOString();
  const extension = toStringOrNull(hit.fileExtension) ?? extensionFromPath(fullPath);
  const mediaKind = inferMediaKind(extension);

  return {
    path: fullPath,
    parentPath: normalizePathForMatch(path.dirname(fullPath)),
    name: toStringOrNull(hit.fileName) ?? path.basename(fullPath),
    kind: "file",
    extension,
    sizeBytes: toNumberOrNull(hit.sizeBytes),
    createdAt: null,
    modifiedAt,
    accessedAt: null,
    owner: null,
    mimeType: extension ? extensionToMimeType[extension.toLowerCase()] ?? null : null,
    contentHint: toStringOrNull(hit.kind),
    hash: null,
    mediaKind,
    privacyScope: privacy.privacyScope,
    freshness: createObservationFreshness(capturedAt, modifiedAt ?? capturedAt, 30 * 60 * 1000, observedAt),
    isSensitive: privacy.isSensitive,
    isProtected: privacy.isProtected
  };
};

const mapHitToMediaEntry = (entry: FileCatalogEntry, observedAt: Date): MediaCatalogEntry | null => {
  if (!entry.mediaKind) {
    return null;
  }

  const capturedAt = observedAt.toISOString();
  return {
    path: entry.path,
    parentPath: entry.parentPath,
    name: entry.name,
    mediaKind: entry.mediaKind,
    extension: entry.extension,
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
    tags: inferTags(entry.path, entry.mediaKind),
    privacyScope: entry.privacyScope,
    freshness: createObservationFreshness(capturedAt, entry.modifiedAt ?? capturedAt, 30 * 60 * 1000, observedAt)
  };
};

export const queryWindowsIndexedEntries = async (
  query: string,
  options: WindowsSearchQueryOptions = {}
): Promise<WindowsSearchQueryResult | null> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return null;
  }

  const observedAt = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 20, WINDOWS_SEARCH_MAX_RESULTS));
  const volumeRoots = (options.volumeRoots ?? [])
    .map((volumeRoot) => normalizePathForMatch(volumeRoot))
    .filter(Boolean);
  if (volumeRoots.length === 0) {
    return null;
  }

  const execute = options.executor ?? runPowerShellJson;
  const rawResult = await execute<RawWindowsSearchHit[] | RawWindowsSearchHit>(
    buildWindowsSearchScript(trimmedQuery, {
      limit,
      mode: options.mode ?? "files",
      volumeRoots
    }),
    {
      timeoutMs: WINDOWS_SEARCH_TIMEOUT_MS
    }
  );

  const hits = Array.isArray(rawResult) ? rawResult : rawResult ? [rawResult] : [];
  if (hits.length === 0) {
    return null;
  }

  const files = hits
    .map((hit) => mapHitToFileEntry(hit, observedAt))
    .filter((entry): entry is FileCatalogEntry => Boolean(entry))
    .slice(0, limit);

  if (files.length === 0) {
    return null;
  }

  const media = files
    .map((entry) => mapHitToMediaEntry(entry, observedAt))
    .filter((entry): entry is MediaCatalogEntry => Boolean(entry))
    .slice(0, limit);

  return {
    source: "windows-search",
    files,
    media
  };
};
