---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/tests/process-knowledge/process-knowledge-pipeline.test.mjs"
source_name: "process-knowledge-pipeline.test.mjs"
top_level: "taskmanager"
surface: "tests"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 44
selected_rank: 3380
content_hash: "50687fe864a8a5153e90abc572bc0c13432c4bafe6e770451aaa21409d345462"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
  - "tests"
imports:
  - "node:assert/strict"
  - "node:test"
---

# taskmanager/tests/process-knowledge/process-knowledge-pipeline.test.mjs

> Code module; imports node:assert/strict, node:test

## Key Signals

- Source path: taskmanager/tests/process-knowledge/process-knowledge-pipeline.test.mjs
- Surface: tests
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 44
- Tags: code, mjs, neutral, scripts, tests
- Imports: node:assert/strict, node:test

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, mjs, neutral, scripts, taskmanager, tests
- Source link target: taskmanager/tests/process-knowledge/process-knowledge-pipeline.test.mjs

## Excerpt

~~~javascript
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEvidenceQuery,
  classifySpecialProcess,
  decidePipelineVerdict,
  detectConflictingFindings,
  evaluateEvidenceThreshold,
  evaluateRepairNeed,
  normalizeIdentityFromEvidence,
  normalizeRegistryStatus,
  scoreSourceConfidence,
  shouldPersistFinalKnowledge,
} from "../../portable_lib/process-knowledge-pipeline.mjs";

function makeBaseEvidence(overrides = {}) {
  return {
    image_name: "svchost.exe",
    executable_path: "C:/Windows/System32/svchost.exe",
    signing_status: "signed_valid",
    product_name: "Microsoft Windows Operating System",
    company_name: "Microsoft Corporation",
    file_version: "10.0.22631.1",
    original_filename: "svchost.exe",
    signer_name: "CN=Microsoft Windows, O=Microsoft Corporation, L=Redmond, S=Washington, C=US",
    sha256: "e3a1b55d8a3279f2986a3f4cf2f705f1b4f4f13225131e40d5f706f1964ad3f0",
    ...overrides,
~~~