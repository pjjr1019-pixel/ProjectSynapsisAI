---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/shared/core.js"
source_name: "core.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 467
content_hash: "2d91ed247926eba02beec2a463d484fca7e503ecc1292063fb81bb8bcf964ca1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "crypto"
  - "fs"
  - "path"
---

# taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/shared/core.js

> Script surface; imports crypto, fs, path

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/shared/core.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: crypto, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/shared/core.js

## Excerpt

~~~javascript

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try { return JSON.parse(value); } catch (_) {}
  }
  return value;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
~~~