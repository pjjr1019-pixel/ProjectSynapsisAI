import type {
  FileJournalCursor,
  VolumeAwarenessSnapshot,
  VolumeMonitorState
} from "../contracts/awareness";
import { runPowerShellJson } from "../windows/powershell";

const USN_TIMEOUT_MS = 8_000;
const USN_READ_MAX_RECORDS = 128;

interface UsnQueryResponse {
  ok?: boolean | null;
  journalId?: string | null;
  firstUsn?: string | null;
  nextUsn?: string | null;
  lowestValidUsn?: string | null;
  maxUsn?: string | null;
  error?: string | null;
}

interface UsnReadResponse {
  ok?: boolean | null;
  nextCursor?: string | null;
  lastTimestamp?: string | null;
  recordCount?: number | null;
  error?: string | null;
}

interface RefreshVolumeJournalStateOptions {
  volumes: VolumeAwarenessSnapshot[];
  previousCursors?: FileJournalCursor[];
  previousMonitor?: VolumeMonitorState | null;
  observedAt?: Date;
}

type PowerShellJsonRunner = typeof runPowerShellJson;

const escapeSingleQuoted = (value: string): string => value.replace(/'/g, "''");

const buildQueryJournalScript = (rootPath: string): string => `
$volume = '${escapeSingleQuoted(rootPath)}'
try {
  $lines = & fsutil usn queryjournal $volume 2>&1
  if ($LASTEXITCODE -ne 0) {
    [PSCustomObject]@{
      ok = $false
      journalId = $null
      firstUsn = $null
      nextUsn = $null
      lowestValidUsn = $null
      maxUsn = $null
      error = (($lines | Out-String).Trim())
    } | ConvertTo-Json -Depth 4
    exit 0
  }

  $map = @{}
  foreach ($line in $lines) {
    if ($line -match '^\\s*([^:]+?)\\s*:\\s*(.+?)\\s*$') {
      $map[$matches[1].Trim()] = $matches[2].Trim()
    }
  }

  [PSCustomObject]@{
    ok = $true
    journalId = $map['Usn Journal ID']
    firstUsn = $map['First Usn']
    nextUsn = $map['Next Usn']
    lowestValidUsn = $map['Lowest Valid Usn']
    maxUsn = $map['Max Usn']
    error = $null
  } | ConvertTo-Json -Depth 4
} catch {
  [PSCustomObject]@{
    ok = $false
    journalId = $null
    firstUsn = $null
    nextUsn = $null
    lowestValidUsn = $null
    maxUsn = $null
    error = [string]$_.Exception.Message
  } | ConvertTo-Json -Depth 4
}
`;

const buildReadJournalScript = (rootPath: string, startUsn: string): string => `
$volume = '${escapeSingleQuoted(rootPath)}'
$startUsn = '${escapeSingleQuoted(startUsn)}'
try {
  $lines = & fsutil usn readjournal $volume "startUsn=$startUsn" csv 2>&1
  if ($LASTEXITCODE -ne 0) {
    [PSCustomObject]@{
      ok = $false
      nextCursor = $null
      lastTimestamp = $null
      recordCount = 0
      error = (($lines | Out-String).Trim())
    } | ConvertTo-Json -Depth 4
    exit 0
  }

  $csvLines = @($lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($csvLines.Count -eq 0) {
    [PSCustomObject]@{
      ok = $true
      nextCursor = $startUsn
      lastTimestamp = $null
      recordCount = 0
      error = $null
    } | ConvertTo-Json -Depth 4
    exit 0
  }

  try {
    $records = @($csvLines | ConvertFrom-Csv)
  } catch {
    [PSCustomObject]@{
      ok = $false
      nextCursor = $null
      lastTimestamp = $null
      recordCount = 0
      error = 'Unable to parse fsutil usn readjournal csv output'
    } | ConvertTo-Json -Depth 4
    exit 0
  }

  $limited = @($records | Select-Object -Last ${USN_READ_MAX_RECORDS})
  $last = if ($limited.Count -gt 0) { $limited[-1] } else { $null }
  $lastUsn =
    if ($last -and $last.PSObject.Properties['Usn']) { [string]$last.Usn } elseif ($last -and $last.PSObject.Properties['USN']) { [string]$last.USN } else { $null }
  $lastTimestamp =
    if ($last -and $last.PSObject.Properties['Timestamp']) { [string]$last.Timestamp } elseif ($last -and $last.PSObject.Properties['TimeStamp']) { [string]$last.TimeStamp } else { $null }

  [PSCustomObject]@{
    ok = $true
    nextCursor = if ($lastUsn) { $lastUsn } else { $startUsn }
    lastTimestamp = if ($lastTimestamp) { $lastTimestamp } else { $null }
    recordCount = $limited.Count
    error = $null
  } | ConvertTo-Json -Depth 4
} catch {
  [PSCustomObject]@{
    ok = $false
    nextCursor = $null
    lastTimestamp = $null
    recordCount = 0
    error = [string]$_.Exception.Message
  } | ConvertTo-Json -Depth 4
}
`;

const findPreviousCursor = (
  volume: VolumeAwarenessSnapshot,
  previousCursors: FileJournalCursor[]
): FileJournalCursor | null =>
  previousCursors.find((cursor) => cursor.volumeId === volume.id || cursor.rootPath === volume.rootPath) ?? null;

const findPreviousMonitorVolume = (
  volume: VolumeAwarenessSnapshot,
  previousMonitor: VolumeMonitorState | null | undefined
): VolumeMonitorState["volumes"][number] | null =>
  previousMonitor?.volumes.find((entry) => entry.volumeId === volume.id || entry.rootPath === volume.rootPath) ?? null;

const isAccessDeniedError = (value: string | null | undefined): boolean =>
  typeof value === "string" && /access is denied/i.test(value);

export const refreshVolumeJournalState = async (
  options: RefreshVolumeJournalStateOptions,
  executor: PowerShellJsonRunner = runPowerShellJson
): Promise<{
  journalCursors: FileJournalCursor[];
  monitor: VolumeMonitorState;
}> => {
  const observedAt = options.observedAt ?? new Date();
  const observedIso = observedAt.toISOString();
  const journalCursors: FileJournalCursor[] = [];
  const monitorVolumes: VolumeMonitorState["volumes"] = [];

  for (const volume of options.volumes) {
    const previousCursor = findPreviousCursor(volume, options.previousCursors ?? []);
    const previousMonitorVolume = findPreviousMonitorVolume(volume, options.previousMonitor);
    const fallbackCursorSource = volume.ntfsJournalCapable ? "snapshot-diff" : "snapshot-diff";
    const fallbackHealth = volume.ntfsJournalCapable ? "degraded" : volume.watcherHealth;

    if (!volume.ntfsJournalCapable) {
      journalCursors.push({
        volumeId: volume.id,
        rootPath: volume.rootPath,
        source: "snapshot-diff",
        cursor: previousCursor?.cursor ?? null,
        lastProcessedAt: observedIso,
        healthy: true
      });
      monitorVolumes.push({
        volumeId: volume.id,
        rootPath: volume.rootPath,
        watcherHealth: volume.watcherHealth,
        journalCapable: false,
        cursorSource: "snapshot-diff",
        lastCursorAt: observedIso,
        lastSeenChangeAt: previousMonitorVolume?.lastSeenChangeAt ?? null,
        lastError: null
      });
      continue;
    }

    const journalInfo = await executor<UsnQueryResponse>(buildQueryJournalScript(volume.rootPath), {
      timeoutMs: USN_TIMEOUT_MS
    });

    if (!journalInfo?.ok || !journalInfo.nextUsn) {
      journalCursors.push({
        volumeId: volume.id,
        rootPath: volume.rootPath,
        source: fallbackCursorSource,
        cursor: previousCursor?.cursor ?? null,
        lastProcessedAt: observedIso,
        healthy: false
      });
      monitorVolumes.push({
        volumeId: volume.id,
        rootPath: volume.rootPath,
        watcherHealth: fallbackHealth,
        journalCapable: true,
        cursorSource: fallbackCursorSource,
        lastCursorAt: observedIso,
        lastSeenChangeAt: previousMonitorVolume?.lastSeenChangeAt ?? null,
        lastError: journalInfo?.error ?? "USN journal query failed"
      });
      continue;
    }

    const startCursor = previousCursor?.cursor ?? journalInfo.nextUsn;
    const needsDeltaRead = Boolean(previousCursor?.cursor) && previousCursor?.cursor !== journalInfo.nextUsn;
    const readResult = needsDeltaRead
      ? await executor<UsnReadResponse>(buildReadJournalScript(volume.rootPath, startCursor), {
          timeoutMs: USN_TIMEOUT_MS
        })
      : null;

    const journalReadable = !needsDeltaRead || Boolean(readResult?.ok);
    const nextCursor =
      readResult?.nextCursor ??
      journalInfo.nextUsn ??
      previousCursor?.cursor ??
      null;
    const lastSeenChangeAt =
      (readResult?.recordCount ?? 0) > 0
        ? readResult?.lastTimestamp ?? observedIso
        : previousMonitorVolume?.lastSeenChangeAt ?? null;
    const lastError =
      readResult && !readResult.ok
        ? readResult.error ?? "USN journal read failed"
        : null;

    journalCursors.push({
      volumeId: volume.id,
      rootPath: volume.rootPath,
      source: journalReadable ? "usn-journal" : fallbackCursorSource,
      cursor: nextCursor,
      lastProcessedAt: observedIso,
      healthy: journalReadable
    });
    monitorVolumes.push({
      volumeId: volume.id,
      rootPath: volume.rootPath,
      watcherHealth: journalReadable ? "healthy" : isAccessDeniedError(lastError) ? "degraded" : fallbackHealth,
      journalCapable: true,
      cursorSource: journalReadable ? "usn-journal" : fallbackCursorSource,
      lastCursorAt: observedIso,
      lastSeenChangeAt,
      lastError
    });
  }

  return {
    journalCursors,
    monitor: {
      backgroundMonitoring: options.volumes.length > 0,
      lastRefreshAt: observedIso,
      volumes: monitorVolumes
    }
  };
};
