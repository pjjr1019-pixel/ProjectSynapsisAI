---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-arbitration.mjs"
source_name: "brain-arbitration.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 577
content_hash: "29bc0eacf80c48d5b9acf7bc5c29b19779b2ef85170f13afbe2bd064f9ec8f68"
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
  - "arbitrateBrainCandidates"
  - "getArtifactPriority"
  - "getSourcePriority"
  - "scoreBrainCandidate"
---

# taskmanager/portable_lib/brain-arbitration.mjs

> Code module; imports ./brain-build-utils.mjs; exports arbitrateBrainCandidates, getArtifactPriority, getSourcePriority, scoreBrainCandidate

## Key Signals

- Source path: taskmanager/portable_lib/brain-arbitration.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs
- Exports: arbitrateBrainCandidates, getArtifactPriority, getSourcePriority, scoreBrainCandidate

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-arbitration.mjs

## Excerpt

~~~javascript
import { compareStrings } from "./brain-build-utils.mjs";

const SOURCE_PRIORITIES = {
  canonical: 1.0,
  runtime: 0.96,
  web: 0.66,
  import: 0.72,
  draft: 0.48,
  memory: 0.42,
  unknown: 0.35,
};

const ARTIFACT_PRIORITIES = {
  quick_intent: 1.0,
  recent_prompt: 1.0,
  calculator: 0.99,
  recent_digest: 1.0,
  dictionary: 0.98,
  scenario: 0.95,
  compact_fact: 0.88,
  summary: 0.8,
  learned: 0.76,
  chunk: 0.74,
  fallback: 0.1,
  clarification: 0.08,
  idk: 0.06,
};
~~~