---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-runtime-digests.mjs"
source_name: "brain-runtime-digests.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3434
content_hash: "77b2d48d5af249d1d0315673d10c175dbeba95ab4b3dffcc01d9a04536768150"
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
  - "./brain-text-tokens.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "generateRuntimeDigestDocs"
---

# taskmanager/portable_lib/brain-runtime-digests.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, node:fs; exports generateRuntimeDigestDocs

## Key Signals

- Source path: taskmanager/portable_lib/brain-runtime-digests.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, node:fs, node:path
- Exports: generateRuntimeDigestDocs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-runtime-digests.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function topTermsFromMessages(entries, limit = 8) {
  const counts = new Map();
  for (const entry of entries) {
    const terms = tokenizeForRetrieval(String(entry.userMessage || ""));
    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + 1);
~~~