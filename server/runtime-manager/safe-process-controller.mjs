const AUTO_BLOCKED_ACTIONS = new Set(["end"]);

export function validateProcessAction(row, action, opts = {}) {
  const mode = opts.mode || "balanced";
  const reasons = [];

  if (!row) reasons.push("Missing process row.");
  if (row?.protected) reasons.push("Protected processes cannot be optimized.");
  if (row?.aiWorker && action === "suspend") reasons.push("AI workers are never suspended automatically.");
  if (row?.hasVisibleWindow && action === "suspend") reasons.push("Foreground apps are not suspended automatically.");
  if (mode === "balanced" && AUTO_BLOCKED_ACTIONS.has(action)) reasons.push("Balanced mode never auto-terminates tasks.");
  if (mode === "balanced" && row?.gpuPercent >= 10 && action !== "lower-priority") {
    reasons.push("GPU-heavy tasks are only deprioritized in balanced mode.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function buildSafeActionPlan(rowsByGroupId, recommendations, opts = {}) {
  const plan = [];

  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    const row = rowsByGroupId.get(recommendation.groupId);
    const validation = validateProcessAction(row, recommendation.action, opts);
    if (!validation.allowed) continue;
    plan.push({
      groupId: recommendation.groupId,
      action: recommendation.action,
      recommendationId: recommendation.id,
    });
  }

  return plan;
}
