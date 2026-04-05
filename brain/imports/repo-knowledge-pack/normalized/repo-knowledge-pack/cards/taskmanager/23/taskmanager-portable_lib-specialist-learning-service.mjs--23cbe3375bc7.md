---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/learning-service.mjs"
source_name: "learning-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 664
content_hash: "e0eaf190d5abc83a484311912501f0178385ad195cc8ef68e28787a1323962a7"
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
  - "SpecialistLearningService"
---

# taskmanager/portable_lib/specialist/learning-service.mjs

> Code module; imports ./paths.mjs; exports SpecialistLearningService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/learning-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./paths.mjs
- Exports: SpecialistLearningService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/learning-service.mjs

## Excerpt

~~~javascript
import { readJsonFile, writeJsonFile } from "./paths.mjs";

export class SpecialistLearningService {
  constructor({ paths }) {
    this.paths = paths;
    this.state = readJsonFile(paths.specialistLearningFile, {
      version: 1,
      updatedAt: null,
      events: [],
      scriptScores: {},
      phraseMap: {},
    });
  }

  save() {
    this.state.updatedAt = new Date().toISOString();
    if (this.state.events.length > 400) {
      this.state.events = this.state.events.slice(-400);
    }
    writeJsonFile(this.paths.specialistLearningFile, this.state);
  }

  getState() {
    return this.state;
  }

  record(event) {
    const normalized = {
~~~