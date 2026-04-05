#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, nowIso, classifyPath, groupBy, collectDirectoryFileCounts } = require('../lib/common');
const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const dirs = entries.filter((e) => e.type === 'directory');
const counts = collectDirectoryFileCounts(entries);
const rows = dirs.map((dir) => ({ rel: dir.rel, bias: classifyPath(dir.rel, config), files: counts.get(dir.rel) || 0 })).filter((row) => row.rel !== '.').sort((a, b) => b.files - a.files || a.rel.localeCompare(b.rel));
const groups = groupBy(rows, (row) => row.bias);
const lines = ['# Generated vs Canonical Surfaces', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, ''];
for (const key of ['high-value', 'docs', 'neutral', 'low-value', 'generated']) {
  const items = (groups.get(key) || []).slice(0, 50);
  lines.push(`## ${key}`, '');
  if (!items.length) {
    lines.push('_None found._');
  } else {
    lines.push('| Files under path | Directory |', '|---:|---|');
    for (const item of items) lines.push(`| ${item.files} | ${item.rel}/ |`);
  }
  lines.push('');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/generated-vs-canonical.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);