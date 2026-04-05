---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-pipeline.mjs"
source_name: "process-knowledge-pipeline.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 620
content_hash: "abb5d101de79124cd213f29c57958d4ced4b75fb6fe7135ee9aa45fd6ed755b0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
exports:
  - "buildEvidenceQuery"
  - "classifySpecialProcess"
  - "decidePipelineVerdict"
  - "detectConflictingFindings"
  - "evaluateEvidenceThreshold"
  - "normalizeEvidenceFieldFlags"
  - "normalizeIdentityFromEvidence"
  - "scoreSourceConfidence"
  - "shouldPersistFinalKnowledge"
---

# taskmanager/portable_lib/process-knowledge-pipeline.mjs

> Code module; imports ./brain-build-utils.mjs; exports buildEvidenceQuery, classifySpecialProcess, decidePipelineVerdict, detectConflictingFindings

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-pipeline.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs
- Exports: buildEvidenceQuery, classifySpecialProcess, decidePipelineVerdict, detectConflictingFindings, evaluateEvidenceThreshold, normalizeEvidenceFieldFlags

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-pipeline.mjs

## Excerpt

~~~javascript
import { normalizeSlashes, sha256Text } from "./brain-build-utils.mjs";

const STATUS_SET = new Set([
  "pending",
  "enriching",
  "resolved_high_confidence",
  "resolved_medium_confidence",
  "low_confidence",
  "unresolved",
  "conflicted",
  "failed",
  "ignored",
]);

const HIGH_TRUST_DOMAINS = [
  /(^|\.)microsoft\.com$/i,
  /(^|\.)learn\.microsoft\.com$/i,
  /(^|\.)support\.microsoft\.com$/i,
  /(^|\.)docs\.python\.org$/i,
  /(^|\.)nodejs\.org$/i,
  /(^|\.)oracle\.com$/i,
  /(^|\.)openjdk\.org$/i,
  /(^|\.)mozilla\.org$/i,
  /(^|\.)google\.com$/i,
  /(^|\.)chromium\.org$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)github\.io$/i,
];
~~~