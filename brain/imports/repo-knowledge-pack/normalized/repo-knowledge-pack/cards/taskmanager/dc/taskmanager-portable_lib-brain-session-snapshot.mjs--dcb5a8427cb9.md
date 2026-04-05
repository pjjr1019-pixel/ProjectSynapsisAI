---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-session-snapshot.mjs"
source_name: "brain-session-snapshot.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 609
content_hash: "7db4381e32513fd51315a30034f1b1b764b220cb1db9635bca2d021be7de9ed9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-runtime-hub.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "persistSessionSnapshot"
---

# taskmanager/portable_lib/brain-session-snapshot.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-runtime-hub.mjs, node:fs, node:path; exports persistSessionSnapshot

## Key Signals

- Source path: taskmanager/portable_lib/brain-session-snapshot.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-runtime-hub.mjs, node:fs, node:path
- Exports: persistSessionSnapshot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-session-snapshot.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes, writeJsonStable } from "./brain-build-utils.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function safeSessionKey(sessionId) {
  return String(sessionId ?? "anon")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 80) || "anon";
}

function summaryText(snapshot) {
  const pinned = Array.isArray(snapshot.pinnedDocIds) && snapshot.pinnedDocIds.length
    ? snapshot.pinnedDocIds.slice(0, 5).map((id) => `- ${id}`).join("\n")
    : "- none";
  return [
    "---",
    `id: hz.runtime.session.${snapshot.snapshotKey}`,
    `title: "Session snapshot ${snapshot.snapshotKey}"`,
    "domain: runtime",
    "app: assistant",
    "kind: snapshot",
    "status: canonical",
    `confidence: ${snapshot.turnCount > 0 ? "0.72" : "0.6"}`,
    `reviewedAt: "${snapshot.updatedAt}"`,
    "---",
    "",
~~~