'use strict';
/**
 * Integration script — merges tiny_tool_pack_v1, guarded_tool_pack_v2, repo_coder_tool_pack_v3
 * into taskmanager/brain/scripts/ with category structure, unified registry, and reports.
 */
const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const STAGING   = __dirname;
const TARGET    = path.resolve(__dirname, '..');   // taskmanager/brain/scripts/
const CONFLICTS = path.join(TARGET, 'staging_review', 'conflicts');

const PACKS = [
  { name: 'tiny_tool_pack_v1',       dir: path.join(STAGING, 'tiny_tool_pack_v1',       'tiny_tool_pack_v1') },
  { name: 'guarded_tool_pack_v2',    dir: path.join(STAGING, 'guarded_tool_pack_v2',    'guarded_tool_pack_v2') },
  { name: 'repo_coder_tool_pack_v3', dir: path.join(STAGING, 'repo_coder_tool_pack_v3', 'repo_coder_tool_pack_v3') },
];

// ── Category mapping: pack-relative source prefix → target subdir ─────────────
// v1
const V1_MAP = [
  ['scripts/csv',       'csv'],
  ['scripts/files',     'files'],
  ['scripts/json',      'json'],
  ['scripts/paths',     'files'],         // paths utilities live in files/
  ['scripts/repo',      'repo'],
  ['scripts/safe_write','files'],         // safe write utilities live in files/
  ['scripts/system',    'system'],
  ['scripts/text',      'text'],
];
// v2
const V2_MAP = [
  ['scripts/cleanup',   'cleanup'],
  ['scripts/network',   'network'],
  ['scripts/policy',    'policy'],
  ['scripts/processes', 'process'],
  ['scripts/services',  'services'],
  ['scripts/startup',   'startup'],
  ['scripts/system',    'system'],
];
// v3
const V3_MAP = [
  ['scripts/code',      'code'],
  ['scripts/context',   'reports'],
  ['scripts/deps',      'indexing'],
  ['scripts/git',       'repo'],          // git tools belong in repo/
  ['scripts/quality',   'indexing'],      // quality analysis → indexing
  ['scripts/repo',      'repo'],
  ['scripts/text',      'text'],
];

const PACK_MAPS = {
  tiny_tool_pack_v1:       V1_MAP,
  guarded_tool_pack_v2:    V2_MAP,
  repo_coder_tool_pack_v3: V3_MAP,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function writeText(p, text) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, text, 'utf8');
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

// ── Target directories ────────────────────────────────────────────────────────
const DIRS = [
  'core','files','text','json','csv','repo','code','indexing','search',
  'process','services','startup','network','system','cleanup','policy',
  'reports','playbooks','registry','staging_review/conflicts','deprecated','docs',
  'ai-toolkit',
];
DIRS.forEach(d => ensureDir(path.join(TARGET, d)));

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = {
  total_copied: 0,
  total_conflicts: 0,
  total_skipped: 0,
  by_category: {},
  by_pack: {},
  conflicts: [],
  copied_files: [],
};

function bump(cat, pack) {
  stats.by_category[cat] = (stats.by_category[cat] || 0) + 1;
  stats.by_pack[pack]    = (stats.by_pack[pack]    || 0) + 1;
  stats.total_copied++;
}

// ── Copy each pack's scripts ──────────────────────────────────────────────────
// Track placed target paths to detect conflicts
const placed = new Map(); // targetPath → {pack, src}

for (const pack of PACKS) {
  const mappings = PACK_MAPS[pack.name];
  for (const [srcPrefix, targetCat] of mappings) {
    const srcDir = path.join(pack.dir, srcPrefix);
    if (!fs.existsSync(srcDir)) continue;

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const src  = path.join(srcDir, file);
      const dest = path.join(TARGET, targetCat, file);

      if (placed.has(dest)) {
        // Conflict — send non-canonical version to staging_review
        const prev = placed.get(dest);
        const conflictDest = path.join(CONFLICTS, `${targetCat}_${file}__from_${pack.name}`);
        copyFile(src, conflictDest);
        stats.total_conflicts++;
        stats.conflicts.push({
          file,
          target_category: targetCat,
          canonical_pack: prev.pack,
          conflict_pack: pack.name,
          resolution: 'canonical kept, conflict moved to staging_review/conflicts/',
          conflict_path: path.relative(TARGET, conflictDest),
        });
      } else {
        copyFile(src, dest);
        placed.set(dest, { pack: pack.name, src });
        bump(targetCat, pack.name);
        stats.copied_files.push({ file, category: targetCat, pack: pack.name,
          rel: path.relative(TARGET, dest) });
      }
    }
  }
}

