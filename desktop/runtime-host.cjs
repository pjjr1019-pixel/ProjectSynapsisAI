const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const process = require("node:process");
const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const OS_SNAPSHOT_POST_TIMEOUT_MS = 8000;
const OS_SNAPSHOT_WARNING_COOLDOWN_MS = 15000;

function createLazyModuleLoader(filePath) {
  let modulePromise = null;
  return async function loadModule() {
    if (!modulePromise) {
      modulePromise = import(pathToFileURL(filePath).href);
    }
    return modulePromise;
  };
}

function derivePathsFromRepoRoot(repoRoot) {
  const taskmanagerRoot = resolve(repoRoot || resolve(__dirname, ".."));
  return {
    taskmanagerRoot,
    shared: {
      taskManagerCoreFile: resolve(taskmanagerRoot, "shared", "task-manager-core.mjs"),
    },
    server: {
      runtimeManager: {
        processMonitorServiceFile: resolve(
          taskmanagerRoot,
          "server",
          "runtime-manager",
          "process-monitor-service.mjs"
        ),
        systemMetricsServiceFile: resolve(
          taskmanagerRoot,
          "server",
          "runtime-manager",
          "system-metrics-service.mjs"
        ),
        optimizationAdvisorFile: resolve(
          taskmanagerRoot,
          "server",
          "runtime-manager",
          "optimization-advisor.mjs"
        ),
        safeProcessControllerFile: resolve(
          taskmanagerRoot,
          "server",
          "runtime-manager",
          "safe-process-controller.mjs"
        ),
      },
    },
  };
}

