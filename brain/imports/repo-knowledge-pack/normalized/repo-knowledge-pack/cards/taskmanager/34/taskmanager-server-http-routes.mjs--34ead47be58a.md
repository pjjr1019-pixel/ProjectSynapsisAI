---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/http-routes.mjs"
source_name: "http-routes.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 78
selected_rank: 713
content_hash: "8f0685f6683a940b45d5f965a1d264f906ee1050d405388a40053f58ec08cd78"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "../portable_lib/brain-chat-reply.mjs"
  - "../portable_lib/brain-local-llm.mjs"
  - "../portable_lib/optimizer-telemetry.mjs"
  - "../portable_lib/process-knowledge-listener.mjs"
  - "../portable_lib/process-knowledge-registry.mjs"
  - "./runtime-manager/ai-runtime-service.mjs"
  - "./runtime-manager/process-monitor-service.mjs"
  - "./task-manager-ai.mjs"
---

# taskmanager/server/http-routes.mjs

> Code module; imports ../portable_lib/brain-chat-reply.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/optimizer-telemetry.mjs, ../portable_lib/process-knowledge-listener.mjs

## Key Signals

- Source path: taskmanager/server/http-routes.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 78
- Tags: code, high-value, mjs, scripts, server
- Imports: ../portable_lib/brain-chat-reply.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/optimizer-telemetry.mjs, ../portable_lib/process-knowledge-listener.mjs, ../portable_lib/process-knowledge-registry.mjs, ./runtime-manager/ai-runtime-service.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/http-routes.mjs

## Excerpt

~~~javascript
import { getAiTaskManagerPayload } from "./task-manager-ai.mjs";
import { getAiRuntimeSidebarModel } from "./runtime-manager/ai-runtime-service.mjs";
import { buildChatReply } from "../portable_lib/brain-chat-reply.mjs";
import { getLocalLlmConfig } from "../portable_lib/brain-local-llm.mjs";
import { getLatestOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { loadProcessKnowledgeState } from "../portable_lib/process-knowledge-registry.mjs";
import {
  approveGovernedApproval,
  declineGovernedApproval,
  executeGovernedPlanDirect,
  getGovernedActionContracts,
  getPendingGovernedApprovals,
  rollbackGovernedRun,
  tryHandleGovernedChatRequest,
} from "../portable_lib/governed-actions.mjs";
import {
  getProcessKnowledgeEnrichmentSnapshot,
  runProcessKnowledgeEnrichmentOnce,
} from "../portable_lib/process-knowledge-enricher.mjs";
import { getProcessKnowledgeListenerSnapshot } from "../portable_lib/process-knowledge-listener.mjs";
import { buildProcessMonitorOverview } from "./runtime-manager/process-monitor-service.mjs";

async function loadConversationSnapshotStore() {
  return import("./conversation-snapshot-store.mjs");
}

const MB = 1024 * 1024;
const TOP_QUERY_RE = /\b(top|highest|biggest|heaviest|most|using the most)\b/i;
~~~