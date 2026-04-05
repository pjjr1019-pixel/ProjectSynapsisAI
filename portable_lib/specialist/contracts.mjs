export const EXECUTION_MODES = {
  NONE: "none",
  DRY_RUN: "dry_run",
  SUGGEST_ONLY: "suggest_only",
  ASK_FIRST: "ask_first",
  AUTORUN: "autorun",
};

export const EXECUTION_POLICIES = {
  DRY_RUN: "dry_run",
  SUGGEST_ONLY: "suggest_only",
  ASK_FIRST: "ask_first",
  AUTORUN_SAFE_ONLY: "autorun_safe_only",
  AUTORUN_WITH_POLICY: "autorun_with_policy",
};

export const SCRIPT_POLICY_CLASS = {
  READ_ONLY_SAFE: "read_only_safe",
  LOCAL_SAFE: "local_safe",
  STATE_MODIFYING: "state_modifying",
  SYSTEM_SENSITIVE: "system_sensitive",
  DESTRUCTIVE: "destructive",
  EXPERIMENTAL: "experimental",
};

export const DEFAULT_ROUTER_RESULT = {
  selected_script_id: null,
  selected_script_path: null,
  confidence: 0,
  execution_mode: EXECUTION_MODES.NONE,
  needs_confirmation: true,
  fallback_to_code_specialist: false,
  fallback_to_general_ai: true,
  argument_map: {},
  reason: "No decision available.",
};

export function normalizeExecutionPolicy(value) {
  const raw = String(value || "").trim().toLowerCase();
  const known = Object.values(EXECUTION_POLICIES);
  if (known.includes(raw)) return raw;
  return EXECUTION_POLICIES.ASK_FIRST;
}

export function validateRouterDecision(candidate) {
  const out = { ...DEFAULT_ROUTER_RESULT, ...(candidate || {}) };
  out.selected_script_id = out.selected_script_id ? String(out.selected_script_id) : null;
  out.selected_script_path = out.selected_script_path ? String(out.selected_script_path) : null;
  out.confidence = Number.isFinite(Number(out.confidence)) ? Math.max(0, Math.min(1, Number(out.confidence))) : 0;
  out.execution_mode = Object.values(EXECUTION_MODES).includes(out.execution_mode)
    ? out.execution_mode
    : EXECUTION_MODES.NONE;
  out.needs_confirmation = out.needs_confirmation !== false;
  out.fallback_to_code_specialist = out.fallback_to_code_specialist === true;
  out.fallback_to_general_ai = out.fallback_to_general_ai !== false;
  out.argument_map = out.argument_map && typeof out.argument_map === "object" ? out.argument_map : {};
  out.reason = String(out.reason || "No reason provided.");
  return out;
}

export function classifyPolicyFromManifest(manifest) {
  const risk = String(manifest?.risk_level || "low").toLowerCase();
  const sideEffects = Array.isArray(manifest?.side_effects) ? manifest.side_effects : [];
  const readsOnly = sideEffects.length === 0 && manifest?.modifies_state !== true;
  if (risk === "critical") return SCRIPT_POLICY_CLASS.DESTRUCTIVE;
  if (risk === "high") return SCRIPT_POLICY_CLASS.SYSTEM_SENSITIVE;
  if (manifest?.experimental === true) return SCRIPT_POLICY_CLASS.EXPERIMENTAL;
  if (readsOnly) return SCRIPT_POLICY_CLASS.READ_ONLY_SAFE;
  if (risk === "medium") return SCRIPT_POLICY_CLASS.STATE_MODIFYING;
  return SCRIPT_POLICY_CLASS.LOCAL_SAFE;
}
