---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/paths.mjs"
source_name: "paths.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 668
content_hash: "10cdb18b96a799b5946f3a9ca1ba85a84dc5afa7ab5561c6c33968de4c4b7ad5"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "../taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "appendJsonLine"
  - "ensureParentDir"
  - "getSpecialistPaths"
  - "readJsonFile"
  - "writeJsonFile"
---

# taskmanager/portable_lib/specialist/paths.mjs

> Code module; imports ../taskmanager-paths.mjs, node:fs, node:path; exports appendJsonLine, ensureParentDir, getSpecialistPaths, readJsonFile

## Key Signals

- Source path: taskmanager/portable_lib/specialist/paths.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ../taskmanager-paths.mjs, node:fs, node:path
- Exports: appendJsonLine, ensureParentDir, getSpecialistPaths, readJsonFile, writeJsonFile

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/paths.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "../taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const TASKMANAGER_ROOT = taskmanagerPaths.taskmanagerRoot;
const BRAIN_ROOT = taskmanagerPaths.brain.root;

export function getSpecialistPaths() {
  const specialistRoot = taskmanagerPaths.brain.generated.runtime.specialistRoot;
  const indexRoot = taskmanagerPaths.brain.generated.runtime.specialistIndexRoot;
  const logsRoot = taskmanagerPaths.brain.generated.runtime.specialistLogsRoot;
  const scriptsRoot = path.join(BRAIN_ROOT, "scripts");
  const registryRoot = path.join(scriptsRoot, "registry");
  const newSkillsRoot = path.join(scriptsRoot, "new-skills");

  return {
    taskmanagerRoot: TASKMANAGER_ROOT,
    brainRoot: BRAIN_ROOT,
    scriptsRoot,
    registryRoot,
    newSkillsRoot,
    specialistRoot,
    indexRoot,
    logsRoot,
    toolsIndexFile: path.join(registryRoot, "tools_index.json"),
    toolAliasesFile: path.join(registryRoot, "tool_aliases.json"),
    scriptManifestSchemaFile: path.join(registryRoot, "script_manifest.schema.json"),
~~~