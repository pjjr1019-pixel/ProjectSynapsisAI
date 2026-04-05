---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/manifest.mjs"
source_name: "manifest.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 102
selected_rank: 564
content_hash: "308d496676f0ccb1654e5f496e8b1be79b2b367cd813e00d1ae60e47cd1b0d1f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "manifest"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./contracts.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "ensureManifestSchemaFile"
  - "getScriptManifestSchema"
  - "normalizeScriptManifest"
  - "validateScriptManifest"
---

# taskmanager/portable_lib/specialist/manifest.mjs

> Code module; imports ./contracts.mjs, node:fs, node:path; exports ensureManifestSchemaFile, getScriptManifestSchema, normalizeScriptManifest, validateScriptManifest

## Key Signals

- Source path: taskmanager/portable_lib/specialist/manifest.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 102
- Tags: code, high-value, manifest, mjs, portable-lib, scripts
- Imports: ./contracts.mjs, node:fs, node:path
- Exports: ensureManifestSchemaFile, getScriptManifestSchema, normalizeScriptManifest, validateScriptManifest

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, manifest, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/manifest.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { classifyPolicyFromManifest } from "./contracts.mjs";

export function getScriptManifestSchema() {
  return {
    type: "object",
    required: [
      "id",
      "title",
      "description",
      "category",
      "inputs",
      "outputs",
      "side_effects",
      "safe_to_autorun",
      "requires_confirmation",
      "platform",
      "path",
      "version",
      "last_verified",
    ],
  };
}

export function validateScriptManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
~~~