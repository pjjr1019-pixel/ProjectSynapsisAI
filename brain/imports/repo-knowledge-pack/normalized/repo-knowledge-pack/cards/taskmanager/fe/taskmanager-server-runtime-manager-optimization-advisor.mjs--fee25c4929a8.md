---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/optimization-advisor.mjs"
source_name: "optimization-advisor.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3461
content_hash: "2e28aebb46bfe79b779889d63a9e340f11c76bd9187c86a5cf722fb9ea19531f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
exports:
  - "buildAutoOptimizationPlan"
  - "buildOptimizationAdvisor"
---

# taskmanager/server/runtime-manager/optimization-advisor.mjs

> Code module; exports buildAutoOptimizationPlan, buildOptimizationAdvisor

## Key Signals

- Source path: taskmanager/server/runtime-manager/optimization-advisor.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Exports: buildAutoOptimizationPlan, buildOptimizationAdvisor

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/optimization-advisor.mjs

## Excerpt

~~~javascript
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
~~~