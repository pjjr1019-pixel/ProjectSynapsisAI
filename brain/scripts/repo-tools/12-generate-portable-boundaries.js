#!/usr/bin/env node
const path = require('path');
const {
  parseArgs,
  detectRepoRoot,
  listAllEntries,
  writeRepoFile,
  safeReadJson,
  nowIso
} = require('../lib/common');

function normalize(value) { return String(value || '').replace(/\\/g, '/'); }
function directPackageNameFromLockPath(lockPath) {
  const rel = normalize(lockPath);
  if (!rel.startsWith('node_modules/')) return null;
  const parts = rel.split('/');
  if (parts[1] && parts[1].startsWith('@')) {
    if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
    return null;
  }
  return parts[1] || null;
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const lockfile = entries.find((e) => e.type === 'file' && /(^|\/)\.package-lock\.json$/i.test(e.rel))
  || entries.find((e) => e.type === 'file' && /(^|\/)package-lock\.json$/i.test(e.rel));
const lock = lockfile ? safeReadJson(lockfile.abs) : null;
const deps = new Map();
if (lock && lock.packages) {
  for (const [pkgPath, meta] of Object.entries(lock.packages)) {
    const dep = directPackageNameFromLockPath(pkgPath);
    if (!dep) continue;
    if (!deps.has(dep)) deps.set(dep, meta.version || '(unknown)');
  }
}

const pathExists = (prefix) => entries.some((e) => normalize(e.rel).startsWith(prefix));
const surfaces = [
  { name: 'Desktop shell', paths: ['taskmanager/desktop/'], why: 'likely host process / desktop bootstrap surface' },
  { name: 'Frontend/UI', paths: ['taskmanager/src/'], why: 'likely main application UI and renderer logic' },
  { name: 'Server/API/local services', paths: ['taskmanager/server/', 'taskmanager/shared/'], why: 'shared logic and backend/service surfaces' },
  { name: 'Portable/runtime helpers', paths: ['taskmanager/portable_lib/', 'taskmanager/.runtime/'], why: 'standalone or launch/runtime-specific flow' },
  { name: 'Crawler/data ingest', paths: ['taskmanager/crawlers/', 'taskmanager/webcrawler/'], why: 'external data capture / crawling surface' },
  { name: 'Canonical brain docs', paths: ['taskmanager/brain/core/'], why: 'compact source-of-truth docs and contracts' },
  { name: 'Generated retrieval/index artifacts', paths: ['taskmanager/brain/retrieval/indexes/', 'taskmanager/brain/runtime/'], why: 'large token-heavy generated surfaces' }
].map((surface) => ({
  ...surface,
  existing: surface.paths.filter((p) => pathExists(p))
}));

const portabilityRisks = [];
if (deps.has('electron')) portabilityRisks.push('Electron runtime packaging and desktop shell compatibility');
if (deps.has('@lancedb/lancedb')) portabilityRisks.push('LanceDB native bindings / platform-specific binaries');
if (deps.has('sharp')) portabilityRisks.push('Sharp native image library packaging');
if (deps.has('onnxruntime-node')) portabilityRisks.push('ONNX Runtime native Node bindings');
if (deps.has('onnxruntime-web')) portabilityRisks.push('Web inference bundle size and WASM/runtime assets');
for (const dep of deps.keys()) {
  if (/@rollup\/rollup-win32-|@esbuild\/win32-|lancedb-win32/i.test(dep)) portabilityRisks.push(`Platform-specific package present: ${dep}`);
}

const lines = [];
lines.push('# Portable / Standalone Boundaries', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '');
lines.push('Use this report when trying to make the taskmanager more standalone or easier for a coding model to edit without reading the entire repo.', '');
lines.push('## Surface Map', '');
for (const surface of surfaces) {
  lines.push(`### ${surface.name}`, '');
  lines.push(`- Why it matters: ${surface.why}`);
  if (!surface.existing.length) {
    lines.push('- Existing paths found: _none detected_');
  } else {
    lines.push('- Existing paths found:');
    for (const p of surface.existing) lines.push(`  - ${p}`);
  }
  lines.push('');
}
lines.push('## Portability / Packaging Risks', '');
if (!portabilityRisks.length) {
  lines.push('_No strong portability risks inferred from the lockfile._');
} else {
  for (const risk of [...new Set(portabilityRisks)]) lines.push(`- ${risk}`);
}
lines.push('', '## Recommended Standalone Priorities', '');
const priorities = [
  'Keep canonical source and config close to the standalone taskmanager surface.',
  'Do not treat retrieval indexes, context packs, or historical eval artifacts as first-pass source-of-truth files.',
  'Isolate generated/runtime/cache data from editable source so coding models do not waste context on them.',
  'Confirm which package.json actually owns the desktop build and package flow before editing.',
  'If Electron + Vite + React are all present, split reasoning into: desktop main process, renderer app, shared contracts, runtime data.',
  'Document which folders are safe to delete/regenerate versus which are canonical.'
];
for (const p of priorities) lines.push(`- ${p}`);

const outputPath = writeRepoFile(repoRoot, '.ai_repo_v3/portable-boundaries.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);