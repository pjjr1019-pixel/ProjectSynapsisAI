import crypto from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function toText(value) {
  return String(value || "").trim();
}

export function createCanonicalTask(request = {}, context = {}) {
  const createdAt = nowIso();
  return {
    id: request.id || `task_${crypto.randomUUID().replace(/-/g, "")}`,
    createdAt,
    updatedAt: createdAt,
    originalRequest: toText(request.originalRequest || request.message),
    normalizedRequest: toText(request.normalizedRequest || request.message).toLowerCase(),
    intentLabel: request.intentLabel || "workflow.unknown",
    entities: Array.isArray(request.entities) ? request.entities : [],
    slots: request.slots && typeof request.slots === "object" ? request.slots : {},
    sourceRoute: context.sourceRoute || request.sourceRoute || "workflow-runtime",
    plannerId: request.plannerId || null,
    plannerMetadata: request.plannerMetadata && typeof request.plannerMetadata === "object" ? request.plannerMetadata : {},
    workflowId: request.workflowId || null,
    workflowStatus: request.workflowStatus || null,
    plan: request.plan || null,
    validation: request.validation || null,
    approval: request.approval || null,
    execution: request.execution || null,
    verification: request.verification || null,
    capture: request.capture || null,
    reflection: request.reflection || null,
    warnings: Array.isArray(request.warnings) ? request.warnings : [],
    errors: Array.isArray(request.errors) ? request.errors : [],
  };
}

export function updateCanonicalTask(task, patch = {}) {
  return {
    ...(task && typeof task === "object" ? task : createCanonicalTask()),
    ...patch,
    updatedAt: nowIso(),
  };
}
