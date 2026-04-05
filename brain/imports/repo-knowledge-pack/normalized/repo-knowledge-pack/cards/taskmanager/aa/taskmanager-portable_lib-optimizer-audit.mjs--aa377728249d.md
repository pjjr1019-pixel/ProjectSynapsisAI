---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-audit.mjs"
source_name: "optimizer-audit.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 651
content_hash: "f00ac284339188f378e907826d4398664d8739f4fedb3145dca169f2da411980"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "node:fs"
  - "node:path"
  - "node:url"
exports:
  - "closeAuditLog"
  - "getAuditSummary"
  - "getRecentAuditEvents"
  - "incrementAuditTick"
  - "writeAuditEvent"
---

# taskmanager/portable_lib/optimizer-audit.mjs

> Code module; imports node:fs, node:path, node:url; exports closeAuditLog, getAuditSummary, getRecentAuditEvents, incrementAuditTick

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-audit.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: node:fs, node:path, node:url
- Exports: closeAuditLog, getAuditSummary, getRecentAuditEvents, incrementAuditTick, writeAuditEvent

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-audit.mjs

## Excerpt

~~~javascript
﻿/**
 * Optimizer Audit Log
 *
 * Every optimizer action, recommendation, health check, rollback, and safety violation
 * is recorded to a daily rotating JSONL file:
 *   brain/runtime/logs/optimizer/optimizer-audit-YYYY-MM-DD.jsonl
 *
 * Rules:
 * - Write before act: audit entry is created before the action executes
 * - Write-only during normal operation: entries are never deleted
 * - Daily rotation: new file per calendar day
 * - 7-day retention (archival only â€” never purge)
 * - In-memory ring buffer of last 200 events for fast UI access
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOG_DIR = path.join(__dirname, "../brain/runtime/logs/optimizer");
const RING_BUFFER_SIZE = 200;
~~~