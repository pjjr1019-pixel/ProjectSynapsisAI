---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-enricher.mjs"
source_name: "process-knowledge-enricher.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 615
content_hash: "a5f43130d21675bc87ad859a2266a0ed87f72ab5b20dfed7e4f075c1b48e17e9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-web-context.mjs"
  - "./optimizer-telemetry.mjs"
  - "./process-knowledge-identity.mjs"
  - "./process-knowledge-local-evidence.mjs"
  - "./process-knowledge-paths.mjs"
  - "./process-knowledge-pipeline.mjs"
  - "node:fs"
  - "node:path"
---

# taskmanager/portable_lib/process-knowledge-enricher.mjs

> Code module; imports ./brain-web-context.mjs, ./optimizer-telemetry.mjs, ./process-knowledge-identity.mjs, ./process-knowledge-local-evidence.mjs

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-enricher.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-web-context.mjs, ./optimizer-telemetry.mjs, ./process-knowledge-identity.mjs, ./process-knowledge-local-evidence.mjs, ./process-knowledge-paths.mjs, ./process-knowledge-pipeline.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-enricher.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";

import {
  ensureDir,
  firstParagraph,
  normalizeSlashes,
  uniqueSorted,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { fetchWebContext } from "./brain-web-context.mjs";
import { collectLocalEvidence } from "./process-knowledge-local-evidence.mjs";
import { evaluateRepairNeed } from "./process-knowledge-pipeline.mjs";
import {
  buildEvidenceQuery,
  classifySpecialProcess,
  decidePipelineVerdict,
  detectConflictingFindings,
  normalizeEvidenceFieldFlags,
  scoreSourceConfidence,
  shouldPersistFinalKnowledge,
} from "./process-knowledge-pipeline.mjs";
import { getLatestTelemetry } from "./optimizer-telemetry.mjs";
import {
  enqueue,
  loadPendingEnrichmentQueue,
  loadSeenRegistry,
  markRegistryEnriching,
~~~