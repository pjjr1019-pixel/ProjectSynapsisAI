const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, scorePathForTask,
  classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const task = args.task || args._.join(' ').trim();

if (!task) {
  console.error('Usage: node 05-generate-task-brief.js --task "describe the work" [--repo path]');
  process.exit(1);
}

const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const scored = files.map((file) => ({
  rel: file.rel,
  score: scorePathForTask(file.rel, task, config),
  className: classifyPath(file.rel, config)
})).sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

const best = scored.filter((row) => row.score > 0).slice(0, config.reports.maxTaskCandidates);
const avoid = scored.filter((row) => row.className === 'generated' || row.className === 'low-value').slice(0, 25);

const lines = [];
lines.push('# Task Brief');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push(`Task: **${task}**`);
lines.push('');
lines.push('## Read these first');
lines.push('');
for (const row of best.slice(0, 15)) {
  lines.push(`- \`${row.rel}\` — score ${row.score} — ${row.className}`);
}
lines.push('');
lines.push('## Maybe read on second pass');
lines.push('');
for (const row of best.slice(15, 30)) {
  lines.push(`- \`${row.rel}\` — score ${row.score} — ${row.className}`);
}
lines.push('');
lines.push('## Avoid on first pass unless task explicitly requires them');
lines.push('');
for (const row of avoid) {
  lines.push(`- \`${row.rel}\` — ${row.className}`);
}
lines.push('');
lines.push('## Suggested workflow');
lines.push('');
lines.push('1. Read the first 5–10 files above.');
lines.push('2. Confirm source-of-truth before editing.');
lines.push('3. Only open generated/runtime/output paths if the first-pass files point there.');
lines.push('');

const safeTask = task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'task';
const outputPath = writeRepoFile(repoRoot, `.ai_repo/task-brief-${safeTask}.md`, lines.join('\n'));
console.log(`Wrote ${outputPath}`);
