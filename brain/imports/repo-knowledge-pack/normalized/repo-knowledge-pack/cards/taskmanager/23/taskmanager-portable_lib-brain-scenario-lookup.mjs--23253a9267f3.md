---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-scenario-lookup.mjs"
source_name: "brain-scenario-lookup.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 576
content_hash: "eeadbce31e440da99bb799ec70ec66c1d7fbdcaa169a974cb9756556de9404b1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-retrieval.mjs"
  - "aho-corasick"
  - "node:fs"
  - "node:module"
  - "node:path"
exports:
  - "isScenarioExcluded"
  - "loadScenarioIndexPayload"
  - "lookupScenario"
  - "lookupScenarioCandidates"
  - "lookupScenarioMatch"
  - "shortTriggerBoundaryOk"
---

# taskmanager/portable_lib/brain-scenario-lookup.mjs

> Code module; imports ./brain-retrieval.mjs, aho-corasick, node:fs, node:module; exports isScenarioExcluded, loadScenarioIndexPayload, lookupScenario, lookupScenarioCandidates

## Key Signals

- Source path: taskmanager/portable_lib/brain-scenario-lookup.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-retrieval.mjs, aho-corasick, node:fs, node:module, node:path
- Exports: isScenarioExcluded, loadScenarioIndexPayload, lookupScenario, lookupScenarioCandidates, lookupScenarioMatch, shortTriggerBoundaryOk

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-scenario-lookup.mjs

## Excerpt

~~~javascript
/**
 * Fast offline scenario lookup using Aho–Corasick + tie-breaking.
 * Loads brain/apps/assistant/knowledge/scenarios/build/scenario-index.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getRepoRoot } from "./brain-retrieval.mjs";
import {
  expandQueryWithSemanticMap,
  loadProfileScenarioMap,
  loadRuntimeScenarioLookup,
} from "./brain-runtime-layer.mjs";

const require = createRequire(import.meta.url);
const AhoCorasick = require("aho-corasick");

const SHORT_TRIGGER_MAX = 3;

function scenarioIndexPath() {
  return path.join(
    getRepoRoot(),
    "brain",
    "apps",
    "assistant",
    "knowledge",
    "scenarios",
    "build",
~~~