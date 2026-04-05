---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/shared/core.js"
source_name: "core.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 226
content_hash: "01014ac41ab2b35e8c497afd66436bb103a61bd2fc80dc2162d0dca5490d09c6"
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
  - "path"
---

# taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/shared/core.js

> Script surface; imports child_process, crypto, fs, path

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/shared/core.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 110
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: child_process, crypto, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/shared/core.js

## Excerpt

~~~javascript

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const registryPath = path.join(__dirname, '..', 'registry', 'tools_index.json');
const aliasPath = path.join(__dirname, '..', 'registry', 'tool_aliases.json');
const toolIndex = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const aliasIndex = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
const toolMap = Object.fromEntries(toolIndex.map(t => [t.id, t]));

const IGNORED_DIRS = new Set([
  'node_modules','.git','dist','build','out','coverage','.next','.nuxt','target','bin','obj',
  'venv','.venv','__pycache__','.cache','.turbo','.idea','.vscode','.gradle','.pytest_cache'
]);

const SOURCE_EXTS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.java','.go','.rs','.c','.cpp','.h','.hpp','.cs','.php','.rb','.sh','.ps1']);
const DOC_EXTS = new Set(['.md','.mdx','.txt','.rst','.adoc']);
const ASSET_EXTS = new Set(['.png','.jpg','.jpeg','.gif','.svg','.ico','.webp','.bmp','.tiff','.mp3','.wav','.mp4','.mov','.ttf','.woff','.woff2','.css','.scss','.less']);
const CONFIG_EXTS = new Set(['.json','.yaml','.yml','.toml','.ini','.cfg','.conf','.env','.lock']);
const TEXT_EXTS = new Set([...SOURCE_EXTS, ...DOC_EXTS, ...CONFIG_EXTS, '.csv','.xml','.html','.sql','.gitignore','.dockerignore','.npmrc','.editorconfig','.gitattributes','.properties']);
const STOP_WORDS = new Set(['this','that','with','from','have','your','into','then','than','they','them','were','will','would','there','their','about','after','before','when','while','what','which','where','who','why','how','just','also','more','most','some','such','only','each','many','much','very','make','made','does','done','doing','like','used','using','use','main','true','false','null','undefined','const','let','var','function','class','return','export','import']);

function parseArgValue(value) {
  if (value === undefined) return true;
  if (value === 'true') return true;
  if (value === 'false') return false;
~~~