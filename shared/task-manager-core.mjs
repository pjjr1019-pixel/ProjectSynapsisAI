import { normalizePrefs } from "./utils.mjs";
const MB = 1024 * 1024;

export const TASK_MANAGER_POLL_VISIBLE_MS = 5_000;
export const TASK_MANAGER_POLL_BACKGROUND_MS = 15_000;
export const TASK_MANAGER_SNOOZE_MS = 60 * 60 * 1000;

export const PROTECTED_PROCESS_NAMES = Object.freeze([
  "system",
  "registry",
  "smss",
  "csrss",
  "wininit",
  "services",
  "lsass",
  "svchost",
  "dwm",
  "explorer",
  "winlogon",
  "fontdrvhost",
  "sihost",
  "ctfmon",
  "taskhostw",
  "startmenuexperiencehost",
  "shellexperiencehost",
  "searchhost",
  "searchindexer",
  "memory compression",
  "secure system",
  "system interrupts",
]);

export const SECURITY_PROCESS_NAMES = Object.freeze([
  "msmpeng",
  "nisserv",
  "securityhealthservice",
  "securityhealthsystray",
]);

export const TOOLING_PROCESS_NAMES = Object.freeze([
  "electron",
  "node",
  "npm",
  "cmd",
  "conhost",
  "powershell",
  "pwsh",
  "taskmgr",
]);

export const HELPER_KEYWORDS = Object.freeze([
  "update",
  "updater",
  "launcher",
  "tray",
  "agent",
  "helper",
  "notifier",
  "service",
  "scheduler",
  "bridge",
  "host",
]);

