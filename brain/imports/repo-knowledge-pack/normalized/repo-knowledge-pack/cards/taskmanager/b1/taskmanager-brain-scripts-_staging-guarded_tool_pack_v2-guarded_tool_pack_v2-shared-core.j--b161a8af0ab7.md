---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/shared/core.js"
source_name: "core.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 360
content_hash: "5494448cbe356e7b1ce1e7e5a024e9ff9f659fb475fca17eefa67d7169df6c8e"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "child_process"
  - "crypto"
  - "fs"
  - "os"
  - "path"
---

# taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/shared/core.js

> Script surface; imports child_process, crypto, fs, os

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/shared/core.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: child_process, crypto, fs, os, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/shared/core.js

## Excerpt

~~~javascript

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const cp = require('child_process');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const playbookPath = path.join(__dirname, '..', 'registry', 'playbooks.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const playbooks = JSON.parse(fs.readFileSync(playbookPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));
const playbookMap = Object.fromEntries(playbooks.map(p => [p.id, p]));

const CRITICAL_PROCESS_NAMES = new Set([
  'system','system idle process','idle','registry','smss.exe','csrss.exe','wininit.exe','services.exe',
  'lsass.exe','winlogon.exe','fontdrvhost.exe','dwm.exe','svchost.exe','explorer.exe','spoolsv.exe',
  'init','systemd','launchd','kernel_task','loginwindow','sshd'
]);
const BACKGROUND_LIKE_PATTERNS = [
  /helper/i,/update/i,/updater/i,/service/i,/tray/i,/agent/i,/runtime/i,/watcher/i,/daemon/i,/host/i
];

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
~~~