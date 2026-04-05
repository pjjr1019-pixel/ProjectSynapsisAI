const fs = require('fs');
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, scorePathForTask,
  classifyPath, safeReadText, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const task = args.task || args._.join(' ').trim();

if (!task) {
  console.error('Usage: node 06-generate-context-pack.js --task "describe the work" [--repo path]');
  process.exit(1);
}

const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const scored = files.map((file) => ({
  rel: file.rel,
  score: scorePathForTask(file.rel, task, config),
  className: classifyPath(file.rel, config),
  size: file.size
})).filter((row) => row.score > 0)
  .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel))
  .slice(0, config.contextPack.maxFiles);

const lines = [];
const json = {
  generated: nowIso(),
  repoRoot,
  task,
  files: []
};

lines.push('# Context Pack');
lines.push('');
lines.push(`Generated: ${json.generated}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push(`Task: **${task}**`);
lines.push('');
lines.push('This file is meant to be pasted into a coding model instead of the whole repo.');
lines.push('');

for (const item of scored) {
  const abs = path.join(repoRoot, item.rel);
  const text = safeReadText(abs, config.contextPack.maxCharsPerFile);
  json.files.push({
    path: item.rel,
    score: item.score,
    className: item.className,
    excerpt: text
  });

  lines.push(`## ${item.rel}`);
  lines.push('');
  lines.push(`- score: ${item.score}`);
  lines.push(`- class: ${item.className}`);
  lines.push('');
  lines.push('```');
  lines.push(text.trimEnd());
  lines.push('```');
  lines.push('');
}

const safeTask = task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'task';
const mdPath = writeRepoFile(repoRoot, `.ai_repo/context-pack-${safeTask}.md`, lines.join('\n'));
const jsonPath = writeRepoFile(repoRoot, `.ai_repo/context-pack-${safeTask}.json`, JSON.stringify(json, null, 2));
console.log(`Wrote ${mdPath}`);
console.log(`Wrote ${jsonPath}`);
