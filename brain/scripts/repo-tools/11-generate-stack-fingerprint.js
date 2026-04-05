#!/usr/bin/env node
const path = require('path');
const {
  parseArgs,
  detectRepoRoot,
  loadConfig,
  listAllEntries,
  writeRepoFile,
  safeReadJson,
  nowIso,
  relativeParent
} = require('../lib/common');

function normalize(value) { return String(value || '').replace(/\\/g, '/'); }

function relDepth(rel) {
  if (!rel || rel === '.') return 0;
  return normalize(rel).split('/').length;
}

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

function nearbyLockScore(dirRel, lockfiles) {
  const dir = normalize(dirRel);
  let score = 0;
  for (const lock of lockfiles) {
    const parent = relativeParent(normalize(lock.rel));
    if (parent === dir) score += 25;
    else if (dir !== '.' && parent.startsWith(dir)) score += 8;
  }
  return score;
}

function scoreManifest(pkg, lockfiles, config) {
  let score = 0;
  score += Math.max(0, 16 - relDepth(pkg.rel) * 2);
  if (pkg.private) score += 10;
  if (!/(^|\/)(node_modules|vendor|deps|\.store)(\/|$)/i.test(pkg.rel)) score += 8;
  else score -= 50;
  for (const script of pkg.scripts) {
    if (/(dev|build|start|preview|electron|desktop|portable|package)/i.test(script)) score += 8;
  }
  for (const dep of pkg.deps.concat(pkg.devDeps)) {
    if (/(electron|react|vite|typescript|transformers|lancedb|onnxruntime|sharp)/i.test(dep)) score += 5;
  }
  score += nearbyLockScore(relativeParent(pkg.rel), lockfiles);
  const badNames = new Set((config.rootManifestSignals.badNames || []).map((s) => s.toLowerCase()));
  if (badNames.has(String(pkg.name || '').toLowerCase())) score -= 30;
  return score;
}

function stackSignalRows(depVersions) {
  const checks = [
    ['Desktop shell', ['electron']],
    ['Frontend UI', ['react','react-dom','vite','@vitejs/plugin-react']],
    ['Language/tooling', ['typescript','rollup','esbuild']],
    ['Local AI inference', ['@xenova/transformers','onnxruntime-node','onnxruntime-web','sharp']],
    ['Vector/retrieval', ['@lancedb/lancedb','apache-arrow']],
    ['Proto/data tooling', ['protobufjs','protobufjs-cli']]
  ];
  return checks.map(([label, deps]) => {
    const hits = deps.filter((dep) => depVersions.has(dep)).map((dep) => `${dep}@${depVersions.get(dep)}`);
    return { label, hits };
  });
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const packageFiles = entries.filter((e) => e.type === 'file' && path.basename(e.rel).toLowerCase() === 'package.json');
const lockfiles = entries.filter((e) => e.type === 'file' && /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|\.package-lock\.json)$/i.test(e.rel));

const packages = packageFiles.map((file) => {
  const json = safeReadJson(file.abs) || {};
  return {
    rel: file.rel,
    name: json.name || '',
    private: Boolean(json.private),
    type: json.type || '',
    scripts: Object.keys(json.scripts || {}),
    deps: Object.keys(json.dependencies || {}),
    devDeps: Object.keys(json.devDependencies || {}),
  };
}).map((pkg) => ({ ...pkg, score: scoreManifest(pkg, lockfiles, config) }))
  .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

const bestPkg = packages[0] || null;

let bestLock = null;
for (const lock of lockfiles) {
  if (!bestLock) bestLock = lock;
  if (/(^|\.)package-lock\.json$/i.test(lock.rel)) {
    bestLock = lock;
    break;
  }
}

let lock = null;
if (bestLock) lock = safeReadJson(bestLock.abs);

const depVersions = new Map();
if (lock && lock.packages) {
  for (const [pkgPath, meta] of Object.entries(lock.packages)) {
    const depName = directPackageNameFromLockPath(pkgPath);
    if (!depName) continue;
    if (!depVersions.has(depName)) depVersions.set(depName, meta.version || '(unknown)');
  }
}
if (bestPkg) {
  for (const dep of bestPkg.deps.concat(bestPkg.devDeps)) {
    if (!depVersions.has(dep)) depVersions.set(dep, '(declared)');
  }
}

