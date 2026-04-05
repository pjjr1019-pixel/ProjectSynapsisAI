const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const buckets = new Map();
for (const key of ['high-value', 'docs', 'neutral', 'low-value', 'generated']) {
  buckets.set(key, []);
}

for (const file of files) {
  const key = classifyPath(file.rel, config);
  if (buckets.has(key)) buckets.get(key).push(file.rel);
}

const lines = [];
lines.push('# Source vs Generated');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
for (const [bucket, items] of buckets.entries()) {
  lines.push(`## ${bucket}`);
  lines.push('');
  for (const rel of items.slice(0, 150)) {
    lines.push(`- \`${rel}\``);
  }
  if (items.length > 150) {
    lines.push(`- ... ${items.length - 150} more`);
  }
  lines.push('');
}

const outputPath = writeRepoFile(repoRoot, '.ai_repo/source-vs-generated.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
