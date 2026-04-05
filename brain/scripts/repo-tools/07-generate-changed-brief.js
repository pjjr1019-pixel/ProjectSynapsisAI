const path = require('path');
const { spawnSync } = require('child_process');
const {
  parseArgs, detectRepoRoot, loadConfig, classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();

const gitStatus = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' });
let changed = [];

if (gitStatus.status === 0) {
  changed = gitStatus.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const rel = line.slice(3).trim().replace(/\\/g, '/');
      return {
        rel,
        status: line.slice(0, 2).trim(),
        className: classifyPath(rel, config)
      };
    });
}

if (!changed.length) {
  console.error('No git changes found or git is unavailable in this repo.');
  process.exit(1);
}

const lines = [];
lines.push('# Changed Files Brief');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
lines.push('| Status | File | Class |');
lines.push('|---|---|---|');
for (const row of changed) {
  lines.push(`| ${row.status} | \`${row.rel}\` | ${row.className} |`);
}
lines.push('');
lines.push('## First-pass interpretation');
lines.push('');
for (const row of changed.filter((row) => row.className === 'high-value' || row.className === 'docs')) {
  lines.push(`- \`${row.rel}\` is probably source-of-truth for this change.`);
}
for (const row of changed.filter((row) => row.className === 'generated' || row.className === 'low-value')) {
  lines.push(`- \`${row.rel}\` looks generated or low-value; confirm whether there is an upstream source file.`);
}
lines.push('');

const outputPath = writeRepoFile(repoRoot, '.ai_repo/changed-files-brief.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
