#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, detectRepoRoot } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const scriptDir = __dirname;
const scripts = [
  '10-rank-root-manifests.js',
  '11-generate-stack-fingerprint.js',
  '12-generate-portable-boundaries.js',
  '01-generate-workspace-profile.js',
  '02-generate-architecture-digest.js',
  '03-detect-entrypoints.js',
  '04-generate-smart-read-order.js',
  '08-detect-package-scripts.js',
  '09-detect-generated-surfaces.js'
];

for (const script of scripts) {
  const full = path.join(scriptDir, script);
  console.log(`Running ${script}...`);
  const result = spawnSync(process.execPath, [full, '--repo', repoRoot], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('V3 baseline reports complete.');
console.log('Output folder: .ai_repo_v3/');