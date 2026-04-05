---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/.ai_repo/context-pack-generate-a-focus-map.json"
source_name: "context-pack-generate-a-focus-map.json"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 12
selected_rank: 4441
content_hash: "2c01b1416042d941643e60a3f03f09819697f5ed79487eedf27b978feb9a06cf"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "json"
  - "neutral"
  - "source"
imports:
  - "../lib/common"
  - "fs"
  - "path"
---

# taskmanager/.ai_repo/context-pack-generate-a-focus-map.json

> JSON data file; imports ../lib/common, fs, path

## Key Signals

- Source path: taskmanager/.ai_repo/context-pack-generate-a-focus-map.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 12
- Tags: json, neutral, source
- Imports: ../lib/common, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: json, neutral, source, taskmanager
- Source link target: taskmanager/.ai_repo/context-pack-generate-a-focus-map.json

## Excerpt

~~~json
{
  "generated": "2026-04-01T05:43:47.511Z",
  "repoRoot": "/mnt/data/repo_token_saver_pack",
  "task": "generate a focus map",
  "files": [
    {
      "path": "scripts/01-generate-focus-map.js",
      "score": 38,
      "className": "neutral",
      "excerpt": "const path = require('path');\nconst {\n  parseArgs, detectRepoRoot, loadConfig, listAllEntries, outputDir, ensureDir,\n  writeRepoFile, classifyPath, collectDirectoryFileCounts, nowIso\n} = require('../lib/common');\n\nconst args = parseArgs(process.argv);\nconst repoRoot = detectRepoRoot(args);\nconst config = loadConfig();\nconst { entries, unreadable } = listAllEntries(repoRoot);\nconst files = entries.filter((entry) => entry.type === 'file');\nconst dirs = entries.filter((entry) => entry.type === 'directory');\nconst dirFileCounts = collectDirectoryFileCounts(entries);\n\nconst highValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'high-value');\nconst docsFiles = files.filter((file) => classifyPath(file.rel, config) === 'docs');\nconst generatedFiles = files.filter((file) => classifyPath(file.rel, config) === 'generated');\nconst lowValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'low-value');\nconst neutralFiles = files.filter((file) => classifyPath(file.rel, config) === 'neutral');\n\nconst directorySummary = dirs\n  .filter((dir) => dir.rel !== '.')\n  .map((dir) => ({\n    rel: dir.rel,\n    files: dirFileCounts.get(dir.rel) || 0,\n    className: classifyPath(dir.rel, config)\n  }))\n  .filter((dir) => dir.files > 0)\n  .sort((a, b) => b.files - a.files || a.rel.localeCompare(b.rel));\n\nconst lines = [];\nlines.push('# Focus Map');\nlines.push('');\nlines.push(`Generated: ${nowIso()}`);\nlines.push(`Repo root: \\`${repoRoot}\\``);\nlines.push('');\nlines.push('## Why this exists');\nlines.push('');\nlines.push('This report is designed to keep coding models from spending tokens in the wrong places first.');\nlines.push('It identifies the smallest set of folders and files that should usually be read first,');\nlines.push('and the heavy generated/runtime areas that should usually be skipped on pass one.');\nlines.push('');\nlines.push('## Snapshot');\nlines.push('');\nlines.push(`- Total files: **${files.length}**`);\nlines.push(`- Total folders: **${dirs.length - 1}**`);\nlines.push(`- High-value files: **${highValueFiles.length}**`);\nlines.push(`- Docs / guidance files: **${docsFiles.length}**`);\nlines.push(`- Generated files: **${generatedFiles.length}**`);\nlines.push(`- Low-value files: **${lowValueFiles.length}**`);\nlines.push(`- Neutral files: **${neutralFiles.length}**`);\nlines.push(`- Unreadable paths: **${unreadable.length}**`);\nlines.push('');\nlines.push('## Recommended first-read files');\nlines.push('');\nfor (const rel of config.defaultTaskReadOrder) {\n  lines.push(`- \\`${rel}\\``);\n}\nlines.push('');\nlines.push('## High-value prefixes');\nlines.push('');\nfor (const prefix of config.highValuePrefixes) {\n  lines.push(`- \\`${prefix}\\``);\n}\nlines.push('');\nlines.push('## De-prioritize on first pass');\nlines.push('');\nfor (const prefix of config.lowValuePrefixes) {\n  lines.push(`- \\`${prefix}\\``);\n}\nlines.push('');\nlines.push('## Largest directories by contained file count');\nlines.push('');\nfor (const row of directorySummary.slice(0, 25)) {\n  lines.push(`- \\`${row.rel}\\` — ${row.files} files — ${row.className}`);\n}\nlines.push('');\nlines.push('## Repo-specific reading strategy');\nlines.push('');\nlines.push('1. Read compact source-of-truth docs and entrypoints first.');\nlines.push('2. Read UI / server / shared / desktop / portable_lib code next.');\nlines.push('3. Only enter brain runtime, retrieval indexes, normalized docs, LanceDB, eval history, or node_modules if the task explicitly depends on them.');\nlines.push('4. When a task touches “brain” logic, prefer `taskmanager/brain/core/` and `taskmanager/portable_lib/` before runtime artifacts.');\nlines.push('');\nif (unreadable.length) {\n  lines.push('## Unreadable paths');\n  lines.push('');\n  for (const item of unreadable) lines.push(`- \\`${item.path}\\` — ${item.error}`);\n  lines.push('');\n}\n\nensureDir(outputDir(repoRoot));\nconst outputPath = writeRepoFile(repoRoot, '.ai_repo/focus-map.md', lines.join('\\n'));\nconsole.log(`Wrote ${outputPath}`);\n"
    },
    {
      "path": "scripts/02-generate-heavy-path-report.js",
      "score": 18,
      "className": "neutral",
      "excerpt": "const {\n  parseArgs, detectRepoRoot, loadConfig, listAllEntries, collectDirectoryFileCounts,\n  writeRepoFile, nowIso, classifyPath\n} = require('../lib/common');\n\nconst args = parseArgs(process.argv);\nconst repoRoot = detectRepoRoot(args);\nconst config = loadConfig();\nconst { entries } = listAllEntries(repoRoot);\nconst files = entries.filter((entry) => entry.type === 'file');\nconst dirs = entries.filter((entry) => entry.type === 'directory' && entry.rel !== '.');\nconst dirFileCounts = collectDirectoryFileCounts(entries);\n\nconst sizeMap = new Map();\nfor (const dir of dirs) sizeMap.set(dir.rel, 0);\nfor (const file of files) {\n  const parts = file.rel.split('/');\n  let current = '.';\n  for (let i = 0; i < parts.length - 1; i += 1) {\n    current = current === '.' ? parts[i] : `${current}/${parts[i]}`;\n    sizeMap.set(current, (sizeMap.get(current) || 0) + file.size);\n  }\n}\n\nconst rows = dirs.map((dir) => ({\n  rel: dir.rel,\n  files: dirFileCounts.get(dir.rel) || 0,\n  bytes: sizeMap.get(dir.rel) || 0,\n  className: classifyPath(dir.rel, config)\n}))\n.filter((row) => row.files > 0)\n.sort((a, b) => b.files - a.files || b.bytes - a.bytes || a.rel.localeCompare(b.rel));\n\nconst lines = [];\nlines.push('# Heavy Path Report');\nlines.push('');\nlines.push(`Generated: ${nowIso()}`);\nlines.push(`Repo root: \\`${repoRoot}\\``);\nlines.push('');\nlines.push('These are the folders most likely to waste tokens if a coding model reads them too early.');\nlines.push('');\nlines.push('| Directory | Files | Approx bytes | Class |');\nlines.push('|---|---:|---:|---|');\nfor (const row of rows.slice(0, config.reports.maxHeavyDirectories)) {\n  lines.push(`| \\`${row.rel}\\` | ${row.files} | ${row.bytes} | ${row.className} |`);\n}\nlines.push('');\nlines.push('## Suggested default excludes');\nlines.push('');\nfor (const prefix of config.lowValuePrefixes) {\n  lines.push(`- \\`${prefix}\\``);\n}\nlines.push('');\nlines.push('## When to override the excludes');\nlines.push('');\nlines.push('- Open generated/runtime/index folders only when the task is explicitly about retrieval artifacts, runtime snapshots, evaluation output, or packaging output.');\nlines.push('- Open `dist/` only for packaged build debugging or comparing emitted output.');\nlines.push('- Open `node_modules/` only if the task is dependency archaeology or vendor-level debugging.');\nlines.push('');\n\nconst outputPath = writeRepoFile(repoRoot, '.ai_repo/heavy-paths.md', lines.join('\\n'));\nconsole.log(`Wrote ${outputPath}`);\n"
    },
    {
      "path": "scripts/03-generate-duplicate-name-report.js",
      "score": 18,
      "className": "neutral",
      "excerpt": "const path = require('path');\nconst {\n  parseArgs, detectRepoRoot, loadConfig, listAllEntries, groupBy, writeRepoFile, nowIso\n} = require('../lib/common');\n\nfunction stem(name) {\n  return name\n    .toLowerCase()\n    .replace(/\\.(d\\.)?(tsx?|jsx?|mjs|cjs|mts|cts|json|jsonl|md|txt|css|html?)$/i, '')\n    .replace(/[-_.]/g, '');\n}\n\nconst args = parseArgs(process.argv);\nconst repoRoot = detectRepoRoot(args);\nconst config = loadConfig();\nconst { entries } = listAllEntries(repoRoot);\nconst files = entries.filter((entry) => entry.type === 'file');\n\nconst byName = groupBy(files, (file) => file.name.toLowerCase());\nconst byStem = groupBy(files, (file) => stem(file.name));\n\nconst exactDupes = [...byName.entries()]\n  .filter(([, group]) => group.length > 1)\n  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));\n\nconst stemDupes = [...byStem.entries()]\n  .filter(([, group]) => group.length > 1)\n  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));\n\nconst lines = [];\nlines.push('# Duplicate / Confusable Name Report');\nlines.push('');\nlines.push(`Generated: ${nowIso()}`);\nlines.push(`Repo root: \\`${repoRoot}\\``);\nlines.push('');\nlines.push('This report helps reduce wrong-file edits by surfacing repeated or confusable names.');\nlines.push('');\nlines.push('## Exact duplicate file names');\nlines.push('');\nfor (const [name, group] of exactDupes.slice(0, config.reports.maxDuplicateGroups)) {\n  lines.push(`### ${name}`);\n  for (const item of group.sort((a, b) => a.rel.localeCompare(b.rel))) {\n    lines.push(`- \\`${item.rel}\\``);\n  }\n  lines.push('');\n}\nlines.push('## Stem-level confusable groups');\nlines.push('');\nfor (const [name, group] of stemDupes.slice(0, config.reports.maxDuplicateGroups)) {\n  lines.push(`### ${name}`);\n  for (const item of group.sort((a, b) => a.rel.localeCompare(b.rel))) {\n    lines.push(`- \\`${item.rel}\\``);\n  }\n  lines.push('');\n}\nlines.push('## Practical use');\nlines.push('');\nlines.push('- Before editing a file, search this report for its basename.');\nlines.push('- If the same or similar name appears in `src/`, `server/`, `portable_lib/`, and `dist/`, prefer the source directory first.');\nlines.push('- If a file exists in both runtime artifacts and source folders, treat the runtime artifact as output until proven otherwise.');\nlines.push('');\n\nconst outputPath = writeRepoFile(repoRoot, '.ai_repo/duplicate-name-report.md', lines.join('\\n'));\nconsole.log(`Wrote ${outputPath}`);\n"
    },
    {
      "path": "scripts/04-generate-import-hubs.js",
      "score": 18,
      "className": "neutral",
      "excerpt": "const fs = require('fs');\nconst path = require('path');\nconst {\n  parseArgs, detectRepoRoot, loadConfig, listAllEntries, isLikelyCode, safeReadText,\n  extractImports, resolveRelativeImport, writeRepoFile, nowIso, classifyPath\n} = require('../lib/common');\n\nconst args = parseArgs(process.argv);\nconst repoRoot = detectRepoRoot(args);\nconst config = loadConfig();\nconst { entries } = listAllEntries(repoRoot);\nconst files = entries.filter((entry) => entry.type === 'file' && isLikelyCode(entry.rel));\n\nconst codeFiles = files.filter((file) => {\n  const className = classifyPath(file.rel, config);\n  return className === 'high-value' || className === 'docs' || /taskmanager\\/(src|server|shared|desktop|portable_lib)\\//.test(file.rel);\n});\n\nconst fileSet = new Set(codeFiles.map((file) => file.rel));\nconst inbound = new Map();\nconst outbound = new Map();\n\nfor (const file of codeFiles) {\n  inbound.set(file.rel, 0);\n  outbound.set(file.rel, 0);\n}\n\nfor (const file of codeFiles) {\n  const abs = path.join(repoRoot, file.rel);\n  const text = safeReadText(abs, 250000);\n  const imports = extractImports(text);\n  const targets = new Set();\n\n  for (const specifier of imports) {\n    const candidates = resolveRelativeImport(file.rel, specifier) || [];\n    for (const candidate of candidates) {\n      if (fileSet.has(candidate)) {\n        targets.add(candidate);\n        break;\n      }\n    }\n  }\n\n  outbound.set(file.rel, targets.size);\n  for (const target of targets) {\n    inbound.set(target, (inbound.get(target) || 0) + 1);\n  }\n}\n\nconst hubs = codeFiles.map((file) => ({\n  rel: file.rel,\n  inbound: inbound.get(file.rel) || 0,\n  outbound: outbound.get(file.rel) || 0,\n  total: (inbound.get(file.rel) || 0) + (outbound.get(file.rel) || 0)\n})).sort((a, b) => b.total - a.total || a.rel.localeCompare(b.rel));\n\nconst lines = [];\nlines.push('# Import Hub Report');\nlines.push('');\nlines.push(`Generated: ${nowIso()}`);\nlines.push(`Repo root: \\`${repoRoot}\\``);\nlines.push('');\nlines.push('These are the source files most central to the import graph in the likely code-bearing folders.');\nl
~~~