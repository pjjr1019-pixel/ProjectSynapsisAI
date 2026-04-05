const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, outputDir, ensureDir,
  writeRepoFile, classifyPath, collectDirectoryFileCounts, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries, unreadable } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');
const dirs = entries.filter((entry) => entry.type === 'directory');
const dirFileCounts = collectDirectoryFileCounts(entries);

const highValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'high-value');
const docsFiles = files.filter((file) => classifyPath(file.rel, config) === 'docs');
const generatedFiles = files.filter((file) => classifyPath(file.rel, config) === 'generated');
const lowValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'low-value');
const neutralFiles = files.filter((file) => classifyPath(file.rel, config) === 'neutral');

const directorySummary = dirs
  .filter((dir) => dir.rel !== '.')
  .map((dir) => ({
    rel: dir.rel,
    files: dirFileCounts.get(dir.rel) || 0,
    className: classifyPath(dir.rel, config)
  }))
  .filter((dir) => dir.files > 0)
  .sort((a, b) => b.files - a.files || a.rel.localeCompare(b.rel));

const lines = [];
lines.push('# Focus Map');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
lines.push('## Why this exists');
lines.push('');
lines.push('This report is designed to keep coding models from spending tokens in the wrong places first.');
lines.push('It identifies the smallest set of folders and files that should usually be read first,');
lines.push('and the heavy generated/runtime areas that should usually be skipped on pass one.');
lines.push('');
lines.push('## Snapshot');
lines.push('');
lines.push(`- Total files: **${files.length}**`);
lines.push(`- Total folders: **${dirs.length - 1}**`);
lines.push(`- High-value files: **${highValueFiles.length}**`);
lines.push(`- Docs / guidance files: **${docsFiles.length}**`);
lines.push(`- Generated files: **${generatedFiles.length}**`);
lines.push(`- Low-value files: **${lowValueFiles.length}**`);
lines.push(`- Neutral files: **${neutralFiles.length}**`);
lines.push(`- Unreadable paths: **${unreadable.length}**`);
lines.push('');
lines.push('## Recommended first-read files');
lines.push('');
for (const rel of config.defaultTaskReadOrder) {
  lines.push(`- \`${rel}\``);
}
lines.push('');
lines.push('## High-value prefixes');
lines.push('');
for (const prefix of config.highValuePrefixes) {
  lines.push(`- \`${prefix}\``);
}
lines.push('');
lines.push('## De-prioritize on first pass');
lines.push('');
for (const prefix of config.lowValuePrefixes) {
  lines.push(`- \`${prefix}\``);
}
lines.push('');
lines.push('## Largest directories by contained file count');
lines.push('');
for (const row of directorySummary.slice(0, 25)) {
  lines.push(`- \`${row.rel}\` — ${row.files} files — ${row.className}`);
}
lines.push('');
lines.push('## Repo-specific reading strategy');
lines.push('');
lines.push('1. Read compact source-of-truth docs and entrypoints first.');
lines.push('2. Read UI / server / shared / desktop / portable_lib code next.');
lines.push('3. Only enter brain runtime, retrieval indexes, normalized docs, LanceDB, eval history, or node_modules if the task explicitly depends on them.');
lines.push('4. When a task touches “brain” logic, prefer `taskmanager/brain/core/` and `taskmanager/portable_lib/` before runtime artifacts.');
lines.push('');
if (unreadable.length) {
  lines.push('## Unreadable paths');
  lines.push('');
  for (const item of unreadable) lines.push(`- \`${item.path}\` — ${item.error}`);
  lines.push('');
}

ensureDir(outputDir(repoRoot));
const outputPath = writeRepoFile(repoRoot, '.ai_repo/focus-map.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
