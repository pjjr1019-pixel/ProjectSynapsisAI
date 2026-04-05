---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/index-service.mjs"
source_name: "index-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 96
selected_rank: 569
content_hash: "ac90d7342dbd321d1361b9359a78afc31ffa85d219b5bd708f8dc3cbae3623fc"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "index"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./manifest.mjs"
  - "./paths.mjs"
  - "node:crypto"
  - "node:fs"
  - "node:path"
exports:
  - "ScriptIndexService"
---

# taskmanager/portable_lib/specialist/index-service.mjs

> Code module; imports ./manifest.mjs, ./paths.mjs, node:crypto, node:fs; exports ScriptIndexService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/index-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 96
- Tags: code, high-value, index, mjs, portable-lib, scripts
- Imports: ./manifest.mjs, ./paths.mjs, node:crypto, node:fs, node:path
- Exports: ScriptIndexService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, index, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/index-service.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureManifestSchemaFile, normalizeScriptManifest } from "./manifest.mjs";
import { readJsonFile, writeJsonFile } from "./paths.mjs";

function hashValue(payload) {
  return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function mapPolicyClass(tool) {
  const risk = String(tool?.risk_level || "low").toLowerCase();
  if (risk === "critical") return "destructive";
  if (risk === "high") return "system_sensitive";
  if (risk === "medium") return "state_modifying";
  return Array.isArray(tool?.side_effects) && tool.side_effects.length ? "local_safe" : "read_only_safe";
}

function detectScriptPath(paths, tool) {
~~~