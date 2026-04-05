---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/safe-process-controller.mjs"
source_name: "safe-process-controller.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3463
content_hash: "2bb5e653fc19fe2831cf7681961c6c26df3ad60b19b3434c98970ad860ab3db9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
exports:
  - "buildSafeActionPlan"
  - "validateProcessAction"
---

# taskmanager/server/runtime-manager/safe-process-controller.mjs

> Code module; exports buildSafeActionPlan, validateProcessAction

## Key Signals

- Source path: taskmanager/server/runtime-manager/safe-process-controller.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Exports: buildSafeActionPlan, validateProcessAction

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/safe-process-controller.mjs

## Excerpt

~~~javascript
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
~~~