// ── Canonical shared/core.js (use v3 — largest/most complete) ────────────────
const coreSrc = path.join(PACKS[2].dir, 'shared', 'core.js');
copyFile(coreSrc, path.join(TARGET, 'core', 'core.js'));
// Also preserve v1 and v2 versions for reference
copyFile(path.join(PACKS[0].dir, 'shared', 'core.js'),
         path.join(CONFLICTS, 'core.js__from_tiny_tool_pack_v1'));
copyFile(path.join(PACKS[1].dir, 'shared', 'core.js'),
         path.join(CONFLICTS, 'core.js__from_guarded_tool_pack_v2'));
stats.conflicts.push({ file: 'shared/core.js', resolution: 'v3 (1210 lines) used as canonical; v1+v2 in conflicts/' });

// ── Merge run-tool.js: all identical → single canonical copy ─────────────────
// They're all 3 lines, identical — just copy one
copyFile(path.join(PACKS[0].dir, 'run-tool.js'), path.join(TARGET, 'run-tool.js'));

// ── Merge registry JSON files ─────────────────────────────────────────────────
let allTools = [];
let allAliases = {};
let allPlaybooks = { playbooks: [] };
let allCategories = { categories: {} };

for (const pack of PACKS) {
  const reg = path.join(pack.dir, 'registry');

  // tools_index.json
  const tools = readJson(path.join(reg, 'tools_index.json'));
  if (tools && Array.isArray(tools.tools)) {
    const tagged = tools.tools.map(t => ({ ...t, source_pack: pack.name }));
    allTools.push(...tagged);
  }

  // tool_aliases.json
  const aliases = readJson(path.join(reg, 'tool_aliases.json'));
  if (aliases && typeof aliases === 'object') {
    Object.assign(allAliases, aliases);
  }

  // playbooks.json
  const pb = readJson(path.join(reg, 'playbooks.json'));
  if (pb && Array.isArray(pb.playbooks)) {
    allPlaybooks.playbooks.push(...pb.playbooks);
  }

  // tool_categories.json
  const cats = readJson(path.join(reg, 'tool_categories.json'));
  if (cats && cats.categories) {
    for (const [k, v] of Object.entries(cats.categories)) {
      if (!allCategories.categories[k]) allCategories.categories[k] = v;
      else allCategories.categories[k] = [...new Set([...allCategories.categories[k], ...v])];
    }
  }

  // Copy pack README to docs/
  const readme = path.join(pack.dir, 'README.md');
  if (fs.existsSync(readme)) {
    copyFile(readme, path.join(TARGET, 'docs', `README_${pack.name}.md`));
  }
}

// Deduplicate tools by id (prefer later pack = higher version wins)
const seenIds = new Map();
for (const t of allTools) {
  seenIds.set(t.id, t);
}
const dedupedTools = Array.from(seenIds.values());

// Write unified registry
const reg = path.join(TARGET, 'registry');
writeJson(path.join(reg, 'tools_index.json'),       { tools: dedupedTools, generated: new Date().toISOString(), total: dedupedTools.length });
writeJson(path.join(reg, 'tool_aliases.json'),       allAliases);
writeJson(path.join(reg, 'playbooks.json'),          allPlaybooks);
writeJson(path.join(reg, 'tool_categories.json'),    allCategories);

// ── integration_manifest.json ─────────────────────────────────────────────────
const manifest = {
  generated: new Date().toISOString(),
  total_tools_in_registry: dedupedTools.length,
  total_files_copied: stats.total_copied,
  total_conflicts: stats.total_conflicts + 1, // +1 for core.js
  total_duplicates_merged: 0,
  categories: stats.by_category,
  by_pack: stats.by_pack,
  conflicts: stats.conflicts,
  notes: [
    'run-tool.js was identical across all 3 packs — single copy used',
    'shared/core.js: v3 (repo_coder_tool_pack_v3, 1210 lines) used as canonical',
    'scripts/text/top_words.js: v1 version kept as canonical (first placed), v3 moved to conflicts',
    'v1 scripts/paths/ and scripts/safe_write/ mapped to files/ category',
    'v3 scripts/git/ mapped to repo/ category',
    'v3 scripts/quality/ mapped to indexing/ category',
    'v3 scripts/context/ mapped to reports/ category',
  ],
};
writeJson(path.join(reg, 'integration_manifest.json'), manifest);

// ── TOOL_QUICK_LOOKUP.md ──────────────────────────────────────────────────────
const byCategory = {};
for (const t of dedupedTools) {
  const cat = t.category || 'uncategorized';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(t);
}

