---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-ir-build.mjs"
source_name: "brain-ir-build.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3433
content_hash: "e58e533d38e8612506ef7e281e4dfd4b5b72b87407150e017d558a84b7013fad"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-digests.mjs"
  - "./brain-runtime-hub.mjs"
  - "./brain-text-tokens.mjs"
  - "./brain-yaml.mjs"
  - "node:fs"
  - "node:path"
---

# taskmanager/portable_lib/brain-ir-build.mjs

> Code module; imports ./brain-runtime-digests.mjs, ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, ./brain-yaml.mjs

## Key Signals

- Source path: taskmanager/portable_lib/brain-ir-build.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-digests.mjs, ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, ./brain-yaml.mjs, node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-ir-build.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  compareStrings,
  ensureDir,
  firstParagraph,
  normalizeSlashes,
  relPath,
  sentenceFragments,
  sha256File,
  sha256Text,
  uniqueSorted,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import {
  normalizeProfileDefinition,
  validateArtifactEnvelope,
  validateNormalizedDoc,
} from "./brain-ir-contracts.mjs";
import {
  getBrainRoot,
  loadAppRegistryConfig,
  loadBrainManifestConfig,
  loadModuleRegistryConfig,
  resolveModuleIdsForBrainPath,
} from "./brain-registry-loader.mjs";
~~~