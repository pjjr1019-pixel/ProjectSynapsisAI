---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-ingestion-utils.mjs"
source_name: "brain-ingestion-utils.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 592
content_hash: "a2b6b221c2291fe7a910482f5cfda44680fa57493b1e7e3cd51305137a90fb70"
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
  - "./brain-provenance.mjs"
  - "./brain-runtime-layer.mjs"
  - "./brain-yaml.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "async"
  - "buildExternalDoc"
  - "ensureIngestionDirs"
  - "getIngestionPaths"
  - "importDestinationFor"
  - "isDuplicateAgainstImports"
  - "loadIngestionState"
  - "loadSiblingImportedDocs"
  - "promoteImportedDoc"
  - "quarantineArtifact"
---

# taskmanager/portable_lib/brain-ingestion-utils.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-provenance.mjs, ./brain-runtime-layer.mjs, ./brain-yaml.mjs; exports async, buildExternalDoc, ensureIngestionDirs, getIngestionPaths

## Key Signals

- Source path: taskmanager/portable_lib/brain-ingestion-utils.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-provenance.mjs, ./brain-runtime-layer.mjs, ./brain-yaml.mjs, node:fs, node:path
- Exports: async, buildExternalDoc, ensureIngestionDirs, getIngestionPaths, importDestinationFor, isDuplicateAgainstImports

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-ingestion-utils.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes, readJsonIfExists, sha256Text, writeJsonStable } from "./brain-build-utils.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { parseYaml } from "./brain-yaml.mjs";
import {
  exactContentHash,
  fetchRobotsAllowance,
  isNearDuplicate,
  resolveLicensePolicy,
  scanForPii,
} from "./brain-compliance.mjs";
import { buildExternalProvenance } from "./brain-provenance.mjs";

export function getIngestionPaths() {
  const brainRoot = getBrainRuntimePaths().brainRoot;
  const pipelineRoot = path.join(brainRoot, "pipeline");
  return {
    brainRoot,
    pipelineRoot,
    configPath: path.join(pipelineRoot, "ingestion-config.yaml"),
    rawRoot: path.join(pipelineRoot, "raw"),
    cleanRoot: path.join(pipelineRoot, "clean"),
    stateRoot: path.join(pipelineRoot, "state"),
    quarantineRoot: path.join(pipelineRoot, "quarantine"),
    ingestionStatePath: path.join(pipelineRoot, "state", "ingestion-state.jsonl"),
    importsLiveRoot: path.join(brainRoot, "imports", "live"),
    importsBulkRoot: path.join(brainRoot, "imports", "bulk"),
~~~