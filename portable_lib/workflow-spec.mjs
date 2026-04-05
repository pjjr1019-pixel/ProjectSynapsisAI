import { sha256Text, uniqueSorted } from "./brain-build-utils.mjs";

export const WORKFLOW_SCHEMA_VERSION = "1.0";

function slugify(value, fallback = "workflow") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = clone(entry);
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function replacePlaceholdersInString(template, slotValues) {
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, slotName) => {
    if (!Object.prototype.hasOwnProperty.call(slotValues, slotName)) return match;
    const resolved = slotValues[slotName];
    return resolved == null ? "" : String(resolved);
  });
}

function replacePlaceholders(value, slotValues) {
  if (typeof value === "string") {
    const exact = value.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
    if (exact && Object.prototype.hasOwnProperty.call(slotValues, exact[1])) {
      return clone(slotValues[exact[1]]);
    }
    return replacePlaceholdersInString(value, slotValues);
  }
  if (Array.isArray(value)) return value.map((entry) => replacePlaceholders(entry, slotValues));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = replacePlaceholders(entry, slotValues);
  }
  return out;
}

export function normalizeWorkflowSpec(specInput = {}) {
  const createdAt = specInput.createdAt || nowIso();
  const updatedAt = specInput.updatedAt || createdAt;
  const id =
    String(specInput.id || "").trim() ||
    deriveWorkflowId({
      intentLabel: specInput.intentLabel || "workflow",
      title: specInput.title || specInput.intentLabel || "Workflow",
      steps: specInput.steps || [],
      verification: specInput.verification || [],
    });

  const slots = Array.isArray(specInput.slots)
    ? specInput.slots.map((slot) => ({
        name: String(slot?.name || "").trim(),
        type: String(slot?.type || "string").trim(),
        required: slot?.required !== false,
        description: String(slot?.description || "").trim(),
        example: slot?.example == null ? null : clone(slot.example),
        sourceArg: String(slot?.sourceArg || "").trim() || null,
      })).filter((slot) => slot.name)
    : [];

  const normalized = {
    id,
    schemaVersion: specInput.schemaVersion || WORKFLOW_SCHEMA_VERSION,
    title: String(specInput.title || id).trim(),
    status: ["candidate", "trusted", "disabled", "archived"].includes(specInput.status)
      ? specInput.status
      : "candidate",
    createdAt,
    updatedAt,
    source: ["model_planned", "imported", "migrated", "legacy_capture"].includes(specInput.source)
      ? specInput.source
      : "model_planned",
    intentLabel: String(specInput.intentLabel || "workflow.generic").trim(),
    examplePrompts: uniqueSorted(Array.isArray(specInput.examplePrompts) ? specInput.examplePrompts : []),
    slots,
    preconditions: Array.isArray(specInput.preconditions) ? specInput.preconditions.map(clone) : [],
    steps: Array.isArray(specInput.steps)
      ? specInput.steps.map((step, index) => ({
          id: String(step?.id || `step-${index + 1}`).trim(),
          title: String(step?.title || step?.action || `Step ${index + 1}`).trim(),
          action: String(step?.action || "").trim(),
          args: clone(step?.args || {}),
          slotBindings: uniqueSorted(Array.isArray(step?.slotBindings) ? step.slotBindings : []),
          notes: Array.isArray(step?.notes) ? step.notes.map((entry) => String(entry)) : [],
        }))
      : [],
    verification: Array.isArray(specInput.verification)
      ? specInput.verification.map((entry, index) => ({
          id: String(entry?.id || `verify-${index + 1}`).trim(),
          stepId: String(entry?.stepId || "").trim() || null,
          mode: String(entry?.mode || "explicit").trim(),
          checks: Array.isArray(entry?.checks) ? entry.checks.map(clone) : [],
          allowWeak: entry?.allowWeak === true,
        }))
      : [],
    rollbackHints: Array.isArray(specInput.rollbackHints) ? specInput.rollbackHints.map(clone) : [],
    approvalProfile: {
      requiresApproval: specInput?.approvalProfile?.requiresApproval === true,
      destructiveActions: Array.isArray(specInput?.approvalProfile?.destructiveActions)
        ? uniqueSorted(specInput.approvalProfile.destructiveActions)
        : [],
      riskSummary: String(specInput?.approvalProfile?.riskSummary || "").trim(),
      stepScopes: Array.isArray(specInput?.approvalProfile?.stepScopes)
        ? specInput.approvalProfile.stepScopes.map(clone)
        : [],
    },
    successCount: Math.max(0, Number(specInput.successCount) || 0),
    failureCount: Math.max(0, Number(specInput.failureCount) || 0),
    lastSuccessAt: specInput.lastSuccessAt || null,
    lastFailureAt: specInput.lastFailureAt || null,
    confidence: Math.max(0, Math.min(1, Number(specInput.confidence) || 0)),
    tags: uniqueSorted(Array.isArray(specInput.tags) ? specInput.tags : []),
    notes: Array.isArray(specInput.notes) ? specInput.notes.map((entry) => String(entry)) : [],
    reflection: {
      summary: String(specInput?.reflection?.summary || "").trim(),
      ambiguity: Array.isArray(specInput?.reflection?.ambiguity)
        ? specInput.reflection.ambiguity.map((entry) => String(entry))
        : [],
      improvements: Array.isArray(specInput?.reflection?.improvements)
        ? specInput.reflection.improvements.map((entry) => String(entry))
        : [],
      reusable: specInput?.reflection?.reusable !== false,
    },
  };

  return {
    ...normalized,
    signatureHash: buildWorkflowSignature(normalized),
  };
}

export function buildWorkflowSignature(specInput = {}) {
  const steps = Array.isArray(specInput.steps)
    ? specInput.steps.map((step) => ({
        action: String(step?.action || "").trim(),
        args: step?.args || {},
      }))
    : [];
  const verification = Array.isArray(specInput.verification)
    ? specInput.verification.map((entry) => ({
        stepId: entry?.stepId || null,
        checks: entry?.checks || [],
      }))
    : [];

  return sha256Text(
    JSON.stringify({
      intentLabel: String(specInput.intentLabel || "").trim(),
      title: String(specInput.title || "").trim(),
      steps,
      verification,
    })
  );
}

export function deriveWorkflowId(specInput = {}) {
  const titleSlug = slugify(specInput.intentLabel || specInput.title || "workflow");
  const signature = buildWorkflowSignature(specInput).slice(0, 10);
  return `${titleSlug}.${signature}`;
}

export function instantiateWorkflowSpec(specInput, slotValues = {}) {
  const spec = normalizeWorkflowSpec(specInput);
  const mergedSlots = {};
  for (const slot of spec.slots) {
    if (slot.example != null) mergedSlots[slot.name] = clone(slot.example);
  }
  for (const [key, value] of Object.entries(slotValues || {})) {
    if (value != null) mergedSlots[key] = clone(value);
  }

  const steps = spec.steps.map((step) => ({
    id: step.id,
    title: step.title,
    action: step.action,
    args: replacePlaceholders(step.args, mergedSlots),
    slotBindings: [...step.slotBindings],
    notes: [...step.notes],
  }));

  const verification = spec.verification.map((entry) => ({
    ...entry,
    checks: replacePlaceholders(entry.checks, mergedSlots),
  }));

  return {
    spec,
    slotValues: mergedSlots,
    steps,
    verification,
    approvalProfile: clone(spec.approvalProfile),
  };
}

