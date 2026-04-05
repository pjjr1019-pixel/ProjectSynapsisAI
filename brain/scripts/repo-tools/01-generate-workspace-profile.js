#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, nowIso, classifyPath, discoverProjectMetadata, collectDirectoryFileCounts } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const fileCounts = collectDirectoryFileCounts(entries);

const topLevel = entries.filter((d) => d.type === 'directory' && d.depth === 1).map((dir) => ({
  rel: dir.rel,
  fileCount: fileCounts.get(dir.rel) || 0,
  classification: classifyPath(dir.rel, config)
})).sort((a, b) => b.fileCount - a.fileCount || a.rel.localeCompare(b.rel));

const extCounts = new Map();
for (const file of entries.filter((e) => e.type === 'file')) {
  const ext = file.ext || '[no extension]';
  extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
}
const topExts = [...extCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
const packageScripts = metadata.packages.flatMap((pkg) => pkg.scripts.map((script) => ({ rel: pkg.rel, script })));

const lines = [];
lines.push('# Workspace Profile', '');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: ${repoRoot}`, '');
lines.push('## Repo Size', '');
lines.push(`- Files: **${entries.filter((e) => e.type === 'file').length}**`);
lines.push(`- Folders: **${entries.filter((e) => e.type === 'directory').length}**`);
lines.push(`- Unreadable paths: **${(listAllEntries(repoRoot).unreadable || []).length}**`);
lines.push(`- package.json files: **${metadata.packages.length}**`);
lines.push(`- tsconfig files: **${metadata.tsconfigs.length}**`);
lines.push(`- README / READ_FIRST files: **${metadata.found.readmes.length}**`);
lines.push(`- architecture-ish docs: **${metadata.found.architectureDocs.length}**`, '');
lines.push('## Top-Level Surfaces', '');
lines.push('| Path | Files under it | Bias |', '|---|---:|---|');
for (const row of topLevel) lines.push(`| ${row.rel}/ | ${row.fileCount} | ${row.classification} |`);
lines.push('', '## package.json Files', '');
if (!metadata.packages.length) {
  lines.push('_No package.json files found._');
} else {
  for (const pkg of metadata.packages) {
    lines.push(`### ${pkg.rel}`);
    lines.push(`- name: ${pkg.name || '(none)'}`);
    lines.push(`- private: ${pkg.private}`);
    lines.push(`- type: ${pkg.type || '(unspecified)'}`);
    lines.push(`- scripts: ${pkg.scripts.length}`);
    lines.push(`- dependencies: ${pkg.deps.length}`);
    lines.push(`- devDependencies: ${pkg.devDeps.length}`);
    lines.push(`- workspaces: ${pkg.workspaces.length ? pkg.workspaces.join(', ') : '(none)'}`, '');
  }
}
lines.push('## tsconfig Files', '');
if (!metadata.tsconfigs.length) {
  lines.push('_No tsconfig files found._');
} else {
  for (const cfg of metadata.tsconfigs) {
    lines.push(`- ${cfg.rel} — extends: ${cfg.extends || '(none)'}, baseUrl: ${cfg.baseUrl || '(none)'}, path aliases: ${cfg.paths.length}`);
  }
}
lines.push('', '## Top Extensions', '');
lines.push('| Extension | Count |', '|---|---:|');
for (const [ext, count] of topExts) lines.push(`| ${ext} | ${count} |`);
lines.push('', '## Script Surface', '');
if (!packageScripts.length) lines.push('_No package scripts found._');
for (const row of packageScripts) lines.push(`- ${row.script} in ${row.rel}`);
lines.push('', '## Likely Canonical Docs', '');
const docs = metadata.found.readmes.concat(metadata.found.architectureDocs).slice(0, 80);
for (const f of docs) lines.push(`- ${f.rel}`);

const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/workspace-profile.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);