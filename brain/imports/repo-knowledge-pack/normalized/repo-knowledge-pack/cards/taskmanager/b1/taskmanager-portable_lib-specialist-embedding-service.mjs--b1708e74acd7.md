---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/embedding-service.mjs"
source_name: "embedding-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 662
content_hash: "6d10f99d17bac960a2be6da55cfc5dd32070586d54b966d3a322494241c89b34"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./paths.mjs"
  - "node:crypto"
exports:
  - "ScriptEmbeddingService"
---

# taskmanager/portable_lib/specialist/embedding-service.mjs

> Code module; imports ./paths.mjs, node:crypto; exports ScriptEmbeddingService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/embedding-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./paths.mjs, node:crypto
- Exports: ScriptEmbeddingService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/embedding-service.mjs

## Excerpt

~~~javascript
import crypto from "node:crypto";
import { readJsonFile, writeJsonFile } from "./paths.mjs";

function hashText(value) {
  return crypto.createHash("sha1").update(String(value || "")).digest("hex");
}

export class ScriptEmbeddingService {
  constructor({ paths, embeddingProvider }) {
    this.paths = paths;
    this.embeddingProvider = embeddingProvider;
    this.cache = readJsonFile(paths.embeddingsCacheFile, {
      version: 1,
      updatedAt: null,
      vectors: {},
      queryVectors: {},
    });
  }

  async warm() {
    return this.embeddingProvider.warm();
  }

  async embedScripts(scriptManifests) {
    const vectors = this.cache.vectors || {};
    let changed = 0;
    for (const manifest of scriptManifests) {
      const text = [
~~~