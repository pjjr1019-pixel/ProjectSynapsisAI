const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, collectDirectoryFileCounts,
  writeRepoFile, nowIso, classifyPath
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');
const dirs = entries.filter((entry) => entry.type === 'directory' && entry.rel !== '.');
const dirFileCounts = collectDirectoryFileCounts(entries);

const sizeMap = new Map();
for (const dir of dirs) sizeMap.set(dir.rel, 0);
for (const file of files) {
  const parts = file.rel.split('/');
  let current = '.';
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current === '.' ? parts[i] : `${current}/${parts[i]}`;
    sizeMap.set(current, (sizeMap.get(current) || 0) + file.size);
  }
}

const rows = dirs.map((dir) => ({
  rel: dir.rel,
  files: dirFileCounts.get(dir.rel) || 0,
  bytes: sizeMap.get(dir.rel) || 0,
  className: classifyPath(dir.rel, config)
}))
.filter((row) => row.files > 0)
.sort((a, b) => b.files - a.files || b.bytes - a.bytes || a.rel.localeCompare(b.rel));

const lines = [];
lines.push('# Heavy Path Report');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
lines.push('These are the folders most likely to waste tokens if a coding model reads them too early.');
lines.push('');
lines.push('| Directory | Files | Approx bytes | Class |');
lines.push('|---|---:|---:|---|');
for (const row of rows.slice(0, config.reports.maxHeavyDirectories)) {
  lines.push(`| \`${row.rel}\` | ${row.files} | ${row.bytes} | ${row.className} |`);
}
lines.push('');
lines.push('## Suggested default excludes');
lines.push('');
for (const prefix of config.lowValuePrefixes) {
  lines.push(`- \`${prefix}\``);
}
lines.push('');
lines.push('## When to override the excludes');
lines.push('');
lines.push('- Open generated/runtime/index folders only when the task is explicitly about retrieval artifacts, runtime snapshots, evaluation output, or packaging output.');
lines.push('- Open `dist/` only for packaged build debugging or comparing emitted output.');
lines.push('- Open `node_modules/` only if the task is dependency archaeology or vendor-level debugging.');
lines.push('');

const outputPath = writeRepoFile(repoRoot, '.ai_repo/heavy-paths.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
