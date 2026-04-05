---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-registry-loader.mjs"
source_name: "brain-registry-loader.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 604
content_hash: "60dfe6a8e4535da85d7c2e68cfef9580a712e94451dc68688edd0df10006ec78"
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
  - "./brain-retrieval.mjs"
  - "./brain-yaml.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "clearRegistryConfigCache"
  - "getBrainRoot"
  - "globToRegExp"
  - "loadAppRegistryConfig"
  - "loadBrainManifestConfig"
  - "loadModuleRegistryConfig"
  - "registryPatternMatches"
  - "resolveModuleIdsForBrainPath"
---

# taskmanager/portable_lib/brain-registry-loader.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-retrieval.mjs, ./brain-yaml.mjs, node:fs; exports clearRegistryConfigCache, getBrainRoot, globToRegExp, loadAppRegistryConfig

## Key Signals

- Source path: taskmanager/portable_lib/brain-registry-loader.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-retrieval.mjs, ./brain-yaml.mjs, node:fs, node:path
- Exports: clearRegistryConfigCache, getBrainRoot, globToRegExp, loadAppRegistryConfig, loadBrainManifestConfig, loadModuleRegistryConfig

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-registry-loader.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "./brain-retrieval.mjs";
import { normalizeSlashes } from "./brain-build-utils.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const brainRoot = path.join(getRepoRoot(), "brain");

/** @type {Map<string, { mtime: number, data: any }>} */
const yamlCache = new Map();

function readYamlCached(filePath) {
  const st = fs.statSync(filePath);
  const hit = yamlCache.get(filePath);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = parseYaml(fs.readFileSync(filePath, "utf8"));
  yamlCache.set(filePath, { mtime: st.mtimeMs, data });
  return data;
}

export function getBrainRoot() {
  return brainRoot;
}

export function loadBrainManifestConfig() {
  return readYamlCached(path.join(brainRoot, "MANIFEST.yaml"));
}
~~~