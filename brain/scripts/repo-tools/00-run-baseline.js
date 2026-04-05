const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, detectRepoRoot } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const here = __dirname;

const steps = [
  '01-generate-focus-map.js',
  '02-generate-heavy-path-report.js',
  '03-generate-duplicate-name-report.js',
  '04-generate-import-hubs.js'
];

console.log(`Repo root: ${repoRoot}`);
for (const step of steps) {
  console.log(`\n==> Running ${step}`);
  const result = spawnSync(process.execPath, [path.join(here, step), '--repo', repoRoot], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('\nBaseline reports complete.');
console.log('Next useful commands:');
console.log(`  node _repo_token_saver_pack/scripts/05-generate-task-brief.js --task "your task here" --repo "${repoRoot}"`);
console.log(`  node _repo_token_saver_pack/scripts/06-generate-context-pack.js --task "your task here" --repo "${repoRoot}"`);
console.log(`  node _repo_token_saver_pack/scripts/08-generate-llm-handoff.js --task "your task here" --repo "${repoRoot}"`);
