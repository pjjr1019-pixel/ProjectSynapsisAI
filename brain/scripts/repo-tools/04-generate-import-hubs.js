const fs = require('fs');
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, isLikelyCode, safeReadText,
  extractImports, resolveRelativeImport, writeRepoFile, nowIso, classifyPath
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file' && isLikelyCode(entry.rel));

const codeFiles = files.filter((file) => {
  const className = classifyPath(file.rel, config);
  return className === 'high-value' || className === 'docs' || /taskmanager\/(src|server|shared|desktop|portable_lib)\//.test(file.rel);
});

const fileSet = new Set(codeFiles.map((file) => file.rel));
const inbound = new Map();
const outbound = new Map();

for (const file of codeFiles) {
  inbound.set(file.rel, 0);
  outbound.set(file.rel, 0);
}

for (const file of codeFiles) {
  const abs = path.join(repoRoot, file.rel);
  const text = safeReadText(abs, 250000);
  const imports = extractImports(text);
  const targets = new Set();

  for (const specifier of imports) {
    const candidates = resolveRelativeImport(file.rel, specifier) || [];
    for (const candidate of candidates) {
      if (fileSet.has(candidate)) {
        targets.add(candidate);
        break;
      }
    }
  }

  outbound.set(file.rel, targets.size);
  for (const target of targets) {
    inbound.set(target, (inbound.get(target) || 0) + 1);
  }
}

const hubs = codeFiles.map((file) => ({
  rel: file.rel,
  inbound: inbound.get(file.rel) || 0,
  outbound: outbound.get(file.rel) || 0,
  total: (inbound.get(file.rel) || 0) + (outbound.get(file.rel) || 0)
})).sort((a, b) => b.total - a.total || a.rel.localeCompare(b.rel));

const lines = [];
lines.push('# Import Hub Report');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
lines.push('These are the source files most central to the import graph in the likely code-bearing folders.');
lines.push('');
lines.push('| File | Inbound | Outbound | Total |');
lines.push('|---|---:|---:|---:|');
for (const row of hubs.slice(0, 40)) {
  lines.push(`| \`${row.rel}\` | ${row.inbound} | ${row.outbound} | ${row.total} |`);
}
lines.push('');
lines.push('## How to use this');
lines.push('');
lines.push('- Files with high inbound counts are usually dangerous to change casually because they influence many areas.');
lines.push('- Files with high outbound counts are often orchestration / entrypoint files and are good first reads when mapping behavior.');
lines.push('- Use this together with the focus map before handing work to a coding model.');
lines.push('');

const outputPath = writeRepoFile(repoRoot, '.ai_repo/import-hubs.md', lines.join('\n'));
console.log(`Wrote ${outputPath}`);
