---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/conversation-snapshot-store.mjs"
source_name: "conversation-snapshot-store.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 78
selected_rank: 711
content_hash: "24cdcc26a388f72495637f30a0db1471ba2a90156c3f19f35755cafdc71a17cf"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "../portable_lib/taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "clearConversationSnapshot"
  - "getConversationSnapshot"
  - "publishConversationSnapshot"
---

# taskmanager/server/conversation-snapshot-store.mjs

> Code module; imports ../portable_lib/taskmanager-paths.mjs, node:fs, node:path; exports clearConversationSnapshot, getConversationSnapshot, publishConversationSnapshot

## Key Signals

- Source path: taskmanager/server/conversation-snapshot-store.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 78
- Tags: code, high-value, mjs, scripts, server
- Imports: ../portable_lib/taskmanager-paths.mjs, node:fs, node:path
- Exports: clearConversationSnapshot, getConversationSnapshot, publishConversationSnapshot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/conversation-snapshot-store.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import { dirname } from "node:path";
import { getTaskmanagerPaths } from "../portable_lib/taskmanager-paths.mjs";

const SNAPSHOT_FILE = `${getTaskmanagerPaths().appRuntimeStateRoot}/launcher-workspace-snapshot.json`;

const MAX_THREADS = 80;
const MAX_TITLE_CHARS = 120;
const MAX_PREVIEW_CHARS = 220;
const MAX_WORKSPACE_MESSAGES = 24;
const MAX_WORKSPACE_ATTACHMENTS = 20;
const MAX_WORKSPACE_TERMINAL_LINES = 80;

const EMPTY_SNAPSHOT = Object.freeze({
  publishedAt: null,
  activeThreadId: null,
  activeSurfaceId: null,
  activeSurfaceTitle: null,
  threads: [],
  workspace: null,
});

function toText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function compactText(value, maxLength) {
  const normalized = toText(value).replace(/\s+/g, " ");
~~~