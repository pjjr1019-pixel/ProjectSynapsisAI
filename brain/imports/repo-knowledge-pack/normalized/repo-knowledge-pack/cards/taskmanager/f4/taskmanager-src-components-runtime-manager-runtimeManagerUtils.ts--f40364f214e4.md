---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/runtimeManagerUtils.ts"
source_name: "runtimeManagerUtils.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 0
selected_rank: 3455
content_hash: "bb16400c6bff7e676d642541cc8214e1942717465f95790e74050c1474a963d2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
exports:
  - "enrichAiOverviewWithContext"
  - "extractRecentTargets"
  - "formatBytes"
  - "formatClock"
  - "formatCompactBytes"
  - "formatPercent"
  - "formatRateLimitLabel"
  - "formatRelativeTime"
  - "functi"
  - "loadRuntimeManagerPrefs"
---

# taskmanager/src/components/runtime-manager/runtimeManagerUtils.ts

> Code module; exports enrichAiOverviewWithContext, extractRecentTargets, formatBytes, formatClock

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/runtimeManagerUtils.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, ts
- Exports: enrichAiOverviewWithContext, extractRecentTargets, formatBytes, formatClock, formatCompactBytes, formatPercent

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/components/runtime-manager/runtimeManagerUtils.ts

## Excerpt

~~~typescript
import type {
  RuntimeManagerAiContext,
  RuntimeManagerAiOverview,
  RuntimeManagerAdvisorItem,
  RuntimeManagerComputerOverview,
  RuntimeManagerDisplayRow,
  RuntimeManagerFooterModel,
  RuntimeManagerPrefs,
  RuntimeManagerRateLimits,
  RuntimeManagerSummaryModel,
  RuntimeManagerTone,
  RuntimeManagerViewModel,
} from "./types";

const MB = 1024 * 1024;
const STORAGE_KEY = "horizons.runtimeManager.v1";
const NETWORK_RETRY_DELAY_MS = 350;

export const RUNTIME_MANAGER_VISIBLE_POLL_MS = 1800;
export const RUNTIME_MANAGER_BACKGROUND_POLL_MS = 6500;
export const RUNTIME_MANAGER_AUTO_OPTIMIZE_VISIBLE_MS = 30000;
export const RUNTIME_MANAGER_AUTO_OPTIMIZE_BACKGROUND_MS = 90000;
export const RUNTIME_MANAGER_SNOOZE_MS = 60 * 60 * 1000;

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
~~~