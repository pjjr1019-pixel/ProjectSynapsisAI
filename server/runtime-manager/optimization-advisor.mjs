const MB = 1024 * 1024;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function confidence(value) {
  return Math.round(clamp(value, 0, 0.99) * 100);
}

function bytesLabel(bytes) {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

function buildRecommendation(row, input) {
  if (row.protected) return null;
  const browserSource = `${row.name || ""} ${row.secondaryLabel || ""} ${row.type || ""}`;

  if (!row.aiWorker && /browser|fetch/i.test(browserSource) && row.idleMinutes >= 3 && row.ramBytes >= 250 * MB) {
    return {
      id: `${row.id}-hibernate`,
      groupId: row.groupId,
      action: "suspend",
      label: "Hibernate idle browser worker",
      description: `${row.name} is idle and safe to suspend while you focus on active AI work.`,
      estimatedSavingsBytes: row.ramBytes,
      estimatedSavingsLabel: `Save ${bytesLabel(row.ramBytes)}`,
      confidence: confidence(0.91),
      tier: "auto",
    };
  }

  if (row.aiWorker && /embedding|memory/i.test(`${row.name} ${row.secondaryLabel}`) && row.idleMinutes >= 5 && row.gpuPercent <= 2) {
    return {
      id: `${row.id}-deprioritize`,
      groupId: row.groupId,
      action: "lower-priority",
      label: "Unload inactive embedding model",
      description: `${row.name} looks idle enough to deprioritize without evicting the active foreground model.`,
      estimatedSavingsBytes: Math.max(row.ramBytes * 0.45, 180 * MB),
      estimatedSavingsLabel: `Save ${bytesLabel(Math.max(row.ramBytes * 0.45, 180 * MB))}`,
      confidence: confidence(0.74),
      tier: "manual",
    };
  }

  if (!row.aiWorker && row.idleMinutes >= 4 && row.ramBytes >= 180 * MB) {
    return {
      id: `${row.id}-trim`,
      groupId: row.groupId,
      action: "suspend",
      label: "Trim stale cache",
      description: `${row.name} has been idle long enough to reclaim memory without touching protected processes.`,
      estimatedSavingsBytes: Math.max(row.ramBytes * 0.35, 120 * MB),
      estimatedSavingsLabel: `Save ${bytesLabel(Math.max(row.ramBytes * 0.35, 120 * MB))}`,
      confidence: confidence(0.66),
      tier: "manual",
    };
  }

  if (!row.protected && /crawl|scheduler/i.test(`${row.name} ${row.secondaryLabel}`) && input.queueDepth > 0 && row.cpuPercent >= 15) {
    return {
      id: `${row.id}-deprioritize`,
      groupId: row.groupId,
      action: "lower-priority",
      label: "Pause low-value indexing",
      description: `${row.name} is competing for CPU while queue pressure is high, so lowering its priority can stabilize the workstation.`,
      estimatedSavingsBytes: row.ramBytes * 0.1,
      estimatedSavingsLabel: `Free CPU headroom`,
      confidence: confidence(0.62),
      tier: "manual",
    };
  }

  return null;
}

function buildPressureCard(metrics, rows, recommendations, queueDepth) {
  const opportunities = recommendations.length;
  return {
    level: metrics.overallPressure,
    memoryPressure: metrics.ramPressure,
    gpuPressure: metrics.gpuPressure,
    queueDepth,
    opportunities,
    label:
      metrics.overallPressure === "critical"
        ? "Critical"
        : metrics.overallPressure === "high"
          ? "High"
          : metrics.overallPressure === "warm"
            ? "Warm"
            : "Stable",
  };
}

export function buildOptimizationAdvisor(input) {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const queueDepth = Number(input.queueDepth || 0);
  const mode = input.mode || "balanced";
  const recommendations = rows
    .map((row) => buildRecommendation(row, { queueDepth, mode }))
    .filter(Boolean)
    .sort((left, right) => right.confidence - left.confidence || right.estimatedSavingsBytes - left.estimatedSavingsBytes)
    .slice(0, 6);

  return {
    recommendations,
    pressure: buildPressureCard(input.metrics, rows, recommendations, queueDepth),
  };
}

export function buildAutoOptimizationPlan(recommendations, options = {}) {
  const mode = options.mode || "balanced";
  const maxActions = mode === "balanced" ? 1 : 2;

  return (Array.isArray(recommendations) ? recommendations : [])
    .filter((recommendation) => recommendation.tier === "auto" || mode !== "balanced")
    .slice(0, maxActions)
    .map((recommendation) => ({
      groupId: recommendation.groupId,
      action: recommendation.action,
      recommendationId: recommendation.id,
    }));
}
