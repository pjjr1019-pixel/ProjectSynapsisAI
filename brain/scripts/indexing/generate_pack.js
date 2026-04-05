const fs = require("fs");
const path = require("path");
const {
  TOOL_DEFINITIONS,
  TOOL_ALIASES,
  PLAYBOOKS,
  getCategoryCounts,
} = require("./tool_catalog");

const SCRIPTS_ROOT = path.resolve(__dirname, "..");
const REGISTRY_DIR = path.join(SCRIPTS_ROOT, "registry");
const DOCS_DIR = path.join(SCRIPTS_ROOT, "docs");
const STAGING_REVIEW_DIR = path.join(SCRIPTS_ROOT, "staging_review");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, `${value}\n`, "utf8");
}

function toWindowsPath(value) {
  return String(value).split(path.sep).join("/");
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  return groups;
}

function countRisks(items) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const item of items) {
    const risk = String(item.risk_level || "low").toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(counts, risk)) counts[risk] = 0;
    counts[risk] += 1;
  }
  return counts;
}

function createWrapper(tool) {
  const relativeEntry = toWindowsPath(tool.entrypoint);
  const parentDepth = relativeEntry.split("/").length - 1;
  const runtimeRequire = "../".repeat(parentDepth) + "core/runtime";
  return [
    "#!/usr/bin/env node",
    `const { parseCliArgs, runTool } = require('${runtimeRequire}');`,
    "const args = parseCliArgs(process.argv);",
    `const result = runTool('${tool.id}', args);`,
    "process.stdout.write(`${JSON.stringify(result, null, 2)}\\n`);",
    "",
  ].join("\n");
}

