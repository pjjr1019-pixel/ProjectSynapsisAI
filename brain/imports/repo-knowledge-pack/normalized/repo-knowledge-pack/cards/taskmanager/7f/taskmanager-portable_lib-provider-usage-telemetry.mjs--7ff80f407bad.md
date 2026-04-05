---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/provider-usage-telemetry.mjs"
source_name: "provider-usage-telemetry.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 659
content_hash: "93387b4b8dda32bfb4280430a5ba7b1a24923976b5aafaf87b0891b8cb910d06"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "node:process"
exports:
  - "getProviderUsageSnapshot"
  - "listProviderUsageSnapshots"
  - "recordProviderFailure"
  - "recordProviderSuccess"
  - "resetProviderUsageTelemetry"
---

# taskmanager/portable_lib/provider-usage-telemetry.mjs

> Code module; imports node:process; exports getProviderUsageSnapshot, listProviderUsageSnapshots, recordProviderFailure, recordProviderSuccess

## Key Signals

- Source path: taskmanager/portable_lib/provider-usage-telemetry.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: node:process
- Exports: getProviderUsageSnapshot, listProviderUsageSnapshots, recordProviderFailure, recordProviderSuccess, resetProviderUsageTelemetry

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/provider-usage-telemetry.mjs

## Excerpt

~~~javascript
import process from "node:process";

const providerStates = new Map();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return toText(headers.get(name));
  }
  if (typeof headers === "object" && headers !== null) {
    return toText(headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()]);
  }
  return "";
}

function parseResetAt(value) {
  const raw = toText(value);
  if (!raw) return null;
  const numeric = toNumber(raw);
~~~