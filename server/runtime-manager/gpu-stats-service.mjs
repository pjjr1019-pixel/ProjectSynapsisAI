import { toNumber, clampPercent } from "../../shared/utils.mjs";

const MB = 1024 * 1024;

function pressureFromRatio(ratio) {
  if (ratio == null) return "stable";
  if (ratio >= 0.92) return "critical";
  if (ratio >= 0.78) return "high";
  if (ratio >= 0.58) return "warm";
  return "stable";
}

export function summarizeGpuStats(snapshot = {}) {
  const processes = Array.isArray(snapshot.processes) ? snapshot.processes : [];
  const summedDedicatedBytes = processes.reduce(
    (sum, row) => sum + Math.max(0, toNumber(row?.gpuDedicatedBytes)),
    0
  );
  const summedSharedBytes = processes.reduce(
    (sum, row) => sum + Math.max(0, toNumber(row?.gpuSharedBytes)),
    0
  );

  const totalVramBytes =
    snapshot.totalVramBytes == null ? null : Math.max(0, toNumber(snapshot.totalVramBytes));
  const usedVramBytes =
    snapshot.usedVramBytes == null
      ? summedDedicatedBytes
      : Math.max(0, toNumber(snapshot.usedVramBytes));
  const sharedVramBytes = Math.max(0, summedSharedBytes);
  const gpuPercent = clampPercent(snapshot.totalGpuPercentHint);
  const vramRatio =
    totalVramBytes && totalVramBytes > 0 ? Math.max(0, Math.min(1, usedVramBytes / totalVramBytes)) : null;

  return {
    gpuPercent,
    usedVramBytes,
    totalVramBytes,
    sharedVramBytes,
    vramRatio,
    pressure: pressureFromRatio(vramRatio),
    displayUsedVram: usedVramBytes / MB,
    displayTotalVram: totalVramBytes ? totalVramBytes / MB : null,
  };
}