function buildQuickLookup(tools, aliases) {
  const lines = [];
  lines.push("# Tool Quick Lookup");
  lines.push("");
  lines.push("Use `run-tool.js` for discovery and execution. Search the registry first, then run the tool by id.");
  lines.push("");
  lines.push("## Fast Commands");
  lines.push("");
  lines.push("- `node run-tool.js list_tools`");
  lines.push("- `node run-tool.js registry_search --query \"top memory\"`");
  lines.push("- `node run-tool.js top_memory_processes --limit 15`");
  lines.push("- `node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false`");
  lines.push("");
  lines.push("## Common Aliases");
  lines.push("");
  for (const [phrase, toolId] of Object.entries(aliases)) {
    lines.push(`- ${phrase} -> ${toolId}`);
  }
  lines.push("");
  lines.push("## Categories");
  lines.push("");
  const byCategory = groupByCategory(tools);
  for (const [category, rows] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${category} (${rows.length})`);
    for (const tool of rows) {
      lines.push(`- ${tool.id}: ${tool.title}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildUsageGuide(tools, aliases, playbooks) {
  const counts = getCategoryCounts();
  const total = tools.length;
  const riskCounts = countRisks(tools);
  return [
    "# AI Usage Guide",
    "",
    "This pack provides a Windows-backed Task Manager style tool layer for AI orchestration.",
    "",
    "## Registry",
    "",
    "- Registry index: `registry/tools_index.json`",
    "- Aliases: `registry/tool_aliases.json`",
    "- Playbooks: `registry/playbooks.json`",
    "- Quick lookup: `registry/TOOL_QUICK_LOOKUP.md`",
    "",
    "## How to find tools fast",
    "",
    "1. Run `node run-tool.js registry_search --query \"<intent>\"`.",
    "2. Read the top tool ids and aliases.",
    "3. Run the tool by id with explicit arguments.",
    "",
    "## Risk model",
    "",
    "- `low`: read-only inspection.",
    "- `medium`: limited or reversible action with dry-run support.",
    "- `high`: destructive or service/process control action and requires approval.",
    "- `critical`: protected or stability-sensitive action and requires approval.",
    "",
    `Current counts: ${JSON.stringify({ total, risks: riskCounts, categories: counts })}`,
    "",
    "## Aliases and playbooks",
    "",
    "Alias phrases map human intent to tool ids. Playbooks chain multiple tools for common workflows like triage, startup audit, and diagnostics bundles.",
    "",
    "## Runner usage",
    "",
    "- `node run-tool.js list_tools`",
    "- `node run-tool.js tool_info --id top_memory_processes`",
    "- `node run-tool.js registry_search --query \"list services\"`",
    "- `node run-tool.js top_memory_processes --limit 15`",
    "- `node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false`",
    "",
    "## Notes for orchestration",
    "",
    "- Prefer preview commands before any high-risk action.",
    "- Use exact process or service names when terminating or controlling a target.",
    "- Treat protected processes and services as non-targets unless there is explicit escalation.",
    "- Ask for the smallest useful tool result set first.",
    "",
    `Loaded aliases: ${Object.keys(aliases).length}; playbooks: ${playbooks.length}.`,
  ].join("\n");
}

function buildBackendNotes(tools) {
  const byCategory = groupByCategory(tools);
  return [
    "# Windows Task Manager Backend Notes",
    "",
    "This backend does not rely on the Windows Task Manager UI as its primary engine.",
    "It uses built-in Windows interfaces directly so an AI can inspect and act without UI automation.",
    "",
    "## Interfaces used",
    "",
    "- PowerShell `Get-Process`, `Get-CimInstance`, `Get-Service`, `Get-ScheduledTask`, `Get-NetIPConfiguration`, and `Get-Counter`.",
    "- Command-line tools: `tasklist`, `taskkill`, `sc.exe`, `schtasks`, and `netstat`.",
    "- File-system inspection for startup folders, temp locations, and stale log candidates.",
    "- Policy guards for protected processes and services.",
    "",
    "## Fallbacks",
    "",
    "- The pack prefers PowerShell and built-in Windows commands.",
    "- `wmic` is intentionally avoided unless a future tool needs a legacy fallback.",
    "- No Task Manager UI automation is used as the main execution path.",
    "",
    "## Limitations",
    "",
    "- Some command-line and executable-path data can be unavailable without sufficient privileges.",
    "- CPU per-process values are heuristic snapshots, not a live kernel counter feed.",
    "- Startup and scheduled task details vary by Windows build and policy.",
    "- Network and service data may differ slightly depending on local permissions.",
    "",
    "## Tool coverage",
    "",
    ...[...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).flatMap(([category, rows]) => [`- ${category}: ${rows.length} tools`]),
  ].join("\n");
}

function buildIntegrationReport(tools) {
  const byCategory = groupByCategory(tools);
  const risks = countRisks(tools);
  return [
    "# Integration Report",
    "",
    "This pack adds a Windows-backed Task Manager tool layer under `taskmanager/brain/scripts`.",
    "",
    "## What was created",
    "",
    `- ${tools.length} tool definitions in the registry.`,
    "- A unified runner at `run-tool.js`.",
    "- A reusable execution core at `core/runtime.js`.",
    "- Generated wrappers for each tool id under category folders.",
    "- Registry, alias, playbook, and quick lookup files.",
    "- AI-facing docs for usage, backend notes, and integration summary.",
    "",
    "## Safety controls",
    "",
    "- Protected process and service deny lists.",
    "- Dry-run previews for guarded mutations.",
    "- Approval requirement for high-risk process and service control.",
    "- Result envelopes with summary, warnings, errors, and metadata.",
    "",
    "## Remaining improvements",
    "",
    "- Expand GPU and disk-queue fidelity if a stable Windows signal is available.",
    "- Add more specialized cleanup and remediation actions if the policy model is extended.",
    "- Add deeper process ownership and session labeling if the target environment exposes it reliably.",
    "",
    `## Counts\n\n- Total tools: ${tools.length}\n- Risk counts: ${JSON.stringify(risks)}\n- Category counts: ${JSON.stringify(Object.fromEntries([...byCategory.entries()].map(([category, rows]) => [category, rows.length])))}`,
  ].join("\n");
}

function buildManifest(tools) {
  const categoryCounts = getCategoryCounts();
  const riskCounts = countRisks(tools);
  return {
    generated_at: new Date().toISOString(),
    pack_root: toWindowsPath(SCRIPTS_ROOT),
    total_tools: tools.length,
    tool_counts_by_category: categoryCounts,
    risk_counts: riskCounts,
    registry_files: [
      "registry/tools_index.json",
      "registry/tool_aliases.json",
      "registry/playbooks.json",
      "registry/TOOL_QUICK_LOOKUP.md",
    ],
    runner: "run-tool.js",
    validation: {
      json_validated: false,
      entrypoints_validated: false,
      syntax_validated: false,
      smoke_tested: false,
      runner_smoke_tested: false,
    },
    status: "generated",
  };
}

function main() {
  ensureDir(REGISTRY_DIR);
  ensureDir(DOCS_DIR);
  ensureDir(STAGING_REVIEW_DIR);

  for (const tool of TOOL_DEFINITIONS) {
    const entryPath = path.join(SCRIPTS_ROOT, tool.entrypoint);
    ensureDir(path.dirname(entryPath));
    writeText(entryPath, createWrapper(tool));
  }

  writeJson(path.join(REGISTRY_DIR, "tools_index.json"), TOOL_DEFINITIONS);
  writeJson(path.join(REGISTRY_DIR, "tool_aliases.json"), TOOL_ALIASES);
  writeJson(path.join(REGISTRY_DIR, "playbooks.json"), PLAYBOOKS);
  writeText(path.join(REGISTRY_DIR, "TOOL_QUICK_LOOKUP.md"), buildQuickLookup(TOOL_DEFINITIONS, TOOL_ALIASES));
  writeJson(path.join(REGISTRY_DIR, "integration_manifest.json"), buildManifest(TOOL_DEFINITIONS));
  writeText(path.join(DOCS_DIR, "AI_USAGE_GUIDE.md"), buildUsageGuide(TOOL_DEFINITIONS, TOOL_ALIASES, PLAYBOOKS));
  writeText(path.join(DOCS_DIR, "WINDOWS_TASKMANAGER_BACKEND_NOTES.md"), buildBackendNotes(TOOL_DEFINITIONS));
  writeText(path.join(DOCS_DIR, "INTEGRATION_REPORT.md"), buildIntegrationReport(TOOL_DEFINITIONS));
  writeText(path.join(STAGING_REVIEW_DIR, "README.md"), "# Staging Review\n\nPlace uncertain or platform-specific items here if they need manual review.");

  const categoryCounts = getCategoryCounts();
  process.stdout.write(`${JSON.stringify({ ok: true, total_tools: TOOL_DEFINITIONS.length, categories: categoryCounts }, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
