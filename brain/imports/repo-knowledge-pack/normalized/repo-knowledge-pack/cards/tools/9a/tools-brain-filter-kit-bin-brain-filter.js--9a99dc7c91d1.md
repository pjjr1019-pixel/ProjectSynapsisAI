---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/bin/brain-filter.js"
source_name: "brain-filter.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 22
selected_rank: 3398
content_hash: "35056d66a058aa3a511a6b8a76000e1e4d375d33fc657603582a82ce401afd00"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
  - "tools"
imports:
  - "../src/commands/build-corpus"
  - "../src/commands/dedupe"
  - "../src/commands/inventory"
  - "../src/commands/report"
  - "../src/commands/score"
  - "../src/commands/top-docs"
  - "../src/utils"
  - "path"
---

# tools/brain-filter-kit/bin/brain-filter.js

> Code module; imports ../src/commands/build-corpus, ../src/commands/dedupe, ../src/commands/inventory, ../src/commands/report

## Key Signals

- Source path: tools/brain-filter-kit/bin/brain-filter.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 22
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../src/commands/build-corpus, ../src/commands/dedupe, ../src/commands/inventory, ../src/commands/report, ../src/commands/score, ../src/commands/top-docs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/bin/brain-filter.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require("path");
const { loadConfig, ensureDir, relPathFromRoot, printUsage } = require("../src/utils");
const inventory = require("../src/commands/inventory");
const score = require("../src/commands/score");
const dedupe = require("../src/commands/dedupe");
const build = require("../src/commands/build-corpus");
const report = require("../src/commands/report");
const top = require("../src/commands/top-docs");

async function main() {
  const command = process.argv[2];
  const configArgIndex = process.argv.indexOf("--config");
  const configPath = configArgIndex >= 0 ? process.argv[configArgIndex + 1] : path.resolve(process.cwd(), "brain-filter.config.json");
  const config = loadConfig(configPath);

  if (!command || ["-h", "--help", "help"].includes(command)) {
    printUsage();
    return;
  }

  const ctx = {
    cwd: process.cwd(),
    configPath,
    config,
    rootAbs: path.resolve(process.cwd(), config.rootDir),
    outAbs: path.resolve(process.cwd(), config.outputDir)
  };
~~~