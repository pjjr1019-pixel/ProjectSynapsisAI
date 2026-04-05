---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/code-specialist-service.mjs"
source_name: "code-specialist-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 660
content_hash: "9ee618725940ac860fcc3f3ab26a0ebae4bd8d6a2f0bcaf5319855962068a16d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./manifest.mjs"
  - "./paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "CodeSpecialistService"
---

# taskmanager/portable_lib/specialist/code-specialist-service.mjs

> Code module; imports ./manifest.mjs, ./paths.mjs, node:fs, node:path; exports CodeSpecialistService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/code-specialist-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./manifest.mjs, ./paths.mjs, node:fs, node:path
- Exports: CodeSpecialistService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/code-specialist-service.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { normalizeScriptManifest } from "./manifest.mjs";
import { writeJsonFile } from "./paths.mjs";

export class CodeSpecialistService {
  constructor({ paths, codeSpecialistProvider }) {
    this.paths = paths;
    this.codeSpecialistProvider = codeSpecialistProvider;
  }

  async warm() {
    return this.codeSpecialistProvider.warm();
  }

  async propose({ request, candidates, approval = false }) {
    const proposal = await this.codeSpecialistProvider.propose({ request, candidates });
    return {
      requires_approval: true,
      approved: approval === true,
      proposal,
    };
  }

  createScriptFromProposal({ proposal, createdBy = "specialist" }) {
    fs.mkdirSync(this.paths.newSkillsRoot, { recursive: true });
    const safeName = String(proposal?.title || "new-specialist-script")
      .toLowerCase()
~~~