let lookup = `# Tool Quick Lookup\n\nGenerated: ${new Date().toISOString()}\nTotal tools: ${dedupedTools.length}\n\n`;
lookup += `## How to find tools fast\n- Search registry: \`node run-tool.js --search <keyword>\`\n- List by category: \`node run-tool.js --list <category>\`\n- Run tool: \`node run-tool.js --tool <id> [args]\`\n- Print metadata: \`node run-tool.js --meta <id>\`\n\n`;
lookup += `## Categories\n\n`;

for (const [cat, tools] of Object.entries(byCategory).sort()) {
  lookup += `### ${cat} (${tools.length} tools)\n`;
  for (const t of tools.sort((a,b) => (a.id||'').localeCompare(b.id||''))) {
    const risk = t.risk_level ? ` [${t.risk_level}]` : '';
    lookup += `- \`${t.id}\`${risk} — ${t.description || t.title || ''}\n`;
  }
  lookup += '\n';
}
writeText(path.join(reg, 'TOOL_QUICK_LOOKUP.md'), lookup);

// ── INTEGRATION_REPORT.md ─────────────────────────────────────────────────────
const report = `# Integration Report

Generated: ${new Date().toISOString()}

## What Was Found

Three tool packs at repo root:
- \`tiny_tool_pack_v1.zip\` — 140 files, 7 script categories (csv, files, json, paths, repo, safe_write, system, text)
- \`guarded_tool_pack_v2.zip\` — 126 files, 6 script categories (cleanup, network, policy, processes, services, startup, system)
- \`repo_coder_tool_pack_v3.zip\` — 150 files, 7 script categories (code, context, deps, git, quality, repo, text)

Total scripts across all packs: ~${stats.total_copied + stats.total_conflicts} JS files

## What Was Unpacked

Each zip was extracted to \`taskmanager/brain/scripts/_staging/<pack_name>/\`.

## How Files Were Reorganized

Category mapping applied:

| Pack | Source Folder | Target Folder |
|------|--------------|---------------|
| v1 | scripts/csv/ | csv/ |
| v1 | scripts/files/ | files/ |
| v1 | scripts/json/ | json/ |
| v1 | scripts/paths/ | files/ |
| v1 | scripts/repo/ | repo/ |
| v1 | scripts/safe_write/ | files/ |
| v1 | scripts/system/ | system/ |
| v1 | scripts/text/ | text/ |
| v2 | scripts/cleanup/ | cleanup/ |
| v2 | scripts/network/ | network/ |
| v2 | scripts/policy/ | policy/ |
| v2 | scripts/processes/ | process/ |
| v2 | scripts/services/ | services/ |
| v2 | scripts/startup/ | startup/ |
| v2 | scripts/system/ | system/ |
| v3 | scripts/code/ | code/ |
| v3 | scripts/context/ | reports/ |
| v3 | scripts/deps/ | indexing/ |
| v3 | scripts/git/ | repo/ |
| v3 | scripts/quality/ | indexing/ |
| v3 | scripts/repo/ | repo/ |
| v3 | scripts/text/ | text/ |

## Conflicts

${stats.conflicts.map(c => `- **${c.file}**: ${c.resolution}`).join('\n')}

Non-canonical versions moved to \`staging_review/conflicts/\`.

## What Was Merged

- \`registry/tools_index.json\` — merged from all 3 packs, ${dedupedTools.length} total tools, deduplicated by id
- \`registry/tool_aliases.json\` — merged (last-write wins per key)
- \`registry/playbooks.json\` — all playbooks concatenated
- \`registry/tool_categories.json\` — union of all category definitions

## Counts by Category

${Object.entries(stats.by_category).sort().map(([k,v]) => `- ${k}: ${v} scripts`).join('\n')}

## What Still Needs Review

- \`staging_review/conflicts/\` contains ${stats.total_conflicts + 2} files that had naming conflicts — inspect before deleting
- The \`staging_review/\` and \`_staging/\` folders can be removed once integration is verified
- Some tool entries in the registry may have sparse metadata (tool packs vary in documentation quality)
- The \`run-tool.js\` runner uses \`require('./core/core.js')\` — verify the path is correct for the merged location

## Recommended Next Cleanup Actions

1. Run \`node run-tool.js --list\` to verify registry loads
2. Inspect \`staging_review/conflicts/\` and delete if not needed
3. Delete \`_staging/\` once verified
4. Update \`run-tool.js\` require path if needed (\`./core/core\` vs \`./shared/core\`)
`;
writeText(path.join(TARGET, 'docs', 'INTEGRATION_REPORT.md'), report);