const protectedProcessNameSet = new Set(PROTECTED_PROCESS_NAMES.map((value) => value.toLowerCase()));
const securityProcessNameSet = new Set(SECURITY_PROCESS_NAMES.map((value) => value.toLowerCase()));
const toolingProcessNameSet = new Set(TOOLING_PROCESS_NAMES.map((value) => value.toLowerCase()));

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = Math.round(toNumber(value, fallback));
  return Number.isFinite(n) ? n : fallback;
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePath(value) {
  return toText(value).replace(/\\/g, "/").toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function basename(pathValue) {
  const normalized = toText(pathValue).replace(/\\/g, "/");
  if (!normalized) return "";
  return normalized.split("/").pop() || "";
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

function buildGroupFingerprint(row) {
  const pathKey = normalizePath(row.path);
  const processKey = toText(row.processName).toLowerCase() || "unknown";
  const sessionId = Number.isFinite(Number(row.sessionId)) ? toInteger(row.sessionId) : -1;
  return `${pathKey || processKey}::${sessionId}`;
}

function displayNameFromRow(row) {
  const fileName = basename(row.path).replace(/\.exe$/i, "");
  if (fileName && !toolingProcessNameSet.has(fileName.toLowerCase())) {
    return fileName;
  }
  return toText(row.processName) || "Unknown task";
}

function matchesHelperKeyword(value) {
  const normalized = toText(value).toLowerCase();
  return HELPER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

// normalizePrefs is now imported from utils.mjs

function normalizeSnapshot(snapshot = {}) {
  const processes = Array.isArray(snapshot.processes) ? snapshot.processes : [];
  const appProcessPids = Array.isArray(snapshot.appProcessPids) ? snapshot.appProcessPids : [];
  return {
    capturedAt: toText(snapshot.capturedAt) || new Date().toISOString(),
    logicalCpuCount: Math.max(1, toInteger(snapshot.logicalCpuCount, 1)),
    totalMemoryBytes: Math.max(0, toNumber(snapshot.totalMemoryBytes)),
    freeMemoryBytes: Math.max(0, toNumber(snapshot.freeMemoryBytes)),
    totalVramBytes:
      snapshot.totalVramBytes == null ? null : Math.max(0, toNumber(snapshot.totalVramBytes)),
    usedVramBytes:
      snapshot.usedVramBytes == null ? null : Math.max(0, toNumber(snapshot.usedVramBytes)),
    diskBytesPerSecond:
      snapshot.diskBytesPerSecond == null ? null : Math.max(0, toNumber(snapshot.diskBytesPerSecond)),
    totalCpuPercentHint: clampPercent(snapshot.totalCpuPercentHint),
    totalGpuPercentHint: clampPercent(snapshot.totalGpuPercentHint),
    platform: toText(snapshot.platform) || "",
    appProcessPids: unique(
      appProcessPids
        .map((value) => toInteger(value, -1))
        .filter((value) => value > 0)
    ),
    processes: processes
      .map((row) => ({
        processName: toText(row?.processName),
        pid: Math.max(0, toInteger(row?.pid)),
        parentPid: row?.parentPid == null ? null : Math.max(0, toInteger(row.parentPid)),
        cpuSeconds: Math.max(0, toNumber(row?.cpuSeconds)),
        cpuPercentHint: clampPercent(row?.cpuPercentHint),
        gpuPercent: clampPercent(row?.gpuPercent),
        gpuDedicatedBytes: Math.max(0, toNumber(row?.gpuDedicatedBytes)),
        gpuSharedBytes: Math.max(0, toNumber(row?.gpuSharedBytes)),
        workingSetBytes: Math.max(0, toNumber(row?.workingSetBytes)),
        privateBytes: Math.max(0, toNumber(row?.privateBytes)),
        sessionId: row?.sessionId == null ? null : toInteger(row.sessionId),
        path: toText(row?.path) || null,
        mainWindowTitle: toText(row?.mainWindowTitle) || null,
        responding: typeof row?.responding === "boolean" ? row.responding : null,
        startTime: toText(row?.startTime) || null,
      }))
      .filter((row) => row.pid > 0 && row.processName),
  };
}

function scoreCpuPercent(currentRow, previousRow, elapsedMs, logicalCpuCount) {
  const hintedCpuPercent = clampPercent(currentRow?.cpuPercentHint);
  if (hintedCpuPercent > 0) return hintedCpuPercent;
  if (!previousRow || elapsedMs <= 0) return 0;
  const deltaCpuSeconds = toNumber(currentRow.cpuSeconds) - toNumber(previousRow.cpuSeconds);
  if (!Number.isFinite(deltaCpuSeconds) || deltaCpuSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (deltaCpuSeconds * 1000 * 100) / (elapsedMs * logicalCpuCount)));
}

export function getProtectionReasons(row, opts = {}) {
  const reasons = [];
  const pid = toInteger(row?.pid, -1);
  const name = toText(row?.processName).toLowerCase();
  const sessionId = row?.sessionId == null ? null : toInteger(row.sessionId, -1);
  const pathValue = normalizePath(row?.path);
  const protectedPidValues = Array.isArray(opts.protectedPids)
    ? opts.protectedPids
    : opts.protectedPids instanceof Set
      ? [...opts.protectedPids]
      : [];
  const protectedPids = new Set(protectedPidValues.map((value) => toInteger(value, -1)));

  if (protectedPids.has(pid)) reasons.push("Horizons runtime");
  if (protectedProcessNameSet.has(name)) reasons.push("Windows core process");
  if (securityProcessNameSet.has(name)) reasons.push("Security software");
  if (toolingProcessNameSet.has(name)) reasons.push("Developer/runtime process");
  if (sessionId === 0) reasons.push("System session");
  if (pathValue.startsWith("c:/windows/system32/")) reasons.push("Windows system binary");
  if (pathValue.startsWith("c:/windows/servicing/")) reasons.push("Windows servicing binary");
  if (pathValue.includes("/windows defender/")) reasons.push("Windows Defender component");
  if (pathValue.includes("/windowsapps/microsoftwindows.")) reasons.push("Windows shell app");

  return unique(reasons);
}

function buildRecommendation(group, history) {
  if (group.isProtected || group.suppressionState !== "active") return null;

  const isVisible = group.hasVisibleWindow;
  const cpuThreshold = isVisible ? 35 : 20;
  const memoryThresholdMb = isVisible ? 1500 : 600;
  const comboThresholdMb = isVisible ? 0 : 500;
  const comboCpuThreshold = isVisible ? 0 : 12;
  const cpuHighCount = isVisible ? history.visibleCpuHighCount : history.backgroundCpuHighCount;
  const memoryHighCount = isVisible ? history.visibleMemoryHighCount : history.backgroundMemoryHighCount;
  const comboHighCount = history.backgroundComboHighCount;
  const actionable =
    cpuHighCount >= 3 || memoryHighCount >= 2 || (!isVisible && comboHighCount >= 2);

  if (!actionable) return null;

  const severity =
    group.totalCpuPercent >= 40 || group.totalPrivateBytes >= 1_800 * MB || group.isHelperLike
      ? "high"
      : "medium";
  const actionLabel = isVisible ? "Close if unused" : "Stop background task";
  const title = isVisible
    ? `${group.displayName} is using a lot of system resources`
    : `${group.displayName} looks like a cleanup candidate`;
  const reasons = [];

  if (cpuHighCount >= 3) {
    reasons.push(`CPU stayed above ${cpuThreshold}% for multiple samples`);
  }
  if (memoryHighCount >= 2) {
    reasons.push(`memory stayed above ${memoryThresholdMb} MB`);
  }
  if (!isVisible && comboHighCount >= 2) {
    reasons.push(`CPU stayed above ${comboCpuThreshold}% while memory stayed above ${comboThresholdMb} MB`);
  }
  if (group.isHelperLike) {
    reasons.push("looks like a background helper or launcher");
  }

  return {
    groupId: group.groupId,
    severity,
    title,
    reason: reasons.join(" | "),
    actionLabel,
    estimatedReliefCpuPercent: group.totalCpuPercent,
    estimatedReliefBytes: group.totalPrivateBytes,
    tone: isVisible ? "close_if_unused" : "background_cleanup",
  };
}

export function buildTaskManagerView(snapshot, previousSnapshot, prefs = {}, opts = {}) {
  const current = normalizeSnapshot(snapshot);
  const previous = previousSnapshot ? normalizeSnapshot(previousSnapshot) : null;
  const normalizedPrefs = normalizePrefs(prefs);
  const previousRowsByPid = new Map((previous?.processes || []).map((row) => [row.pid, row]));
  const previousHistory = opts.historyByFingerprint && typeof opts.historyByFingerprint === "object"
    ? opts.historyByFingerprint
    : {};
  const protectedPids = new Set((opts.protectedPids || []).map((value) => toInteger(value, -1)));
  const elapsedMs = previous
    ? Math.max(1_000, new Date(current.capturedAt).getTime() - new Date(previous.capturedAt).getTime())
    : 0;
  const groupMap = new Map();

  for (const row of current.processes) {
    const fingerprint = buildGroupFingerprint(row);
    const cpuPercent = scoreCpuPercent(row, previousRowsByPid.get(row.pid), elapsedMs, current.logicalCpuCount);
    const protectionReasons = getProtectionReasons(row, { protectedPids });
    const entry = groupMap.get(fingerprint) || {
      groupId: fingerprint,
      fingerprint,
      displayName: displayNameFromRow(row),
      processName: row.processName || "Unknown task",
      sessionId: row.sessionId,
      path: row.path,
      mainWindowTitle: row.mainWindowTitle,
      hasVisibleWindow: false,
      hasAnyWindow: false,
      isHelperLike: false,
      isProtected: false,
      protectionReasons: [],
      instanceCount: 0,
      pids: [],
      totalCpuPercent: 0,
      totalGpuPercent: 0,
      totalWorkingSetBytes: 0,
      totalPrivateBytes: 0,
      totalGpuDedicatedBytes: 0,
      totalGpuSharedBytes: 0,
      processRows: [],
    };

    entry.instanceCount += 1;
    entry.pids.push(row.pid);
    entry.totalCpuPercent += cpuPercent;
    entry.totalGpuPercent += clampPercent(row.gpuPercent);
    entry.totalWorkingSetBytes += row.workingSetBytes;
    entry.totalPrivateBytes += row.privateBytes;
    entry.totalGpuDedicatedBytes += row.gpuDedicatedBytes;
    entry.totalGpuSharedBytes += row.gpuSharedBytes;
    entry.hasAnyWindow = entry.hasAnyWindow || Boolean(row.mainWindowTitle);
    entry.hasVisibleWindow = entry.hasVisibleWindow || Boolean(row.mainWindowTitle);
    entry.isHelperLike =
      entry.isHelperLike ||
      matchesHelperKeyword(entry.displayName) ||
      matchesHelperKeyword(row.processName) ||
      matchesHelperKeyword(row.path) ||
      matchesHelperKeyword(row.mainWindowTitle);
    entry.isProtected = entry.isProtected || protectionReasons.length > 0;
    entry.protectionReasons = unique([...entry.protectionReasons, ...protectionReasons]);
    if (!entry.path && row.path) entry.path = row.path;
    if (!entry.mainWindowTitle && row.mainWindowTitle) entry.mainWindowTitle = row.mainWindowTitle;
    entry.processRows.push({
      ...row,
      cpuPercent: round1(cpuPercent),
      gpuPercent: round1(row.gpuPercent),
      protectionReasons,
      isProtected: protectionReasons.length > 0,
    });
    groupMap.set(fingerprint, entry);
  }

  const now = toNumber(opts.now, Date.now());
  const nextHistoryByFingerprint = {};
  const groups = [...groupMap.values()]
    .map((group) => {
      const history = previousHistory[group.fingerprint] || {};
      const visibleCpuHigh = group.hasVisibleWindow && group.totalCpuPercent >= 35;
      const visibleMemoryHigh = group.hasVisibleWindow && group.totalPrivateBytes >= 1_500 * MB;
      const backgroundCpuHigh = !group.hasVisibleWindow && group.totalCpuPercent >= 20;
      const backgroundMemoryHigh = !group.hasVisibleWindow && group.totalPrivateBytes >= 600 * MB;
      const backgroundComboHigh =
        !group.hasVisibleWindow &&
        group.totalCpuPercent >= 12 &&
        group.totalPrivateBytes >= 500 * MB;

      const suppressionState = normalizedPrefs.keepFingerprints.includes(group.fingerprint)
        ? "kept"
        : normalizedPrefs.ignoredFingerprints.includes(group.fingerprint)
          ? "ignored"
          : toNumber(normalizedPrefs.snoozedUntil[group.fingerprint]) > now
            ? "snoozed"
            : "active";

      const nextHistory = {
        visibleCpuHighCount: visibleCpuHigh ? toInteger(history.visibleCpuHighCount) + 1 : 0,
        visibleMemoryHighCount: visibleMemoryHigh ? toInteger(history.visibleMemoryHighCount) + 1 : 0,
        backgroundCpuHighCount: backgroundCpuHigh ? toInteger(history.backgroundCpuHighCount) + 1 : 0,
        backgroundMemoryHighCount: backgroundMemoryHigh ? toInteger(history.backgroundMemoryHighCount) + 1 : 0,
        backgroundComboHighCount: backgroundComboHigh ? toInteger(history.backgroundComboHighCount) + 1 : 0,
      };
      nextHistoryByFingerprint[group.fingerprint] = nextHistory;

      const normalizedGroup = {
        ...group,
        pids: group.pids.sort((left, right) => left - right),
        totalCpuPercent: round1(group.totalCpuPercent),
        totalGpuPercent: round1(group.totalGpuPercent),
        totalWorkingSetBytes: Math.max(0, Math.round(group.totalWorkingSetBytes)),
        totalPrivateBytes: Math.max(0, Math.round(group.totalPrivateBytes)),
        totalGpuDedicatedBytes: Math.max(0, Math.round(group.totalGpuDedicatedBytes)),
        totalGpuSharedBytes: Math.max(0, Math.round(group.totalGpuSharedBytes)),
        totalGpuMemoryBytes: Math.max(0, Math.round(group.totalGpuDedicatedBytes + group.totalGpuSharedBytes)),
        processRows: group.processRows.sort(
          (left, right) =>
            right.cpuPercent - left.cpuPercent ||
            right.gpuPercent - left.gpuPercent ||
            right.privateBytes - left.privateBytes ||
            left.pid - right.pid
        ),
        suppressionState,
        history: nextHistory,
      };

      normalizedGroup.isHeavy = normalizedGroup.hasVisibleWindow
        ? normalizedGroup.totalCpuPercent >= 18 || normalizedGroup.totalPrivateBytes >= 900 * MB
        : normalizedGroup.totalCpuPercent >= 10 || normalizedGroup.totalPrivateBytes >= 350 * MB;
      normalizedGroup.recommendation = buildRecommendation(normalizedGroup, nextHistory);

      return normalizedGroup;
    })
    .sort((left, right) => {
      if (left.recommendation && !right.recommendation) return -1;
      if (!left.recommendation && right.recommendation) return 1;
      return (
        right.totalCpuPercent - left.totalCpuPercent ||
        right.totalPrivateBytes - left.totalPrivateBytes ||
        left.displayName.localeCompare(right.displayName)
      );
    });

  const visibleGroups = groups.filter((group) => normalizedPrefs.showProtected || !group.isProtected);
  const recommendations = visibleGroups
    .filter((group) => group.recommendation)
    .map((group) => ({
      ...group.recommendation,
      group,
    }));
  const trackedCpuPercent = round1(groups.reduce((sum, group) => sum + group.totalCpuPercent, 0));
  const totalCpuPercent = round1(current.totalCpuPercentHint > 0 ? current.totalCpuPercentHint : trackedCpuPercent);
  const totalGpuPercent = round1(
    current.totalGpuPercentHint > 0
      ? current.totalGpuPercentHint
      : Math.min(100, groups.reduce((sum, group) => sum + group.totalGpuPercent, 0))
  );
  const totalPrivateBytes = groups.reduce((sum, group) => sum + group.totalPrivateBytes, 0);
  const totalWorkingSetBytes = groups.reduce((sum, group) => sum + group.totalWorkingSetBytes, 0);
  const totalGpuDedicatedBytes = groups.reduce((sum, group) => sum + group.totalGpuDedicatedBytes, 0);
  const totalGpuSharedBytes = groups.reduce((sum, group) => sum + group.totalGpuSharedBytes, 0);
  const totalGpuMemoryBytes = totalGpuDedicatedBytes + totalGpuSharedBytes;
  const totalMemoryBytes = Math.max(0, current.totalMemoryBytes);
  const usedMemoryBytes = totalMemoryBytes > 0
    ? Math.max(0, totalMemoryBytes - Math.max(0, current.freeMemoryBytes))
    : totalWorkingSetBytes;
  const memoryUsedRatio = totalMemoryBytes > 0 ? Math.min(1, usedMemoryBytes / totalMemoryBytes) : 0;
  const cpuPressure = totalCpuPercent >= 75 ? "high" : totalCpuPercent >= 35 ? "moderate" : "low";
  const gpuPressure = totalGpuPercent >= 70 ? "high" : totalGpuPercent >= 30 ? "moderate" : "low";
  const memoryPressure = memoryUsedRatio >= 0.78 ? "high" : memoryUsedRatio >= 0.5 ? "moderate" : "low";

  return {
    snapshot: current,
    groups,
    visibleGroups,
    recommendations,
    heavyGroupCount: visibleGroups.filter((group) => group.isHeavy && !group.isProtected).length,
    actionableGroupCount: recommendations.length,
    totalCpuPercent,
    totalGpuPercent,
    totalPrivateBytes,
    totalWorkingSetBytes,
    totalGpuDedicatedBytes,
    totalGpuSharedBytes,
    totalGpuMemoryBytes,
    usedMemoryBytes,
    memoryUsedRatio,
    cpuPressure,
    gpuPressure,
    memoryPressure,
    nextHistoryByFingerprint,
  };
}
