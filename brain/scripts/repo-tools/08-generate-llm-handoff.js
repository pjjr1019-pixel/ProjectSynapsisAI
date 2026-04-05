const fs = require('fs');
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
  console.error('Usage: node 08-generate-llm-handoff.js --task "describe the work" [--repo path]');
  process.exit(1);
}

const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const scored = files.map((file) => ({
  rel: file.rel,
  score: scorePathForTask(file.rel, task, config),
  className: classifyPath(file.rel, config)
})).sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

const readFirst = scored.filter((row) => row.score > 0).slice(0, 12);
const avoid = scored.filter((row) => row.className === 'generated' || row.className === 'low-value').slice(0, 15);

const prompt = [];
prompt.push('You are working inside this repository.');
prompt.push('');
prompt.push(`Task: ${task}`);
prompt.push('');
prompt.push('Read these files first before doing anything else:');
for (const row of readFirst) {
  prompt.push(`- ${row.rel}`);
}
prompt.push('');
prompt.push('Avoid these on first pass unless the first-read files prove they are required:');
for (const row of avoid) {
  prompt.push(`- ${row.rel}`);
}
prompt.push('');
prompt.push('Rules:');
prompt.push('- Prefer source files over generated files.');
prompt.push('- Prefer taskmanager/src, server, shared, desktop, portable_lib, crawlers, brain/core, READ_FIRST, package.json.');
prompt.push('- Treat node_modules, dist, brain/runtime, normalized docs, context packs, LanceDB, and eval history as low-priority until proven necessary.');
prompt.push('- Before editing, identify the source-of-truth file and note any mirrored/generated copy.');
prompt.push('- Keep the change minimal and explain exactly why those files are the right edit target.');

const safeTask = task.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'task';
const outputPath = writeRepoFile(repoRoot, `.ai_repo/llm-handoff-${safeTask}.txt`, prompt.join('\n'));
console.log(`Wrote ${outputPath}`);
