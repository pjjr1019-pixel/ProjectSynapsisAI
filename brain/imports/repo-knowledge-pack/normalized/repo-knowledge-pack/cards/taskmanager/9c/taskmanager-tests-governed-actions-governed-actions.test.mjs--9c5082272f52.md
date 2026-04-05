---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/tests/governed-actions/governed-actions.test.mjs"
source_name: "governed-actions.test.mjs"
top_level: "taskmanager"
surface: "tests"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 38
selected_rank: 3383
content_hash: "63eea39ab6b8cf9fbe875fde258ddab0ee9a6cd48afdbfa7a158055131102be2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
  - "tests"
imports:
  - "node:assert/strict"
  - "node:fs"
  - "node:os"
  - "node:path"
  - "node:test"
---

# taskmanager/tests/governed-actions/governed-actions.test.mjs

> Code module; imports node:assert/strict, node:fs, node:os, node:path

## Key Signals

- Source path: taskmanager/tests/governed-actions/governed-actions.test.mjs
- Surface: tests
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 38
- Tags: code, mjs, neutral, scripts, tests
- Imports: node:assert/strict, node:fs, node:os, node:path, node:test

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, mjs, neutral, scripts, taskmanager, tests
- Source link target: taskmanager/tests/governed-actions/governed-actions.test.mjs

## Excerpt

~~~javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  approveGovernedApproval,
  declineGovernedApproval,
  executeGovernedPlanDirect,
  getGovernedActionContracts,
  getPendingGovernedApprovals,
  rollbackGovernedRun,
  tryHandleGovernedChatRequest,
} from "../../portable_lib/governed-actions.mjs";

function withTemporaryEnv(patch, callback) {
  const previous = new Map();
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
~~~