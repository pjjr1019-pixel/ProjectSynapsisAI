---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-ir-contracts.mjs"
source_name: "brain-ir-contracts.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 594
content_hash: "dcb26e0d4c9e53dc1b4f82e2c93e629c67fb4b921182393ff4bb23e8b86fa2da"
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
exports:
  - "normalizeProfileDefinition"
  - "sortExplainStages"
  - "SUPPORTED_ARTIFACT_TYPES"
  - "SUPPORTED_SOURCE_TYPES"
  - "validateArtifactEnvelope"
  - "validateNormalizedDoc"
---

# taskmanager/portable_lib/brain-ir-contracts.mjs

> Code module; imports ./brain-build-utils.mjs; exports normalizeProfileDefinition, sortExplainStages, SUPPORTED_ARTIFACT_TYPES, SUPPORTED_SOURCE_TYPES

## Key Signals

- Source path: taskmanager/portable_lib/brain-ir-contracts.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs
- Exports: normalizeProfileDefinition, sortExplainStages, SUPPORTED_ARTIFACT_TYPES, SUPPORTED_SOURCE_TYPES, validateArtifactEnvelope, validateNormalizedDoc

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-ir-contracts.mjs

## Excerpt

~~~javascript
import { compareStrings, uniqueSorted } from "./brain-build-utils.mjs";

export const SUPPORTED_SOURCE_TYPES = new Set([
  "canonical",
  "runtime",
  "web",
  "draft",
  "import",
  "memory",
]);
export const SUPPORTED_ARTIFACT_TYPES = new Set([
  "normalized-doc",
  "compact-facts",
  "semantic-map",
  "scenario-lookup",
  "response-priors",
  "prompt-pack",
  "retrieval-map",
  "summary-pack",
  "bm25",
  "runtime-manifest",
  "runtime-diagnostics",
  "brain-trace",
  "brain-eval-report",
  "brain-drift-report",
  "brain-contradiction-report",
  "context-pack",
  "dense-pilot-manifest",
~~~