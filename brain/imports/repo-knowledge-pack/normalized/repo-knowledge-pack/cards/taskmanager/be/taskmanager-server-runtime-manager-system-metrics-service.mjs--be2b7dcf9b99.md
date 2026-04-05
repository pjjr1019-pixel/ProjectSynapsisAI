---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/system-metrics-service.mjs"
source_name: "system-metrics-service.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3464
content_hash: "20b18ba99738f0123e506571ea62ef3d37ad66ca3cf6048d92c800b8a899e76e"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "./gpu-stats-service.mjs"
exports:
  - "summarizeSystemMetrics"
---

# taskmanager/server/runtime-manager/system-metrics-service.mjs

> Code module; imports ./gpu-stats-service.mjs; exports summarizeSystemMetrics

## Key Signals

- Source path: taskmanager/server/runtime-manager/system-metrics-service.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Imports: ./gpu-stats-service.mjs
- Exports: summarizeSystemMetrics

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/system-metrics-service.mjs

## Excerpt

~~~javascript
import { summarizeGpuStats } from "./gpu-stats-service.mjs";

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

function pressureFromRatio(ratio) {
  if (ratio >= 0.92) return "critical";
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.62) return "warm";
  return "stable";
}

function mergePressure(...levels) {
  const rank = {
    stable: 0,
    warm: 1,
    high: 2,
    critical: 3,
  };
  const byRank = ["stable", "warm", "high", "critical"];
  const maxRank = Math.max(...levels.map((level) => rank[level] ?? 0));
  return byRank[maxRank] ?? "stable";
~~~