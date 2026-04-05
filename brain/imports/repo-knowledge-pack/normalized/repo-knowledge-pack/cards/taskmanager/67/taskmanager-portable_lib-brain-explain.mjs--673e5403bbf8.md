---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-explain.mjs"
source_name: "brain-explain.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 590
content_hash: "ec9c7597778c4668212da05da170fe600db930c82b19558edb951449a90d2f11"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-ir-build.mjs"
  - "./brain-retrieval.mjs"
  - "./brain-runtime-layer.mjs"
exports:
  - "explainDoc"
  - "explainProfile"
  - "formatHumanTrace"
---

# taskmanager/portable_lib/brain-explain.mjs

> Code module; imports ./brain-ir-build.mjs, ./brain-retrieval.mjs, ./brain-runtime-layer.mjs; exports explainDoc, explainProfile, formatHumanTrace

## Key Signals

- Source path: taskmanager/portable_lib/brain-explain.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-ir-build.mjs, ./brain-retrieval.mjs, ./brain-runtime-layer.mjs
- Exports: explainDoc, explainProfile, formatHumanTrace

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-explain.mjs

## Excerpt

~~~javascript
import { inspectProfileArtifacts } from "./brain-ir-build.mjs";
import { getProfileConfig } from "./brain-retrieval.mjs";
import { loadNormalizedDoc } from "./brain-runtime-layer.mjs";

export function explainDoc(docId) {
  const doc = loadNormalizedDoc(docId);
  if (!doc) return null;
  return {
    docId,
    app: doc.app,
    domain: doc.domain,
    title: doc.title,
    moduleIds: doc.moduleIds || [],
    sourceType: doc.provenance?.sourceType || "canonical",
    status: doc.status,
    confidence: doc.confidence,
    path: doc.path,
    facts: (doc.facts || []).slice(0, 5).map((fact) => ({
      factId: fact.factId,
      text: fact.text,
      charStart: fact.charStart,
      charEnd: fact.charEnd,
    })),
    aliases: (doc.aliases || []).slice(0, 10),
    rules: (doc.rules || []).slice(0, 5),
    headings: (doc.headings || []).slice(0, 8),
    summary: doc.summary,
    provenance: doc.provenance,
~~~