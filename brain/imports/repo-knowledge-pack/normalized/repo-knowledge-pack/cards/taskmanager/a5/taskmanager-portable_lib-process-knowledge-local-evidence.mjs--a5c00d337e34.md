---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-local-evidence.mjs"
source_name: "process-knowledge-local-evidence.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 618
content_hash: "75dbf67420242a984557dd143a869ae0e55e025bd1889e83e070b547a4f97b7d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./optimizer-telemetry.mjs"
  - "./process-knowledge-identity.mjs"
  - "node:child_process"
  - "node:crypto"
  - "node:fs"
  - "node:os"
exports:
  - "collectLocalEvidence"
---

# taskmanager/portable_lib/process-knowledge-local-evidence.mjs

> Code module; imports ./optimizer-telemetry.mjs, ./process-knowledge-identity.mjs, node:child_process, node:crypto; exports collectLocalEvidence

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-local-evidence.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./optimizer-telemetry.mjs, ./process-knowledge-identity.mjs, node:child_process, node:crypto, node:fs, node:os
- Exports: collectLocalEvidence

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-local-evidence.mjs

## Excerpt

~~~javascript
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

import { getLatestOsSnapshot } from "./optimizer-telemetry.mjs";
import { buildProcessKnowledgeIdentity } from "./process-knowledge-identity.mjs";

function toText(value) {
  return String(value ?? "").trim();
}

function uniqueNumbers(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isFinite(value) && value > 0))];
}

function escapePsSingleQuoted(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function runPowerShellJson(script) {
  if (process.platform !== "win32") return {};
  const encoded = Buffer.from(`${script}\n`, "utf16le").toString("base64");
  try {
    const stdout = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      {
~~~