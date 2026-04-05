const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, groupBy, writeRepoFile, nowIso
} = require('../lib/common');

function stem(name) {
  return name
    .toLowerCase()
    .replace(/\.(d\.)?(tsx?|jsx?|mjs|cjs|mts|cts|json|jsonl|md|txt|css|html?)$/i, '')
    .replace(/[-_.]/g, '');
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const byName = groupBy(files, (file) => file.name.toLowerCase());
const byStem = groupBy(files, (file) => stem(file.name));

const exactDupes = [...byName.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const stemDupes = [...byStem.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const lines = [];
lines.push('# Duplicate / Confusable Name Report');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
lines.push('This report helps reduce wrong-file edits by surfacing repeated or confusable names.');
lines.push('');
lines.push('## Exact duplicate file names');
lines.push('');
for (const [name, group] of exactDupes.slice(0, config.reports.maxDuplicateGroups)) {
  lines.push(`### ${name}`);
  for (const item of group.sort((a, b) => a.rel.localeCompare(b.rel))) {
    lines.push(`- \`${item.rel}\``);
  }
  lines.push('');
}
lines.push('## Stem-level confusable groups');
lines.push('');
for (const [name, group] of stemDupes.slice(0, config.reports.maxDuplicateGroups)) {
  lines.push(`### ${name}`);
  for (const item of group.sort((a, b) => a.rel.localeCompare(b.rel))) {
    lines.push(`- \`${item.rel}\``);
  }
  lines.push('');
}
lines.push('## Practical use');
lines.push('');
lines.push('- Before editing a file, search this report for its basename.');
lines.push('- If the same or similar name appears in `src/`, `server/`, `portable_lib/`, and `dist/`, prefer the source directory first.');
lines.push('- If a file exists in both runtime artifacts and source folders, treat the runtime artifact as output until proven otherwise.');
lines.push('');

const outputPath = writeRepoFile(repoRoot, '.ai_repo/duplicate-name-report.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