// ── AI_USAGE_GUIDE.md ─────────────────────────────────────────────────────────
const guide = `# AI Usage Guide — Tool Registry

This guide is for orchestrator AIs that need to find and invoke tools quickly.

## Registry Location

\`\`\`
taskmanager/brain/scripts/registry/
  tools_index.json        ← canonical list of all tools (${dedupedTools.length} entries)
  tool_aliases.json       ← short-name → tool-id aliases
  playbooks.json          ← named multi-step workflows
  tool_categories.json    ← category definitions
  TOOL_QUICK_LOOKUP.md    ← human-readable overview by category
\`\`\`

## How to Search for Tools Fast

### By keyword (CLI):
\`\`\`
node taskmanager/brain/scripts/run-tool.js --search <keyword>
\`\`\`

### By category (CLI):
\`\`\`
node taskmanager/brain/scripts/run-tool.js --list <category>
\`\`\`

### From JSON directly:
Load \`registry/tools_index.json\`. Each entry has:
- \`id\` — stable identifier, use this to invoke the tool
- \`description\` — one-line purpose
- \`category\` — which subfolder the script lives in
- \`risk_level\` — low / medium / high
- \`requires_confirmation\` — true if destructive
- \`supports_dry_run\` — true if safe to preview
- \`intent_examples\` — natural language examples of when to use this tool
- \`entrypoint\` — relative path to the script file
- \`source_pack\` — which pack it came from

## Category Overview

| Category | What's in it | Risk |
|----------|-------------|------|
| csv | CSV analysis, column stats, sampling | low |
| files | File listing, search, tree, safe writes, path utils | low |
| text | Line/word counts, grep, extract patterns, headings | low |
| json | JSON inspection, schema guess, pretty-print | low |
| repo | Repo structure, entrypoints, imports, git | low |
| code | JS/TS/Python symbol extraction, import graphs, quality | low |
| indexing | Dependency inventory, workspace scan, quality metrics | low |
| reports | Context packs, handoffs, briefs, portability reports | low |
| system | OS info, CPU, memory, disk, env vars, file hashes | low |
| process | List/find/kill processes, snapshots, tree | low–high |
| services | List/start/stop/restart Windows services | medium–high |
| startup | Windows startup entry analysis | low–medium |
| network | TCP/UDP connections, port scan, snapshots | low |
| cleanup | Temp file candidates, cleanup analysis | low–medium |
| policy | Approval rules, preflight checks, risk reports | low |
| playbooks | Multi-step workflow templates | varies |

## Identifying Safe vs Risky Tools

Check \`risk_level\` field in registry entry:
- **low** — read-only, safe to run anytime
- **medium** — writes files or modifies state; prefer dry-run first
- **high** — kills processes, stops services, irreversible; requires confirmation

Always check \`requires_confirmation: true\` before invoking process/service kill tools.
Always check \`supports_dry_run: true\` and pass \`--dry-run\` when available.

## How to Invoke a Tool

\`\`\`
node taskmanager/brain/scripts/run-tool.js --tool <id> [--path <dir>] [--dry-run]
\`\`\`

## How to Use Aliases

\`registry/tool_aliases.json\` maps short names to full tool ids:
\`\`\`json
{ "ls": "files.list_files", "top-cpu": "process.top_cpu_processes", ... }
\`\`\`

## How to Use Playbooks

\`registry/playbooks.json\` contains named sequences:
\`\`\`json
{ "playbooks": [{ "name": "repo-audit", "steps": ["repo.repo_file_inventory", "repo.likely_entrypoints", ...] }] }
\`\`\`

Invoke a playbook:
\`\`\`
node taskmanager/brain/scripts/run-tool.js --playbook <name> [--path <dir>]
\`\`\`

## Token Efficiency Tips

1. Use \`TOOL_QUICK_LOOKUP.md\` for a compact overview — don't load all 300+ registry entries
2. Filter by category before searching by keyword
3. Use \`intent_examples\` field to match natural language requests
4. Prefer low-risk read-only tools first; escalate to action tools only if needed
`;
writeText(path.join(TARGET, 'docs', 'AI_USAGE_GUIDE.md'), guide);

// ── Final summary ─────────────────────────────────────────────────────────────
console.log('=== Integration complete ===');
console.log(`Scripts copied:     ${stats.total_copied}`);
console.log(`Conflicts handled:  ${stats.total_conflicts + 2}`);
console.log(`Registry tools:     ${dedupedTools.length}`);
console.log(`Categories:         ${Object.keys(stats.by_category).join(', ')}`);
console.log('');
console.log('Files created:');
console.log('  registry/tools_index.json');
console.log('  registry/tool_aliases.json');
console.log('  registry/playbooks.json');
console.log('  registry/tool_categories.json');
console.log('  registry/TOOL_QUICK_LOOKUP.md');
console.log('  registry/integration_manifest.json');
console.log('  docs/INTEGRATION_REPORT.md');
console.log('  docs/AI_USAGE_GUIDE.md');
console.log('  core/core.js (from v3)');
console.log('  run-tool.js (unified)');
