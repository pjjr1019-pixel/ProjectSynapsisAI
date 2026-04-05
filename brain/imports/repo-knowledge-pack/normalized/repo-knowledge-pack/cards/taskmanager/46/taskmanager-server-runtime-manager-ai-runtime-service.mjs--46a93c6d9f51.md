---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/ai-runtime-service.mjs"
source_name: "ai-runtime-service.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3459
content_hash: "f2037fa4de1a171925f54a085bd5d7b2f6fd88e63b38235dfce042ebca58598a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "../task-manager-ai.mjs"
exports:
  - "getAiRuntimeSidebarModel"
---

# taskmanager/server/runtime-manager/ai-runtime-service.mjs

> Code module; imports ../task-manager-ai.mjs; exports getAiRuntimeSidebarModel

## Key Signals

- Source path: taskmanager/server/runtime-manager/ai-runtime-service.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Imports: ../task-manager-ai.mjs
- Exports: getAiRuntimeSidebarModel

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/ai-runtime-service.mjs

## Excerpt

~~~javascript
import { getAiTaskManagerPayload } from "../task-manager-ai.mjs";

const MB = 1024 * 1024;

function toLabel(bytes) {
  if (!bytes) return "0 MB";
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

function toneFromStatus(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("error") || text.includes("offline") || text.includes("kill")) return "error";
  if (text.includes("limit") || text.includes("wait")) return "warning";
  if (text.includes("run") || text.includes("active") || text.includes("ready")) return "active";
  return "neutral";
}

function subtitleForRow(row) {
  if (row.id === "chat-pipeline") return "App core";
  if (row.id === "provider-model") return "Foreground model";
  if (row.id === "crawler-fleet") return "Background helper";
  if (row.id === "brain-browser") return "Context surface";
  if (row.id === "retrieval-dense-pilot") return "AI worker";
  if (row.id === "ingestion-build-jobs") return "Background helper";
  if (row.id === "optimizer") return "System optimizer";
  return row.type;
}
~~~