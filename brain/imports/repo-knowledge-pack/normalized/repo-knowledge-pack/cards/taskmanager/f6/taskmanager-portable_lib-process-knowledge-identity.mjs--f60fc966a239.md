---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-identity.mjs"
source_name: "process-knowledge-identity.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 616
content_hash: "bcc73c1aa13cbe9b2df0142a1b41401e9c835d31e7224cc9d48ccdefee4238d6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./process-knowledge-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "buildProcessKnowledgeFileName"
  - "buildProcessKnowledgeIdentity"
  - "computeSha256PrefixForPath"
  - "derivePublisherSlugFromPath"
  - "derivePublisherSlugFromProcessRow"
  - "extractIdentityFields"
  - "fingerprintChangeReasons"
  - "fingerprintHasChanged"
  - "getProcessKnowledgeMarkdownPath"
  - "normalizeImageName"
---

# taskmanager/portable_lib/process-knowledge-identity.mjs

> Code module; imports ./brain-build-utils.mjs, ./process-knowledge-paths.mjs, node:fs, node:path; exports buildProcessKnowledgeFileName, buildProcessKnowledgeIdentity, computeSha256PrefixForPath, derivePublisherSlugFromPath

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-identity.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./process-knowledge-paths.mjs, node:fs, node:path
- Exports: buildProcessKnowledgeFileName, buildProcessKnowledgeIdentity, computeSha256PrefixForPath, derivePublisherSlugFromPath, derivePublisherSlugFromProcessRow, extractIdentityFields

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-identity.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { normalizeSlashes, sha256File, sha256Text } from "./brain-build-utils.mjs";
import { processKnowledgeRoot } from "./process-knowledge-paths.mjs";

const COMMON_PUBLISHER_SUFFIXES = [
  /\s*,?\s+inc\.?$/i,
  /\s*,?\s+llc\.?$/i,
  /\s*,?\s+ltd\.?$/i,
  /\s*,?\s+corp\.?$/i,
  /\s*,?\s+limited$/i,
];

const GENERIC_PATH_SEGMENTS = new Set([
  "cache",
  "downloads",
  "local",
  "low",
  "package cache",
  "package-cache",
  "packagecache",
  "packages",
  "temp",
  "tmp",
]);

function toText(value) {
  return String(value ?? "").trim();
~~~