---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/task-manager-ai.mjs"
source_name: "task-manager-ai.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 78
selected_rank: 714
content_hash: "9aba1e9146d738d648014cc42986cfdac74f28819dbee991d07bcc3bccc95b1c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "../portable_lib/brain-embeddings-local.mjs"
  - "../portable_lib/brain-idle-training.mjs"
  - "../portable_lib/brain-local-llm.mjs"
  - "../portable_lib/brain-retrieval-dense-lancedb.mjs"
  - "../portable_lib/brain-web-context.mjs"
  - "../portable_lib/optimizer-actions.mjs"
  - "../portable_lib/optimizer-audit.mjs"
  - "../portable_lib/optimizer-control-loop.mjs"
  - "../portable_lib/optimizer-registry.mjs"
  - "../portable_lib/optimizer-telemetry.mjs"
exports:
  - "getAiTaskManagerPayload"
---

# taskmanager/server/task-manager-ai.mjs

> Code module; imports ../portable_lib/brain-embeddings-local.mjs, ../portable_lib/brain-idle-training.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/brain-retrieval-dense-lancedb.mjs; exports getAiTaskManagerPayload

## Key Signals

- Source path: taskmanager/server/task-manager-ai.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 78
- Tags: code, high-value, mjs, scripts, server
- Imports: ../portable_lib/brain-embeddings-local.mjs, ../portable_lib/brain-idle-training.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/brain-retrieval-dense-lancedb.mjs, ../portable_lib/brain-web-context.mjs, ../portable_lib/optimizer-actions.mjs
- Exports: getAiTaskManagerPayload

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/task-manager-ai.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDensePilotSettings } from "../portable_lib/brain-embeddings-local.mjs";
import { getIdleTrainingSystemSnapshot } from "../portable_lib/brain-idle-training.mjs";
import { getLocalLlmConfig } from "../portable_lib/brain-local-llm.mjs";
import { densePilotReady } from "../portable_lib/brain-retrieval-dense-lancedb.mjs";
import { getInternetProvider } from "../portable_lib/brain-web-context.mjs";
import { getRecommendations } from "../portable_lib/optimizer-actions.mjs";
import { getRecentAuditEvents } from "../portable_lib/optimizer-audit.mjs";
import { getOptimizerStatus } from "../portable_lib/optimizer-control-loop.mjs";
import { getAllModules } from "../portable_lib/optimizer-registry.mjs";
import { collectTelemetry, getLatestOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { getProviderUsageSnapshot, listProviderUsageSnapshots } from "../portable_lib/provider-usage-telemetry.mjs";
import {
  parseBrainIntent,
  decomposeBrainIntent,
  planBrainWorkflow,
  compileBrainActions,
  summarizeTasks,
  compileActionSummary,
} from "../brain/scripts/ai-toolkit/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = resolve(__dirname, "..", ".runtime", "launcher-workspace-snapshot.json");
const MB = 1024 * 1024;
const EMPTY_CONVERSATION_SNAPSHOT = Object.freeze({
  publishedAt: null,
~~~