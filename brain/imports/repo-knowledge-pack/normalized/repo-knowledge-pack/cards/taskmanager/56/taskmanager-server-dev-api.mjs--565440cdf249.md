---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/dev-api.mjs"
source_name: "dev-api.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 78
selected_rank: 712
content_hash: "1c5d83212aa2bd67eca9ec832995aea8877639c0f86d21dfde8b8f45410aa600"
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
  - "../portable_lib/developer-mode-settings.mjs"
  - "../portable_lib/optimizer-audit.mjs"
  - "../portable_lib/optimizer-policy.mjs"
  - "../portable_lib/optimizer-registry.mjs"
  - "../portable_lib/optimizer-telemetry.mjs"
  - "./conversation-snapshot-store.mjs"
  - "./http-routes.mjs"
  - "./runtime-manager/ai-runtime-service.mjs"
---

# taskmanager/server/dev-api.mjs

> Code module; imports ../portable_lib/brain-chat-reply.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/developer-mode-settings.mjs, ../portable_lib/optimizer-audit.mjs

## Key Signals

- Source path: taskmanager/server/dev-api.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 78
- Tags: code, high-value, mjs, scripts, server
- Imports: ../portable_lib/brain-chat-reply.mjs, ../portable_lib/brain-local-llm.mjs, ../portable_lib/developer-mode-settings.mjs, ../portable_lib/optimizer-audit.mjs, ../portable_lib/optimizer-policy.mjs, ../portable_lib/optimizer-registry.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/dev-api.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { handleTaskManagerHttpRoute } from "./http-routes.mjs";
import { getAiRuntimeSidebarModel } from "./runtime-manager/ai-runtime-service.mjs";
import { clearConversationSnapshot, getConversationSnapshot } from "./conversation-snapshot-store.mjs";
import { getAiTaskManagerPayload } from "./task-manager-ai.mjs";
import { acceptOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { getPolicyDiagnostics } from "../portable_lib/optimizer-policy.mjs";
import { getAuditSummary, getRecentAuditEvents } from "../portable_lib/optimizer-audit.mjs";
import { getAllModules, setModulePolicy } from "../portable_lib/optimizer-registry.mjs";
import {
  acceptRecommendation,
  getPendingApprovals,
  getRecommendations,
  ignoreRecommendation,
  approvePendingAction,
  snoozeRecommendation,
  declinePendingAction,
} from "../portable_lib/optimizer-actions.mjs";
import {
  getOptimizerStatus,
  setKillSwitch,
  setPerformanceMode,
  startOptimizerControlLoop,
  stopOptimizerControlLoop,
~~~