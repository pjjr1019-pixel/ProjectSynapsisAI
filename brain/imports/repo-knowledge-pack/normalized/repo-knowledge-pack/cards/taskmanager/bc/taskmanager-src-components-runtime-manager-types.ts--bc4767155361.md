---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/types.ts"
source_name: "types.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 0
selected_rank: 3458
content_hash: "4d1286bac99579ac9f9f3019d2b5b9f1e0a56003be3ab29d1631f48c550119da"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
exports:
  - "interface"
  - "type"
---

# taskmanager/src/components/runtime-manager/types.ts

> Code module; exports interface, type

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/types.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, ts
- Exports: interface, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/components/runtime-manager/types.ts

## Excerpt

~~~typescript
export type RuntimeManagerTab = "computer" | "ai";
export type RuntimeManagerSort = "cpu" | "ram" | "gpu" | "idle" | "name";
export type RuntimeManagerFilter = "all" | "recommendation" | "ai" | "background" | "gpu";
export type RuntimeManagerTone = "neutral" | "active" | "warning" | "error";
export type RuntimePolicyMode = "balanced" | "manual";

export interface RuntimeManagerAiContext {
  appName: string;
  activeSurfaceId: string;
  activeSurfaceTitle: string;
  chatThreadTitle: string;
  chatSubmitting: boolean;
  chatWindowOpen: boolean;
  brainBrowserOpen: boolean;
  crawlTerminalOpen: boolean;
  localLlmEnabled: boolean;
  internetEnabled: boolean;
  internetProvider: string | null;
  densePilotRequested: boolean;
  densePilotReady: boolean;
  densePilotModel: string | null;
  selectedCrawlerId: string;
  idleTrainingEnabled: boolean;
  idleTrainingActive: boolean;
  idleTrainingLastRunAt: string | null;
  idleTrainingLastPromotionCount: number;
  idleTrainingParallelFetchWorkers: number;
  idleTrainingActiveFetchWorkers: number;
~~~