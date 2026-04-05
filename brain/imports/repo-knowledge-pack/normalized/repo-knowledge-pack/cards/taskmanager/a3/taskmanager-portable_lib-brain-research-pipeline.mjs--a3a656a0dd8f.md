---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-research-pipeline.mjs"
source_name: "brain-research-pipeline.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 606
content_hash: "b54287361168cfa511de822ab9796e9b99ecab624e9771d3f2aacbf1c3b2d038"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-layer.mjs"
  - "./brain-yaml.mjs"
  - "node:child_process"
  - "node:fs"
  - "node:path"
exports:
  - "extractResearchArtifacts"
  - "getResearchPipelinePaths"
  - "ingestResearchReport"
  - "listResearchIntakeRecords"
---

# taskmanager/portable_lib/brain-research-pipeline.mjs

> Code module; imports ./brain-runtime-layer.mjs, ./brain-yaml.mjs, node:child_process, node:fs; exports extractResearchArtifacts, getResearchPipelinePaths, ingestResearchReport, listResearchIntakeRecords

## Key Signals

- Source path: taskmanager/portable_lib/brain-research-pipeline.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-layer.mjs, ./brain-yaml.mjs, node:child_process, node:fs, node:path
- Exports: extractResearchArtifacts, getResearchPipelinePaths, ingestResearchReport, listResearchIntakeRecords

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-research-pipeline.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  normalizeSlashes,
  readJsonIfExists,
  sha256File,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const PATHS = (() => {
  const brainRoot = getBrainRuntimePaths().brainRoot;
  const pipelineRoot = path.join(brainRoot, "pipeline");
  const researchRoot = path.join(pipelineRoot, "research");
  return {
    brainRoot,
    pipelineRoot,
    researchRoot,
    intakeRoot: path.join(researchRoot, "intake"),
    processedRoot: path.join(researchRoot, "processed"),
    failedRoot: path.join(researchRoot, "failed"),
    quarantineRoot: path.join(researchRoot, "quarantine"),
~~~