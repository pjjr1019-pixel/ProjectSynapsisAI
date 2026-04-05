---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-build-utils.mjs"
source_name: "brain-build-utils.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3431
content_hash: "524d03fdd788bb3178d0de5101e5ac5089f9b08a431fd1c3859a3a78eef47616"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "node:crypto"
  - "node:fs"
  - "node:path"
exports:
  - "BRAIN_RUNTIME_BUILD_VERSION"
  - "BRAIN_RUNTIME_SCHEMA_VERSION"
  - "compareStrings"
  - "deriveSlugFromPath"
  - "ensureDir"
  - "firstParagraph"
  - "normalizeSlashes"
  - "readJsonIfExists"
  - "relPath"
  - "sentenceFragments"
---

# taskmanager/portable_lib/brain-build-utils.mjs

> Code module; imports node:crypto, node:fs, node:path; exports BRAIN_RUNTIME_BUILD_VERSION, BRAIN_RUNTIME_SCHEMA_VERSION, compareStrings, deriveSlugFromPath

## Key Signals

- Source path: taskmanager/portable_lib/brain-build-utils.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: node:crypto, node:fs, node:path
- Exports: BRAIN_RUNTIME_BUILD_VERSION, BRAIN_RUNTIME_SCHEMA_VERSION, compareStrings, deriveSlugFromPath, ensureDir, firstParagraph

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-build-utils.mjs

## Excerpt

~~~javascript
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const BRAIN_RUNTIME_BUILD_VERSION = "brain-ir-runtime-v1";
export const BRAIN_RUNTIME_SCHEMA_VERSION = "1.0";

export function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = stableClone(value[key]);
  }
  return out;
}
~~~