const signals = stackSignalRows(depVersions);
const nativeSignals = [...depVersions.keys()].filter((name) => /(electron|esbuild|rollup|sharp|onnxruntime-node|lancedb|win32|darwin|linux)/i.test(name)).sort();
const recommendedReads = [
  bestPkg && bestPkg.rel,
  'taskmanager/package.json',
  'taskmanager/package.standalone.json',
  'taskmanager/package-lock.json',
  'taskmanager/src/',
  'taskmanager/desktop/',
  'taskmanager/server/',
  'taskmanager/shared/',
  'taskmanager/portable_lib/',
  'taskmanager/brain/core/'
].filter(Boolean);

const md = [];
md.push('# Stack Fingerprint', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '');
md.push('## Most Likely Root Manifest', '');
if (!bestPkg) md.push('_No package.json files found._');
else {
  md.push(`- package.json: **${bestPkg.rel}**`);
  md.push(`- name: **${bestPkg.name || '(none)'}**`);
  md.push(`- type: ${bestPkg.type || '(unspecified)'}`);
  md.push(`- scripts: ${bestPkg.scripts.length}`);
  md.push(`- deps: ${bestPkg.deps.length}`);
  md.push(`- devDeps: ${bestPkg.devDeps.length}`);
}
md.push('', '## Best Lockfile', '');
if (!bestLock) md.push('_No lockfile found._');
else {
  md.push(`- ${bestLock.rel}`);
  if (lock && lock.name) md.push(`- lock name: ${lock.name}`);
  if (lock && lock.version) md.push(`- lock version field: ${lock.version}`);
}
md.push('', '## Stack Signals', '');
for (const row of signals) {
  md.push(`### ${row.label}`, '');
  if (!row.hits.length) md.push('_No direct signal found._');
  else for (const hit of row.hits) md.push(`- ${hit}`);
  md.push('');
}
md.push('## Native / Packaging Risk Signals', '');
if (!nativeSignals.length) {
  md.push('_No native or platform-specific signals found._');
} else {
  for (const name of nativeSignals.slice(0, 60)) md.push(`- ${name}${depVersions.get(name) ? '@' + depVersions.get(name) : ''}`);
}
md.push('', '## Likely App Shape', '');
const appShape = [];
if (depVersions.has('electron')) appShape.push('- Desktop shell is likely Electron-based.');
if (depVersions.has('react') || depVersions.has('react-dom')) appShape.push('- UI is likely React.');
if (depVersions.has('vite') || depVersions.has('@vitejs/plugin-react')) appShape.push('- Frontend build/dev flow is likely Vite.');
if (depVersions.has('@xenova/transformers') || depVersions.has('onnxruntime-node') || depVersions.has('onnxruntime-web')) appShape.push('- Local AI or model inference surface is present.');
if (depVersions.has('@lancedb/lancedb') || depVersions.has('apache-arrow')) appShape.push('- Retrieval/vector storage surface is present.');
if (!appShape.length) appShape.push('- No strong stack-shape inference was possible from the manifests.');
md.push(...appShape, '');
md.push('## Recommended First Reads', '');
for (const item of recommendedReads) md.push(`- ${item}`);

const jsonOut = {
  generated: nowIso(),
  repoRoot,
  bestPackage: bestPkg,
  bestLock: bestLock ? { rel: bestLock.rel, name: lock && lock.name, version: lock && lock.version } : null,
  stackSignals: signals,
  nativeSignals: nativeSignals.slice(0, 100),
  recommendedReads
};

const mdPath = writeRepoFile(repoRoot, '.ai_repo_v3/stack-fingerprint.md', md.join('\n'));
const jsonPath = writeRepoFile(repoRoot, '.ai_repo_v3/stack-fingerprint.json', JSON.stringify(jsonOut, null, 2));
console.log(`Wrote ${path.relative(repoRoot, mdPath)}`);
console.log(`Wrote ${path.relative(repoRoot, jsonPath)}`);