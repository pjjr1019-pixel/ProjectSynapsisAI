---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/execution-service.mjs"
source_name: "execution-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 663
content_hash: "03ea5e7239ac67aeb172ac4bb843f0c3056eff950aef1b75ffb68471f3e60e46"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./paths.mjs"
  - "node:child_process"
  - "node:path"
exports:
  - "ScriptExecutionService"
---

# taskmanager/portable_lib/specialist/execution-service.mjs

> Code module; imports ./paths.mjs, node:child_process, node:path; exports ScriptExecutionService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/execution-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./paths.mjs, node:child_process, node:path
- Exports: ScriptExecutionService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/execution-service.mjs

## Excerpt

~~~javascript
import { spawn } from "node:child_process";
import path from "node:path";
import {
  EXECUTION_MODES,
  SCRIPT_POLICY_CLASS,
} from "./contracts.mjs";
import { appendJsonLine } from "./paths.mjs";

function sanitizeValue(value) {
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = String(value || "").trim();
  if (!text) return "";
  if (/[;&|><`]/.test(text)) {
    throw new Error("Unsafe argument detected.");
  }
  return text;
}

function validateArgs(inputs, args) {
  const out = {};
  const schema = inputs && typeof inputs === "object" ? inputs : {};
  for (const [name, definition] of Object.entries(schema)) {
    const input = args?.[name];
    if (input === undefined || input === null || input === "") {
      if (definition?.default !== undefined) out[name] = definition.default;
      continue;
    }
    if (definition?.type === "number") {
~~~