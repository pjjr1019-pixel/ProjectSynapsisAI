import { buildTaskManagerView } from "../../shared/task-manager-core.mjs";
import { toNumber, clampPercent, toText as asText } from "../../shared/utils.mjs";

const MB = 1024 * 1024;

const AI_KEYWORDS = [
  "horizons",
  "assistant",
  "embedding",
  "infer",
  "inference",
  "model",
  "ollama",
  "llama",
  "vllm",
  "cuda",
  "tensor",
  "torch",
  "browser fetch",
  "crawl",
  "scheduler",
  "python",
  "transformers",
];


function iconForGroup(group) {
  const source = `${group.displayName} ${group.processName} ${group.path || ""}`.toLowerCase();
  if (source.includes("embedding")) return "embedding";
  if (source.includes("browser") || source.includes("fetch")) return "browser";
  if (source.includes("memory") || source.includes("index")) return "memory";
  if (source.includes("python")) return "python";
  if (source.includes("node")) return "node";
  if (source.includes("gpu") || source.includes("cuda") || group.totalGpuPercent >= 8) return "gpu";
  if (source.includes("crawl") || source.includes("scheduler")) return "crawler";
  if (source.includes("horizons") || source.includes("assistant")) return "core";
  return "app";
}

function isAiProcess(group, snapshot) {
  const pidSet = new Set((Array.isArray(snapshot?.appProcessPids) ? snapshot.appProcessPids : []).map(Number));
  if (group.pids.some((pid) => pidSet.has(Number(pid)))) return true;
  const source = `${group.displayName} ${group.processName} ${group.path || ""} ${group.mainWindowTitle || ""}`.toLowerCase();
  return AI_KEYWORDS.some((keyword) => source.includes(keyword));
}

function secondaryLabelForGroup(group, aiWorker) {
  const source = `${group.displayName} ${group.processName} ${group.path || ""}`.toLowerCase();
  if (group.isProtected) return "Protected";
  if (source.includes("horizons") || source.includes("assistant")) return "App core";
  if (source.includes("browser") || source.includes("fetch")) return "Background helper";
  if (source.includes("memory") || source.includes("index")) return aiWorker ? "AI worker" : "Indexer";
  if (source.includes("crawl") || source.includes("scheduler")) return "Queue worker";
  if (source.includes("python")) return "Python model server";
  if (source.includes("node")) return "Node runtime";
  if (aiWorker) return "AI worker";
  return group.hasVisibleWindow ? "Foreground app" : "Background helper";
}

function summarizeIdleMinutes(group, previousState, now) {
  const currentBusy =
    group.totalCpuPercent >= 2 ||
    group.totalGpuPercent >= 5 ||
    group.hasVisibleWindow ||
    group.totalGpuMemoryBytes >= 256 * MB;
  const nextLastBusyAt = currentBusy
    ? now
    : Math.max(
        toNumber(previousState?.lastBusyAt),
        group.processRows.reduce((latest, row) => {
          const startedAt = row.startTime ? new Date(row.startTime).getTime() : 0;
          return Math.max(latest, startedAt);
        }, 0)
      );
  const idleMinutes = nextLastBusyAt > 0 ? Math.max(0, Math.floor((now - nextLastBusyAt) / 60_000)) : 0;
  return { idleMinutes, nextLastBusyAt };
}

function buildBadges(group, aiWorker, idleMinutes) {
  const badges = [];
  if (group.isProtected) badges.push("Protected");
  if (aiWorker) badges.push("AI Worker");
  if (group.totalPrivateBytes >= 700 * MB) badges.push("High RAM");
  if (group.totalGpuPercent >= 10 || group.totalGpuMemoryBytes >= 512 * MB) badges.push("GPU Heavy");
  if (idleMinutes >= 3 && !group.hasVisibleWindow) badges.push(`Idle ${idleMinutes}m`);
  if (group.recommendation) badges.push("Recommendation");
  if (!group.hasVisibleWindow && !group.isProtected) badges.push("Suspended-safe");
  if (!badges.length) badges.push(group.hasVisibleWindow ? "Active" : "Background");
  return badges;
}

export function buildProcessMonitorOverview(snapshot, previousSnapshot, prefs = {}, state = {}) {
  const now = Date.now();
  const view = buildTaskManagerView(snapshot, previousSnapshot, prefs, {
    protectedPids: snapshot?.appProcessPids || [],
    historyByFingerprint: state.historyByFingerprint || {},
    now,
  });
  const nextIdleStateByFingerprint = {};

  const rows = view.groups.map((group) => {
    const aiWorker = isAiProcess(group, view.snapshot);
    const idleState = summarizeIdleMinutes(group, state.idleStateByFingerprint?.[group.fingerprint], now);
    nextIdleStateByFingerprint[group.fingerprint] = { lastBusyAt: idleState.nextLastBusyAt };
    const secondaryLabel = secondaryLabelForGroup(group, aiWorker);
    const badges = buildBadges(group, aiWorker, idleState.idleMinutes);
    const recommendationCandidate = Boolean(group.recommendation) || (!group.isProtected && idleState.idleMinutes >= 3 && !group.hasVisibleWindow);
    const safeActions = [];

    if (!group.isProtected) {
      safeActions.push("end");
      if (!group.hasVisibleWindow) safeActions.push("suspend");
      if (group.totalCpuPercent >= 8) safeActions.push("lower-priority");
      if (group.path) safeActions.push("reveal");
    }

    return {
      id: group.groupId,
      groupId: group.groupId,
      fingerprint: group.fingerprint,
      icon: iconForGroup(group),
      name: group.displayName,
      secondaryLabel,
      cpuPercent: clampPercent(group.totalCpuPercent),
      ramBytes: Math.max(0, toNumber(group.totalWorkingSetBytes)),
      ramPercent:
        view.snapshot.totalMemoryBytes > 0
          ? clampPercent((group.totalWorkingSetBytes / view.snapshot.totalMemoryBytes) * 100)
          : 0,
      gpuPercent: clampPercent(group.totalGpuPercent),
      gpuMemoryBytes: Math.max(0, toNumber(group.totalGpuMemoryBytes)),
      idleMinutes: idleState.idleMinutes,
      status: badges[0] || "Active",
      badges,
      aiWorker,
      protected: group.isProtected,
      hasVisibleWindow: group.hasVisibleWindow,
      recommendationCandidate,
      recommendation: group.recommendation,
      safeActions,
      pids: [...group.pids],
      path: group.path || null,
      mainWindowTitle: group.mainWindowTitle || null,
      processCount: group.instanceCount,
      processRows: group.processRows,
    };
  });

  return {
    snapshot: view.snapshot,
    view,
    rows,
    hiddenProtectedCount: view.groups.filter((group) => group.isProtected).length - view.visibleGroups.filter((group) => group.isProtected).length,
    nextState: {
      previousSnapshot: view.snapshot,
      historyByFingerprint: view.nextHistoryByFingerprint,
      idleStateByFingerprint: nextIdleStateByFingerprint,
    },
  };
}
