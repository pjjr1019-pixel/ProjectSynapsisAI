---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/governed-actions.mjs"
source_name: "governed-actions.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 649
content_hash: "dc6ecba7e7353262c8f7aa53061d853631fe724dd301d299d23d684e46348c92"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./optimizer-audit.mjs"
  - "node:crypto"
  - "node:fs"
  - "node:os"
  - "node:path"
  - "node:url"
---

# taskmanager/portable_lib/governed-actions.mjs

> Code module; imports ./optimizer-audit.mjs, node:crypto, node:fs, node:os

## Key Signals

- Source path: taskmanager/portable_lib/governed-actions.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./optimizer-audit.mjs, node:crypto, node:fs, node:os, node:path, node:url

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/governed-actions.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeAuditEvent } from "./optimizer-audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const taskmanagerRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(taskmanagerRoot, "..");

const runtimeRoot = process.env.HORIZONS_GOVERNED_RUNTIME_ROOT
  ? path.resolve(process.env.HORIZONS_GOVERNED_RUNTIME_ROOT)
  : path.join(taskmanagerRoot, "brain", "runtime", "logs", "governed-actions");
const approvalsLogPath = path.join(runtimeRoot, "approvals.jsonl");
const snapshotsRoot = path.join(runtimeRoot, "snapshots");
const summariesRoot = path.join(taskmanagerRoot, "brain", "runtime", "summaries");
const trashRoot = path.join(taskmanagerRoot, "brain", "runtime", "trash");

function pushUniquePath(collection, candidate) {
  const text = String(candidate || "").trim();
  if (!text) return;
  const normalized = path.normalize(text);
  if (!collection.includes(normalized)) {
    collection.push(normalized);
  }
}
~~~