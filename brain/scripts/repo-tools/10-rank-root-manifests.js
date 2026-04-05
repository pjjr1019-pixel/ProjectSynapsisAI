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

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function relDepth(rel) {
  if (!rel || rel === '.') return 0;
  return normalizeSlashes(rel).split('/').length;
}

function hasBadPath(rel, config) {
  const lower = normalizeSlashes(rel).toLowerCase();
  return (config.rootManifestSignals.badPathTokens || []).some((token) => lower.includes(token.toLowerCase()));
}

function nearbyLockScore(dirRel, lockfiles) {
  const dir = normalizeSlashes(dirRel);
  let score = 0;
  for (const lock of lockfiles) {
    const lrel = normalizeSlashes(lock.rel);
    const parent = relativeParent(lrel);
    if (parent === dir) score += 25;
    else if (dir !== '.' && parent.startsWith(dir)) score += 8;
  }
  return score;
}

function scoreManifest(pkg, lockfiles, config) {
  let score = 0;
  const rel = normalizeSlashes(pkg.rel);
  const depth = relDepth(rel);
  score += Math.max(0, 16 - depth * 2);

  if (pkg.private) score += 10;
  if (!hasBadPath(rel, config)) score += 8;
  else score -= 50;

  const goodScriptNames = new Set((config.rootManifestSignals.goodScriptNames || []).map((s) => s.toLowerCase()));
  for (const script of pkg.scripts) {
    const lower = String(script).toLowerCase();
    if (goodScriptNames.has(lower)) score += 8;
    if (/(electron|desktop|package|portable|build|dev|start|preview)/.test(lower)) score += 4;
  }

  const goodDeps = new Set((config.rootManifestSignals.goodDeps || []).map((s) => s.toLowerCase()));
  const allDeps = pkg.deps.concat(pkg.devDeps);
  for (const dep of allDeps) {
    const lower = String(dep).toLowerCase();
    if (goodDeps.has(lower)) score += 7;
    if (/(electron|react|vite|typescript|transformers|lancedb|onnxruntime|sharp)/.test(lower)) score += 3;
  }

  const badNames = new Set((config.rootManifestSignals.badNames || []).map((s) => s.toLowerCase()));
  if (badNames.has(String(pkg.name || '').toLowerCase())) score -= 30;

  if (pkg.workspaces && pkg.workspaces.length) score += 10;
  score += nearbyLockScore(relativeParent(rel), lockfiles);

  return score;
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
    dir: relativeParent(file.rel),
    name: json.name || '',
    private: Boolean(json.private),
    type: json.type || '',
    scripts: Object.keys(json.scripts || {}),
    deps: Object.keys(json.dependencies || {}),
    devDeps: Object.keys(json.devDependencies || {}),
    workspaces: Array.isArray(json.workspaces)
      ? json.workspaces
      : Array.isArray(json.workspaces && json.workspaces.packages)
        ? json.workspaces.packages
        : [],
  };
}).map((pkg) => ({ ...pkg, score: scoreManifest(pkg, lockfiles, config) }))
  .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

const likelyRoots = packages.slice(0, 12);
const likelyDependencyManifests = packages.filter((pkg) => hasBadPath(pkg.rel, config) || pkg.score < 0).slice(0, 20);

const lines = [];
lines.push('# Root Manifest Candidates', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '');
lines.push('This report tries to separate the **real app package.json files** from dependency package manifests that happen to exist somewhere under the repo tree.', '');
lines.push('## Lockfiles Seen', '');
if (!lockfiles.length) {
  lines.push('_No lockfiles found._', '');
} else {
  for (const lock of lockfiles) lines.push(`- ${lock.rel}`);
  lines.push('');
}
lines.push('## Best Root Candidates', '', '| Score | package.json | name | scripts | deps | devDeps | notes |', '|---:|---|---|---:|---:|---:|---|');
for (const pkg of likelyRoots) {
  const notes = [];
  if (pkg.private) notes.push('private');
  if (pkg.workspaces.length) notes.push(`workspaces:${pkg.workspaces.length}`);
  if (nearbyLockScore(pkg.dir, lockfiles) > 0) notes.push('near lockfile');
  if (hasBadPath(pkg.rel, config)) notes.push('bad-path');
  lines.push(`| ${pkg.score} | ${pkg.rel} | ${pkg.name || '(none)'} | ${pkg.scripts.length} | ${pkg.deps.length} | ${pkg.devDeps.length} | ${notes.join(', ') || '(none)'} |`);
}
lines.push('', '## Likely Dependency/Vendored package.json Files', '');
if (!likelyDependencyManifests.length) {
  lines.push('_No likely dependency manifests found._');
} else {
  for (const pkg of likelyDependencyManifests) {
    lines.push(`- ${pkg.rel} — ${pkg.name || '(none)'} — score ${pkg.score}`);
  }
}
lines.push('', '## Recommendation', '', 'Use the **top-ranked root candidate(s)** first when briefing a coding model. Treat low-scoring or bad-path manifests as dependency noise unless the task is specifically about that dependency.');

const outputPath = writeRepoFile(repoRoot, '.ai_repo_v3/root-manifest-candidates.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);