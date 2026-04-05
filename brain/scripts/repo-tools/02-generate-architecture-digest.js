#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, listAllEntries, writeRepoFile, nowIso, safeReadText, discoverProjectMetadata } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);

const candidates = [...metadata.found.readmes, ...metadata.found.architectureDocs, ...metadata.found.envExamples]
  .filter((file, index, arr) => arr.findIndex((x) => x.rel === file.rel) === index)
  .slice(0, 40)
  .map((file) => ({ rel: file.rel, preview: safeReadText(path.join(repoRoot, file.rel), 18000).split(/\r?\n/).filter(Boolean).slice(0, 25).join('\n') }));

const lines = ['# Architecture Digest', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '', 'This report is a compact first-pass digest of README, READ_FIRST, architecture, plan, contract, rules, and env-example files.', ''];
for (const doc of candidates) {
  lines.push(`## ${doc.rel}`, '', '```text', doc.preview || '[empty or unreadable]', '```', '');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/architecture-digest.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);