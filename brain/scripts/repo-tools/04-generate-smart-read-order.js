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
const lines = ['# Smart Read Order', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '', 'Read in roughly this order before editing the repo:', ''];
rows.forEach((row, i) => lines.push(`${i + 1}. ${row.rel} — score ${row.files} — ${row.bias}`));
lines.push('', '## package.json Overview', '');
const metadata = require('../lib/common').discoverProjectMetadata(repoRoot, entries);
if (!metadata.packages.length) lines.push('_No package.json files found._');
for (const pkg of metadata.packages) lines.push(`- ${pkg.rel} (${pkg.scripts.length} scripts, ${pkg.deps.length} deps, ${pkg.devDeps.length} devDeps)`);
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/smart-read-order.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);