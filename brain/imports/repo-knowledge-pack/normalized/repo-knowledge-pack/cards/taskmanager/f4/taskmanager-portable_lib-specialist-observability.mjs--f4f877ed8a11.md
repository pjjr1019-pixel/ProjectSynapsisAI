---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/observability.mjs"
source_name: "observability.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 666
content_hash: "e12badbd15f0e9c065d3ff27b17b62f8624dbea6619d22c8bc63741cf5e4fc4b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./paths.mjs"
exports:
  - "elapsedMs"
  - "nowMs"
  - "SpecialistObservability"
---

# taskmanager/portable_lib/specialist/observability.mjs

> Code module; imports ./paths.mjs; exports elapsedMs, nowMs, SpecialistObservability

## Key Signals

- Source path: taskmanager/portable_lib/specialist/observability.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./paths.mjs
- Exports: elapsedMs, nowMs, SpecialistObservability

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/observability.mjs

## Excerpt

~~~javascript
import { appendJsonLine } from "./paths.mjs";

export function nowMs() {
  return Date.now();
}

export function elapsedMs(startMs) {
  return Math.max(0, Date.now() - Number(startMs || Date.now()));
}

export class SpecialistObservability {
  constructor({ paths }) {
    this.paths = paths;
  }

  writeEvent(event) {
    appendJsonLine(this.paths.specialistLogFile, {
      ts: new Date().toISOString(),
      ...event,
    });
  }
}
~~~