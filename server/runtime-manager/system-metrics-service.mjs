import { summarizeGpuStats } from "./gpu-stats-service.mjs";
import { toNumber, clampPercent } from "../../shared/utils.mjs";

function pressureFromRatio(ratio) {
  if (ratio >= 0.92) return "critical";
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.62) return "warm";
  return "stable";
}

function mergePressure(...levels) {
  const rank = {
    stable: 0,
    warm: 1,
    high: 2,
    critical: 3,
  };
  const byRank = ["stable", "warm", "high", "critical"];
  const maxRank = Math.max(...levels.map((level) => rank[level] ?? 0));
  return byRank[maxRank] ?? "stable";
}

export function summarizeSystemMetrics(snapshot = {}, view = null, extra = {}) {
  const totalMemoryBytes = Math.max(0, toNumber(snapshot.totalMemoryBytes));
  const usedMemoryBytes = totalMemoryBytes > 0
    ? Math.max(0, totalMemoryBytes - Math.max(0, toNumber(snapshot.freeMemoryBytes)))
    : Math.max(0, toNumber(view?.usedMemoryBytes));
  const memoryRatio = totalMemoryBytes > 0 ? Math.max(0, Math.min(1, usedMemoryBytes / totalMemoryBytes)) : 0;
  const cpuPercent = clampPercent(view?.totalCpuPercent ?? snapshot.totalCpuPercentHint);
  const diskBytesPerSecond =
    snapshot.diskBytesPerSecond == null ? null : Math.max(0, toNumber(snapshot.diskBytesPerSecond));
  const gpu = summarizeGpuStats(snapshot);

  const memoryPressure = pressureFromRatio(memoryRatio);
  const cpuPressure = pressureFromRatio(cpuPercent / 100);
  const diskPressure =
    diskBytesPerSecond == null ? "stable" : diskBytesPerSecond >= 120 * 1024 * 1024 ? "high" : diskBytesPerSecond >= 32 * 1024 * 1024 ? "warm" : "stable";

  return {
    capturedAt: snapshot.capturedAt || new Date().toISOString(),
    cpuPercent,
    ramUsedBytes: usedMemoryBytes,
    ramTotalBytes: totalMemoryBytes,
    ramRatio: memoryRatio,
    ramPressure: memoryPressure,
    gpuPercent: gpu.gpuPercent,
    vramUsedBytes: gpu.usedVramBytes,
    vramTotalBytes: gpu.totalVramBytes,
    vramRatio: gpu.vramRatio,
    gpuPressure: gpu.pressure,
    diskBytesPerSecond,
    diskPressure,
    processCount: Array.isArray(snapshot.processes) ? snapshot.processes.length : 0,
    logicalCpuCount: Math.max(1, toNumber(snapshot.logicalCpuCount, 1)),
    overallPressure: mergePressure(memoryPressure, cpuPressure, gpu.pressure, diskPressure, extra.queuePressure || "stable"),
  };
}
