---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-paths.mjs"
source_name: "process-knowledge-paths.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 619
content_hash: "5f8583097b5ce8295b9902d43b7b22357d6ba7f10ccd983940db863d52dee473"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./taskmanager-paths.mjs"
  - "node:path"
exports:
  - "brainRoot"
  - "getProcessKnowledgePath"
  - "getProcessKnowledgePaths"
  - "processKnowledgeFileNames"
  - "processKnowledgeRoot"
  - "repoRoot"
---

# taskmanager/portable_lib/process-knowledge-paths.mjs

> Code module; imports ./taskmanager-paths.mjs, node:path; exports brainRoot, getProcessKnowledgePath, getProcessKnowledgePaths, processKnowledgeFileNames

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-paths.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./taskmanager-paths.mjs, node:path
- Exports: brainRoot, getProcessKnowledgePath, getProcessKnowledgePaths, processKnowledgeFileNames, processKnowledgeRoot, repoRoot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-paths.mjs

## Excerpt

~~~javascript
import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();

export const repoRoot = taskmanagerPaths.taskmanagerRoot;
export const brainRoot = taskmanagerPaths.brain.root;
export const processKnowledgeRoot = path.join(brainRoot, "processes");

export const processKnowledgeFileNames = Object.freeze({
  index: "INDEX.md",
  lookup: "LOOKUP.json",
  seenRegistry: "SEEN_REGISTRY.json",
  pendingEnrichment: "PENDING_ENRICHMENT.json",
  searchIndex: "SEARCH_INDEX.json",
});

export function getProcessKnowledgePaths() {
  return {
    repoRoot,
    brainRoot,
    processKnowledgeRoot,
    indexPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.index),
    lookupPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.lookup),
    seenRegistryPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.seenRegistry),
    pendingEnrichmentPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.pendingEnrichment),
    searchIndexPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.searchIndex),
  };
~~~