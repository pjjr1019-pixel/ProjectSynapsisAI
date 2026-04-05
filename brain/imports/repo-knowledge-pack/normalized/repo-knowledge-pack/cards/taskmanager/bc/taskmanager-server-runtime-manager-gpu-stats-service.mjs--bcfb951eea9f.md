---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/gpu-stats-service.mjs"
source_name: "gpu-stats-service.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3460
content_hash: "ef20bcc7a06dada8de7068e2c876db386b809a82931d2fc51851d877adc8ff60"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
exports:
  - "summarizeGpuStats"
---

# taskmanager/server/runtime-manager/gpu-stats-service.mjs

> Code module; exports summarizeGpuStats

## Key Signals

- Source path: taskmanager/server/runtime-manager/gpu-stats-service.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Exports: summarizeGpuStats

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/gpu-stats-service.mjs

## Excerpt

~~~javascript
const MB = 1024 * 1024;

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

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
~~~