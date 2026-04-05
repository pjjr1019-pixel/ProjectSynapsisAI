#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, nowIso, classifyPath, isLikelyCode, discoverProjectMetadata, safeReadText } = require('../lib/common');

function scoreEntry(file, config) {
  let score = 0;
  const rel = file.rel.toLowerCase();
  const base = path.basename(rel);
  if (/(main|index|app|server|launcher|bootstrap|start)/.test(base)) score += 12;
  if (/(electron|vite|webpack|rollup|tauri|server|desktop|runtime|task|bridge)/.test(rel)) score += 6;
  if (classifyPath(file.rel, config) === 'high-value') score += 8;
  if (classifyPath(file.rel, config) === 'generated') score -= 20;
  if (classifyPath(file.rel, config) === 'low-value') score -= 10;
  const text = safeReadText(file.abs, 12000);
  if (/createRoot\(|ReactDOM\.render|new BrowserWindow|app\.whenReady|express\(|fastify\(|http\.createServer|createServer\(/.test(text)) score += 14;
  if (/process\.argv|commander|yargs|program\.command/.test(text)) score += 4;
  if (/export default function App|function App\(|const App\s*=/.test(text)) score += 5;
  if (/listen\(/.test(text)) score += 4;
  return score;
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const files = entries.filter((e) => e.type === 'file' && isLikelyCode(e.rel));
const ranked = files.map((file) => ({ ...file, score: scoreEntry(file, config) })).filter((file) => file.score > 0).sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel)).slice(0, 80);

const lines = ['# Likely Entrypoints', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '', '## Ranked Files', '', '| Score | File | Bias |', '|---:|---|---|'];
for (const row of ranked) lines.push(`| ${row.score} | ${row.rel} | ${classifyPath(row.rel, config)} |`);
lines.push('', '## Package Script Hints', '');
if (!metadata.packages.length) lines.push('_No package scripts found._');
for (const pkg of metadata.packages) for (const script of pkg.scripts) lines.push(`- ${script} from ${pkg.rel}`);
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/likely-entrypoints.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);