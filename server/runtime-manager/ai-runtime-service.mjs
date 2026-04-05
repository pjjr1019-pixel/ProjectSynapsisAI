import { getAiTaskManagerPayload } from "../task-manager-ai.mjs";
import { formatBytes } from "../../shared/utils.mjs";

const MB = 1024 * 1024;

function toLabel(bytes) {
  if (!bytes) return "0 MB";
  return formatBytes(bytes);
}

function toneFromStatus(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("error") || text.includes("offline") || text.includes("kill")) return "error";
  if (text.includes("limit") || text.includes("wait")) return "warning";
  if (text.includes("run") || text.includes("active") || text.includes("ready")) return "active";
  return "neutral";
}

function subtitleForRow(row) {
  if (row.id === "chat-pipeline") return "App core";
  if (row.id === "provider-model") return "Foreground model";
  if (row.id === "crawler-fleet") return "Background helper";
  if (row.id === "brain-browser") return "Context surface";
  if (row.id === "retrieval-dense-pilot") return "AI worker";
  if (row.id === "ingestion-build-jobs") return "Background helper";
  if (row.id === "optimizer") return "System optimizer";
  return row.type;
}

function recommendationFromPayload(payload) {
  const current = Array.isArray(payload.recommendations) ? payload.recommendations : [];
  if (current.length) {
    return current.slice(0, 4).map((entry) => ({
      id: `optimizer-${entry.id}`,
      label: entry.action.replace(/-/g, " "),
      description: entry.reason,
      estimatedSavingsLabel: entry.tierLabel || "Review",
      confidence: Math.max(0, Math.min(100, Math.round(entry.confidence || 0))),
      action: "optimizer-accept",
      recommendationId: entry.id,
    }));
  }

  return [];
}

export function getAiRuntimeSidebarModel() {
  const payload = getAiTaskManagerPayload();
  const rows = payload.rows.map((row) => ({
    id: row.id,
    name: row.name,
    secondaryLabel: subtitleForRow(row),
    status: row.status,
    tone: toneFromStatus(row.tone || row.status),
    cpuPercent: row.cpuPercent,
    ramBytes: row.memoryBytes,
    ramPercent:
      payload.summary.totalMemoryBytes > 0
        ? Math.min(100, Math.max(0, (row.memoryBytes / payload.summary.totalMemoryBytes) * 100))
        : 0,
    gpuPercent: row.gpuPercent,
    badges: [
      row.status,
      row.gpuPercent >= 10 ? "GPU Heavy" : null,
      row.memoryBytes >= 512 * MB ? "High RAM" : null,
    ].filter(Boolean),
    detail: row.detail,
    detailLines: row.contextItems,
    type: row.type,
    rateLimits: row.rateLimits || null,
  }));

  const idleSupportModels = rows.filter((row) => row.status === "Idle" || row.status === "Waiting").length;

  return {
    capturedAt: payload.capturedAt,
    summary: payload.summary,
    rows,
    recommendations: recommendationFromPayload(payload),
    residency: {
      mainModelStatus: payload.provider?.status === "online" ? "Active" : payload.provider?.status || "Idle",
      supportModelsIdle: idleSupportModels,
      reservedRamBytes: payload.summary.privateBytes || payload.summary.memoryBytes,
      reservedVramBytes: payload.summary.gpuMemoryBytes || 0,
      foregroundPriorityOn: payload.optimizer.sessionMode === "active" || payload.provider?.status === "online",
      mainModelLabel: payload.provider?.model || payload.provider?.provider || "Horizons runtime",
    },
    pressure: {
      level: payload.optimizer.pressure?.overall || "stable",
      memoryPressure: payload.optimizer.pressure?.ram || "stable",
      gpuPressure: payload.optimizer.pressure?.vram || "stable",
      queueDepth: payload.optimizer.pendingRecommendations || 0,
      opportunities: payload.recommendations.length,
    },
    footer: {
      visibleGroups: rows.length,
      recommendations: payload.recommendations.length,
      protectedHidden: 0,
      lastOptimizeAt: payload.optimizer.capturedAt || payload.capturedAt,
    },
    telemetryLine: `Last refresh ${new Date(payload.capturedAt).toLocaleTimeString()} | CPU ${payload.summary.cpuPercent.toFixed(
      1
    )}% | GPU ${payload.summary.gpuPercent.toFixed(1)}% | RAM ${toLabel(payload.summary.memoryBytes)} / ${toLabel(
      payload.summary.totalMemoryBytes
    )} | VRAM ${toLabel(payload.summary.gpuMemoryBytes)}${payload.summary.gpuMemoryBytes ? " reserved" : ""}`,
    provider: payload.provider,
    recentActivity: payload.recentActivity,
  };
}