function createTaskManagerRuntimeHost({
  paths,
  repoRoot,
  apiUrl,
  shell,
  getProtectedPids = () => [],
  shouldForwardSnapshot = () => false,
  logger = console,
}) {
  const isWindows = process.platform === "win32";
  const resolvedPaths = paths || derivePathsFromRepoRoot(repoRoot);
  const runtimeManagerPaths = resolvedPaths.server?.runtimeManager || {};
  const loadTaskManagerCore = createLazyModuleLoader(resolvedPaths.shared.taskManagerCoreFile);
  const loadProcessMonitorService = createLazyModuleLoader(
    runtimeManagerPaths.processMonitorServiceFile
  );
  const loadSystemMetricsService = createLazyModuleLoader(
    runtimeManagerPaths.systemMetricsServiceFile
  );
  const loadOptimizationAdvisor = createLazyModuleLoader(
    runtimeManagerPaths.optimizationAdvisorFile
  );
  const loadSafeProcessController = createLazyModuleLoader(
    runtimeManagerPaths.safeProcessControllerFile
  );

  const runtimeManagerState = {
    previousSnapshot: null,
    historyByFingerprint: {},
    idleStateByFingerprint: {},
    lastOptimizeAt: null,
  };
  let lastForwardSnapshotWarning = { message: "", at: 0 };

  function collectOutput(child) {
    return new Promise((resolveOutput, rejectOutput) => {
      const stdout = [];
      const stderr = [];

      child.stdout?.on("data", (chunk) => stdout.push(chunk));
      child.stderr?.on("data", (chunk) => stderr.push(chunk));

      child.once("error", rejectOutput);
      child.once("exit", (code) => {
        const stdoutText = Buffer.concat(stdout).toString("utf8").trim();
        const stderrText = Buffer.concat(stderr).toString("utf8").trim();
        if (code === 0) {
          resolveOutput({ stdout: stdoutText, stderr: stderrText });
          return;
        }
        rejectOutput(new Error(stderrText || stdoutText || `Process exited with code ${code}`));
      });
    });
  }

  function runPowerShell(script) {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        cwd: resolvedPaths.taskmanagerRoot,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    return collectOutput(child);
  }

  async function postJson(url, payload) {
    return new Promise((resolvePost, rejectPost) => {
      const body = Buffer.from(JSON.stringify(payload));
      const request = http.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(body.length),
          },
          timeout: OS_SNAPSHOT_POST_TIMEOUT_MS,
        },
        (response) => {
          response.resume();
          response.on("end", () => resolvePost());
        }
      );

      request.on("error", rejectPost);
      request.on("timeout", () => request.destroy(new Error("Timed out posting runtime snapshot.")));
      request.end(body);
    });
  }

  async function forwardOsSnapshotToApi(snapshot) {
    if (!snapshot || !shouldForwardSnapshot()) return;
    try {
      await postJson(`${apiUrl}/api/optimizer/os-snapshot`, snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const now = Date.now();
      const shouldWarn =
        !message.includes("ECONNREFUSED") &&
        (message !== lastForwardSnapshotWarning.message || now - lastForwardSnapshotWarning.at >= OS_SNAPSHOT_WARNING_COOLDOWN_MS);

      if (shouldWarn) {
        lastForwardSnapshotWarning = { message, at: now };
        logger.warn?.(`[taskmanager] Failed to forward OS snapshot: ${message}`);
      }
    }
  }

  function collectDescendantPids(relationships, rootPids) {
    const childrenByParent = new Map();
    for (const relationship of Array.isArray(relationships) ? relationships : []) {
      const pid = Number(relationship?.pid);
      const parentPid = Number(relationship?.parentPid);
      if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(parentPid) || parentPid <= 0) continue;
      const current = childrenByParent.get(parentPid) || [];
      current.push(pid);
      childrenByParent.set(parentPid, current);
    }

    const seen = new Set((Array.isArray(rootPids) ? rootPids : []).map(Number).filter((value) => Number.isFinite(value) && value > 0));
    const stack = [...seen];

    while (stack.length) {
      const parentPid = stack.pop();
      const children = childrenByParent.get(parentPid) || [];
      for (const childPid of children) {
        if (seen.has(childPid)) continue;
        seen.add(childPid);
        stack.push(childPid);
      }
    }

    return [...seen];
  }

  // ── Snapshot cache ────────────────────────────────────────────────────────
  // Cache the last good snapshot and serve it instantly on repeat calls.
  // A fresh PowerShell scan starts in the background; callers get stale-while-
  // revalidate behaviour so the UI never blocks waiting for WMI.
  const SNAPSHOT_CACHE_TTL_MS = 4_000; // serve cached result for up to 4s
  let _cachedSnapshot = null;
  let _cacheTimestamp = 0;
  let _scanInFlight = null;

  async function _runRawSnapshot() {
    // Actual PowerShell scan — may take 2-4s.
    return _readTaskManagerSnapshotRaw();
  }

  function _triggerBackgroundScan() {
    if (_scanInFlight) return _scanInFlight;
    _scanInFlight = _runRawSnapshot()
      .then((snap) => { _cachedSnapshot = snap; _cacheTimestamp = Date.now(); })
      .catch(() => { /* keep last cached result */ })
      .finally(() => { _scanInFlight = null; });
    return _scanInFlight;
  }

  async function readTaskManagerSnapshot() {
    const age = Date.now() - _cacheTimestamp;
    if (_cachedSnapshot && age < SNAPSHOT_CACHE_TTL_MS) {
      // Return cached result immediately, kick off a background refresh.
      void _triggerBackgroundScan();
      return _cachedSnapshot;
    }
    // No cache or expired — wait for one scan to complete.
    if (_scanInFlight) return _scanInFlight.then(() => _cachedSnapshot);
    await _triggerBackgroundScan();
    return _cachedSnapshot;
  }

  async function _readTaskManagerSnapshotRaw() {
    const snapshot = {
      capturedAt: new Date().toISOString(),
      logicalCpuCount: Math.max(1, os.cpus()?.length || 1),
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem(),
      totalVramBytes: null,
      usedVramBytes: null,
      diskBytesPerSecond: null,
      totalCpuPercentHint: 0,
      totalGpuPercentHint: 0,
      platform: process.platform,
      appProcessPids: [...new Set((Array.isArray(getProtectedPids()) ? getProtectedPids() : []).map(Number).filter((value) => Number.isFinite(value) && value > 0))],
      processes: [],
    };

    if (!isWindows) {
      return snapshot;
    }

    const script = `
$ErrorActionPreference = 'Stop'
$logicalCpuCount = [math]::Max(1, [int][Environment]::ProcessorCount)

function Get-ProcessInstanceKey([string]$path) {
  return ([regex]::Match([string]$path, 'process\\((.+?)\\)', 'IgnoreCase').Groups[1].Value).ToLowerInvariant()
}

$cpuByPid = @{}
$totalCpuPercentHint = 0
$cpuCounters = Get-Counter '\\Process(*)\\ID Process','\\Process(*)\\% Processor Time','\\Processor(_Total)\\% Processor Time' -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
$instancePidMap = @{}

foreach ($sample in @($cpuCounters.CounterSamples)) {
  if ($sample.Status -ne 0) { continue }
  if ($sample.Path -notlike '*id process') { continue }
  $instanceKey = Get-ProcessInstanceKey([string]$sample.Path)
  if (-not $instanceKey) { continue }
  $taskId = [int][math]::Round([double]$sample.CookedValue)
  if ($taskId -le 0) { continue }
  $instancePidMap[$instanceKey] = $taskId
}

foreach ($sample in @($cpuCounters.CounterSamples)) {
  if ($sample.Status -ne 0) { continue }
  if ([regex]::IsMatch([string]$sample.Path, '\\\\processor\\(_total\\)\\\\% processor time$', 'IgnoreCase')) {
    $totalCpuPercentHint = [math]::Max(0, [math]::Min(100, [double]$sample.CookedValue))
    continue
  }
  if ($sample.Path -notlike '*% processor time') { continue }
  $instanceKey = Get-ProcessInstanceKey([string]$sample.Path)
  if (-not $instanceKey -or -not $instancePidMap.ContainsKey($instanceKey)) { continue }
  $taskId = [int]$instancePidMap[$instanceKey]
  if ($taskId -le 0) { continue }
  $normalizedCpu = [math]::Max(0, [math]::Min(100, ([double]$sample.CookedValue / $logicalCpuCount)))
  if ($cpuByPid.ContainsKey($taskId)) {
    $cpuByPid[$taskId] = [double]$cpuByPid[$taskId] + $normalizedCpu
  }
  else {
    $cpuByPid[$taskId] = $normalizedCpu
  }
}

$gpuByPid = @{}
$totalGpuPercentHint = 0
try {
  $gpuSamples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue -WarningAction SilentlyContinue).CounterSamples
  foreach ($sample in @($gpuSamples)) {
    if ($sample.Status -ne 0) { continue }
    $gpuPercent = [math]::Max(0, [math]::Min(100, [double]$sample.CookedValue))
    if ($gpuPercent -gt $totalGpuPercentHint) {
      $totalGpuPercentHint = $gpuPercent
    }
    if (-not ([string]$sample.InstanceName -match 'pid_(\\d+)')) { continue }
    $taskId = [int]$matches[1]
    if ($taskId -le 0) { continue }
    $currentGpu = if ($gpuByPid.ContainsKey($taskId)) { [double]$gpuByPid[$taskId] } else { 0 }
    if ($gpuPercent -gt $currentGpu) {
      $gpuByPid[$taskId] = $gpuPercent
    }
  }
} catch {}

$gpuDedicatedByPid = @{}
$gpuSharedByPid = @{}
try {
  $gpuMemorySamples = (Get-Counter '\\GPU Process Memory(*)\\Dedicated Usage','\\GPU Process Memory(*)\\Shared Usage' -ErrorAction SilentlyContinue -WarningAction SilentlyContinue).CounterSamples
  foreach ($sample in @($gpuMemorySamples)) {
    if ($sample.Status -ne 0) { continue }
    if (-not ([string]$sample.InstanceName -match 'pid_(\\d+)')) { continue }
    $taskId = [int]$matches[1]
    if ($taskId -le 0) { continue }
    $counterValue = [int64][math]::Round([double]$sample.CookedValue)
    if ($sample.Path -like '*dedicated usage') {
      $currentDedicated = if ($gpuDedicatedByPid.ContainsKey($taskId)) { [int64]$gpuDedicatedByPid[$taskId] } else { [int64]0 }
      $gpuDedicatedByPid[$taskId] = $currentDedicated + $counterValue
    }
    elseif ($sample.Path -like '*shared usage') {
      $currentShared = if ($gpuSharedByPid.ContainsKey($taskId)) { [int64]$gpuSharedByPid[$taskId] } else { [int64]0 }
      $gpuSharedByPid[$taskId] = $currentShared + $counterValue
    }
  }
} catch {}

$diskBytesPerSecond = $null
try {
  $diskSample = (Get-Counter '\\PhysicalDisk(_Total)\\Disk Bytes/sec' -ErrorAction SilentlyContinue -WarningAction SilentlyContinue).CounterSamples | Select-Object -First 1
  if ($diskSample -and $diskSample.Status -eq 0) {
    $diskBytesPerSecond = [int64][math]::Round([double]$diskSample.CookedValue)
  }
} catch {}

$usedVramBytes = $null
$totalVramBytes = $null
try {
  $nvidia = Get-Command 'nvidia-smi.exe' -ErrorAction SilentlyContinue
  if ($nvidia) {
    $gpuRows = & $nvidia.Source --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>$null
    foreach ($line in @($gpuRows)) {
      if (-not $line) { continue }
      $parts = ([string]$line).Split(',') | ForEach-Object { $_.Trim() }
      if ($parts.Count -lt 2) { continue }
      $usedMb = [double]::Parse($parts[0], [System.Globalization.CultureInfo]::InvariantCulture)
      $totalMb = [double]::Parse($parts[1], [System.Globalization.CultureInfo]::InvariantCulture)
      $existingUsedBytes = if ($usedVramBytes) { [int64]$usedVramBytes } else { [int64]0 }
      $existingTotalBytes = if ($totalVramBytes) { [int64]$totalVramBytes } else { [int64]0 }
      $usedVramBytes = ([int64]($usedMb * 1MB)) + $existingUsedBytes
      $totalVramBytes = ([int64]($totalMb * 1MB)) + $existingTotalBytes
      if ($parts.Count -ge 3) {
        $gpuUtil = [double]::Parse($parts[2], [System.Globalization.CultureInfo]::InvariantCulture)
        if ($gpuUtil -gt $totalGpuPercentHint) {
          $totalGpuPercentHint = [math]::Max(0, [math]::Min(100, $gpuUtil))
        }
      }
    }
  }
} catch {}

$rows = @(
  Get-Process |
    Sort-Object -Property ProcessName |
    ForEach-Object {
      $pathValue = try { $_.Path } catch { $null }
      $windowTitle = try { $_.MainWindowTitle } catch { $null }
      $responding = try { [bool]$_.Responding } catch { $null }
      $startTime = try { $_.StartTime.ToString('o') } catch { $null }
      [pscustomobject]@{
        processName = $_.ProcessName
        pid = [int]$_.Id
        cpuSeconds = if ($null -ne $_.CPU) { [double]$_.CPU } else { 0 }
        cpuPercentHint = if ($cpuByPid.ContainsKey([int]$_.Id)) { [math]::Round([double]$cpuByPid[[int]$_.Id], 1) } else { 0 }
        gpuPercent = if ($gpuByPid.ContainsKey([int]$_.Id)) { [math]::Round([double]$gpuByPid[[int]$_.Id], 1) } else { 0 }
        gpuDedicatedBytes = if ($gpuDedicatedByPid.ContainsKey([int]$_.Id)) { [int64]$gpuDedicatedByPid[[int]$_.Id] } else { [int64]0 }
        gpuSharedBytes = if ($gpuSharedByPid.ContainsKey([int]$_.Id)) { [int64]$gpuSharedByPid[[int]$_.Id] } else { [int64]0 }
        workingSetBytes = [int64]$_.WorkingSet64
        privateBytes = [int64]$_.PrivateMemorySize64
        sessionId = if ($null -ne $_.SessionId) { [int]$_.SessionId } else { $null }
        parentPid = $null
        path = $pathValue
        mainWindowTitle = $windowTitle
        responding = $responding
        startTime = $startTime
      }
    }
)
$relationships = @(
  Get-CimInstance Win32_Process |
    ForEach-Object {
      [pscustomobject]@{
        pid = [int]$_.ProcessId
        parentPid = [int]$_.ParentProcessId
      }
    }
)
[pscustomobject]@{
  totalCpuPercentHint = [math]::Round($totalCpuPercentHint, 1)
  totalGpuPercentHint = [math]::Round($totalGpuPercentHint, 1)
  usedVramBytes = $usedVramBytes
  totalVramBytes = $totalVramBytes
  diskBytesPerSecond = $diskBytesPerSecond
  processes = $rows
  relationships = $relationships
} | ConvertTo-Json -Depth 5 -Compress
`.trim();

    const { stdout } = await runPowerShell(script);
    const parsed = stdout ? JSON.parse(stdout) : {};
    const processRows = Array.isArray(parsed?.processes) ? parsed.processes : parsed?.processes ? [parsed.processes] : [];
    const relationships = Array.isArray(parsed?.relationships) ? parsed.relationships : parsed?.relationships ? [parsed.relationships] : [];
    const descendantPids = collectDescendantPids(parsed?.relationships, snapshot.appProcessPids);
    const parentPidByPid = new Map(
      relationships
        .map((relationship) => [Number(relationship?.pid), Number(relationship?.parentPid)])
        .filter(([pid, parentPid]) => Number.isFinite(pid) && pid > 0 && Number.isFinite(parentPid) && parentPid > 0)
    );

    snapshot.totalCpuPercentHint = Number.isFinite(Number(parsed?.totalCpuPercentHint))
      ? Math.max(0, Math.min(100, Number(parsed.totalCpuPercentHint)))
      : 0;
    snapshot.totalGpuPercentHint = Number.isFinite(Number(parsed?.totalGpuPercentHint))
      ? Math.max(0, Math.min(100, Number(parsed.totalGpuPercentHint)))
      : 0;
    snapshot.totalVramBytes = parsed?.totalVramBytes == null ? null : Math.max(0, Number(parsed.totalVramBytes) || 0);
    snapshot.usedVramBytes = parsed?.usedVramBytes == null ? null : Math.max(0, Number(parsed.usedVramBytes) || 0);
    snapshot.diskBytesPerSecond =
      parsed?.diskBytesPerSecond == null ? null : Math.max(0, Number(parsed.diskBytesPerSecond) || 0);
    snapshot.processes = processRows.map((row) => ({
      ...row,
      parentPid: parentPidByPid.get(Number(row?.pid)) ?? null,
    }));
    snapshot.appProcessPids = descendantPids.filter((pid) => processRows.some((row) => Number(row?.pid) === pid));
    void forwardOsSnapshotToApi(snapshot);
    return snapshot;
  }

  async function stopTaskManagerGroup(input) {
    if (!isWindows) {
      return {
        ok: false,
        stoppedPids: [],
        skippedPids: [],
        errors: [{ pid: -1, error: "Task Manager actions are only available on Windows desktop." }],
      };
    }

    const pids = [...new Set((Array.isArray(input?.pids) ? input.pids : []).map(Number).filter((value) => Number.isFinite(value) && value > 0))];
    if (!pids.length) {
      throw new Error("No process IDs were provided for this task group.");
    }

    const snapshot = await readTaskManagerSnapshot();
    const { getProtectionReasons } = await loadTaskManagerCore();
    const rowsByPid = new Map(snapshot.processes.map((row) => [Number(row.pid), row]));
    const protectedPids = [...new Set((Array.isArray(getProtectedPids()) ? getProtectedPids() : []).map(Number).filter((value) => Number.isFinite(value) && value > 0))];
    const blocked = pids
      .map((pid) => {
        const row = rowsByPid.get(pid);
        if (!row) return null;
        const reasons = getProtectionReasons(row, { protectedPids });
        if (!reasons.length) return null;
        return { pid, processName: row.processName || "Unknown task", reasons };
      })
      .filter(Boolean);

    if (blocked.length) {
      const first = blocked[0];
      throw new Error(`Refusing to stop protected process ${first.processName} (${first.pid}): ${first.reasons.join(", ")}`);
    }

    const pidList = pids.join(", ");
    const script = `
$ErrorActionPreference = 'Stop'
$stopped = @()
$skipped = @()
$errors = @()
foreach ($taskId in @(${pidList})) {
  try {
    $proc = Get-Process -Id $taskId -ErrorAction Stop
    if ($proc.MainWindowHandle -ne 0) {
      try { [void]$proc.CloseMainWindow() } catch {}
      Start-Sleep -Milliseconds 750
      try { $proc.Refresh() } catch {}
      if (-not $proc.HasExited) {
        Stop-Process -Id $taskId -Confirm:$false -ErrorAction Stop
      }
    }
    else {
      Stop-Process -Id $taskId -Confirm:$false -ErrorAction Stop
    }
    $stopped += [int]$taskId
  }
  catch {
    $skipped += [int]$taskId
    $errors += [pscustomobject]@{
      pid = [int]$taskId
      error = $_.Exception.Message
    }
  }
}
[pscustomobject]@{
  ok = ($errors.Count -eq 0)
  stoppedPids = $stopped
  skippedPids = $skipped
  errors = $errors
} | ConvertTo-Json -Depth 5 -Compress
`.trim();

    const { stdout } = await runPowerShell(script);
    const parsed = stdout ? JSON.parse(stdout) : {};

    return {
      ok: parsed?.ok !== false,
      stoppedPids: Array.isArray(parsed?.stoppedPids) ? parsed.stoppedPids.map(Number) : [],
      skippedPids: Array.isArray(parsed?.skippedPids) ? parsed.skippedPids.map(Number) : [],
      errors: Array.isArray(parsed?.errors)
        ? parsed.errors.map((entry) => ({
            pid: Number(entry?.pid) || 0,
            error: String(entry?.error || "Unknown process stop error."),
          }))
        : [],
    };
  }

  async function revealTaskManagerPath(input) {
    const targetPath = String(input?.path || "").trim();
    if (!targetPath) {
      return { ok: false, error: "No path provided." };
    }
    if (!fs.existsSync(targetPath)) {
      return { ok: false, error: "That executable path is no longer on disk." };
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      const openError = await shell.openPath(targetPath);
      return openError ? { ok: false, error: openError } : { ok: true };
    }

    shell.showItemInFolder(targetPath);
    return { ok: true };
  }

  // ── Overview cache ────────────────────────────────────────────────────────
  // Cache full overview results for the startup-compatible preference sets so
  // the renderer can share the same in-flight work as the desktop prescan.
  const OVERVIEW_CACHE_TTL_MS = 4_000;
  const _overviewCache = new Map();

  async function _buildOverviewRaw(prefs) {
    const snapshot = await readTaskManagerSnapshot();
    const [{ buildProcessMonitorOverview }, { summarizeSystemMetrics }, { buildOptimizationAdvisor }] = await Promise.all([
      loadProcessMonitorService(),
      loadSystemMetricsService(),
      loadOptimizationAdvisor(),
    ]);

    const processOverview = buildProcessMonitorOverview(snapshot, runtimeManagerState.previousSnapshot, prefs, {
      historyByFingerprint: runtimeManagerState.historyByFingerprint,
      idleStateByFingerprint: runtimeManagerState.idleStateByFingerprint,
    });

    runtimeManagerState.previousSnapshot = processOverview.nextState.previousSnapshot;
    runtimeManagerState.historyByFingerprint = processOverview.nextState.historyByFingerprint;
    runtimeManagerState.idleStateByFingerprint = processOverview.nextState.idleStateByFingerprint;

    const visibleRows = prefs.showProtected
      ? processOverview.rows
      : processOverview.rows.filter((row) => !row.protected);
    const metrics = summarizeSystemMetrics(snapshot, processOverview.view, {});
    const advisor = buildOptimizationAdvisor({
      rows: visibleRows,
      metrics,
      queueDepth: 0,
      mode: "balanced",
    });

    return {
      capturedAt: snapshot.capturedAt,
      metrics,
      rows: visibleRows,
      recommendations: advisor.recommendations,
      pressure: advisor.pressure,
      footer: {
        visibleGroups: visibleRows.length,
        recommendations: advisor.recommendations.length,
        protectedHidden: Math.max(0, processOverview.rows.length - visibleRows.length),
        lastOptimizeAt: runtimeManagerState.lastOptimizeAt,
      },
    };
  }

  function _getOverviewCacheKey(prefs) {
    if (prefs.monitoringEnabled !== true) return null;
    if (prefs.ignoredFingerprints.length > 0) return null;
    if (prefs.keepFingerprints.length > 0) return null;
    if (Object.keys(prefs.snoozedUntil).length > 0) return null;
    return `showProtected:${prefs.showProtected ? "1" : "0"}`;
  }

  async function buildRuntimeManagerComputerOverview(input = {}) {
    // Use shared normalizePrefs from shared/utils.mjs
    const { normalizePrefs } = await import(pathToFileURL(resolve(paths.taskmanagerRoot, "shared", "utils.mjs")).href);
    const prefs = normalizePrefs(input);

    const cacheKey = _getOverviewCacheKey(prefs);
    const cachedEntry = cacheKey ? _overviewCache.get(cacheKey) || null : null;
    const age = cachedEntry ? Date.now() - cachedEntry.timestamp : Number.POSITIVE_INFINITY;

    if (cacheKey && cachedEntry?.result && age < OVERVIEW_CACHE_TTL_MS) {
      // Return cached result immediately, then refresh in the background.
      if (!cachedEntry.inFlight) {
        cachedEntry.inFlight = _buildOverviewRaw(prefs)
          .then((result) => {
            cachedEntry.result = result;
            cachedEntry.timestamp = Date.now();
          })
          .catch(() => {})
          .finally(() => {
            cachedEntry.inFlight = null;
          });
      }
      return cachedEntry.result;
    }

    if (cacheKey && cachedEntry?.inFlight) {
      await cachedEntry.inFlight;
      return cachedEntry.result;
    }

    if (cacheKey) {
      const nextEntry = {
        result: cachedEntry?.result || null,
        timestamp: cachedEntry?.timestamp || 0,
        inFlight: null,
      };
      nextEntry.inFlight = _buildOverviewRaw(prefs)
        .then((result) => {
          nextEntry.result = result;
          nextEntry.timestamp = Date.now();
          return result;
        })
        .finally(() => {
          nextEntry.inFlight = null;
        });
      _overviewCache.set(cacheKey, nextEntry);
      return nextEntry.inFlight;
    }

    return _buildOverviewRaw(prefs);
  }

  function encodePowerShellIntArray(values) {
    return (Array.isArray(values) ? values : [])
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0)
      .join(",");
  }

  async function runRuntimeManagerAction(row, action) {
    const pids = Array.isArray(row?.pids) ? row.pids.map(Number).filter((value) => Number.isFinite(value) && value > 0) : [];
    if (!pids.length) {
      return { ok: false, action, error: "No process IDs available for this task." };
    }

    if (action === "end") {
      const result = await stopTaskManagerGroup({ groupId: row.groupId, pids });
      return {
        ok: result.ok,
        action,
        stoppedPids: result.stoppedPids,
        skippedPids: result.skippedPids,
        error: result.errors?.[0]?.error || null,
      };
    }

    if (!isWindows) {
      return { ok: false, action, error: "Runtime optimization actions are only available on Windows desktop." };
    }

    const encodedIds = encodePowerShellIntArray(pids);
    if (!encodedIds) {
      return { ok: false, action, error: "No valid process IDs available." };
    }

    const script =
      action === "suspend"
        ? `$ids = @(${encodedIds}); Suspend-Process -Id $ids -ErrorAction Stop | Out-Null`
        : action === "resume"
          ? `$ids = @(${encodedIds}); Resume-Process -Id $ids -ErrorAction Stop | Out-Null`
          : action === "lower-priority"
            ? `$ids = @(${encodedIds}); Get-Process -Id $ids -ErrorAction Stop | ForEach-Object { $_.PriorityClass = 'BelowNormal' }`
            : null;

    if (!script) {
      return { ok: false, action, error: `Unsupported runtime action: ${action}` };
    }

    try {
      await runPowerShell(script);
      return { ok: true, action, pids };
    } catch (error) {
      return {
        ok: false,
        action,
        pids,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function optimizeRuntimeManager(input = {}) {
    const overview = await buildRuntimeManagerComputerOverview(input);
    const rowsByGroupId = new Map(overview.rows.map((row) => [row.groupId, row]));
    const [{ buildSafeActionPlan }] = await Promise.all([loadSafeProcessController()]);
    const plan = buildSafeActionPlan(rowsByGroupId, overview.recommendations, {
      mode: input.mode || "balanced",
    });

    const actionsApplied = [];
    for (const step of plan) {
      const row = rowsByGroupId.get(step.groupId);
      if (!row) continue;
      const result = await runRuntimeManagerAction(row, step.action);
      actionsApplied.push({
        groupId: step.groupId,
        action: step.action,
        ok: result.ok,
        error: result.error || null,
        name: row.name,
      });
    }

    runtimeManagerState.lastOptimizeAt = new Date().toISOString();

    return {
      ok: actionsApplied.every((entry) => entry.ok),
      actionsApplied,
      overview: await buildRuntimeManagerComputerOverview(input),
    };
  }

  async function applyRuntimeManagerRecommendation(input = {}) {
    const overview = await buildRuntimeManagerComputerOverview(input);
    const row = overview.rows.find((entry) => entry.groupId === input.groupId);
    if (!row) {
      return { ok: false, error: "That runtime recommendation is no longer available.", overview };
    }
    const result = await runRuntimeManagerAction(row, input.action);
    if (result.ok) {
      runtimeManagerState.lastOptimizeAt = new Date().toISOString();
    }
    return {
      ok: result.ok,
      error: result.error || null,
      action: input.action,
      overview: await buildRuntimeManagerComputerOverview(input),
    };
  }

  function registerIpc(ipcMain) {
    ipcMain.handle("task-manager:get-snapshot", async () => readTaskManagerSnapshot());
    ipcMain.handle("task-manager:stop-group", async (_event, input) => stopTaskManagerGroup(input));
    ipcMain.handle("task-manager:reveal-path", async (_event, input) => revealTaskManagerPath(input));
    ipcMain.handle("runtime-manager:get-computer-overview", async (_event, input) =>
      buildRuntimeManagerComputerOverview(input)
    );
    ipcMain.handle("runtime-manager:scan", async (_event, input) => buildRuntimeManagerComputerOverview(input));
    ipcMain.handle("runtime-manager:optimize", async (_event, input) => optimizeRuntimeManager(input));
    ipcMain.handle("runtime-manager:apply-action", async (_event, input) =>
      applyRuntimeManagerRecommendation(input)
    );
  }

  return {
    readTaskManagerSnapshot,
    stopTaskManagerGroup,
    revealTaskManagerPath,
    buildRuntimeManagerComputerOverview,
    optimizeRuntimeManager,
    applyRuntimeManagerRecommendation,
    registerIpc,
    getRuntimeState() {
      return { ...runtimeManagerState };
    },
  };
}

module.exports = {
  createTaskManagerRuntimeHost,
};
