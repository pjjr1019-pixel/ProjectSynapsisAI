#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, listAllEntries, writeRepoFile, nowIso, discoverProjectMetadata } = require('../lib/common');
const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const lines = ['# Package Scripts Report', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, ''];
if (!metadata.packages.length) lines.push('_No package.json files found._');
for (const pkg of metadata.packages) {
  lines.push(`## ${pkg.rel}`, '', `- name: ${pkg.name || '(none)'}`, `- workspaces: ${pkg.workspaces.length ? pkg.workspaces.join(', ') : '(none)'}`, '');
  if (!pkg.scripts.length) lines.push('_No scripts._');
  for (const script of pkg.scripts) lines.push(`- ${script}`);
  lines.push('');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/package-scripts.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);