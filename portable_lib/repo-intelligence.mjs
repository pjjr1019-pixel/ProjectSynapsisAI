import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDir,
  normalizeSlashes,
  relPath,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const generatedRoot = path.join(repoRoot, "repo-intelligence");
const repoSupportRoot = path.join(repoRoot, "repo-support");
const agentsPath = path.join(repoRoot, "AGENTS.md");
const repoMapPath = path.join(repoRoot, "REPO_MAP.yaml");
const sourceScriptPath = path.join(repoRoot, "scripts", "lib", "repo-intelligence.mjs");

export const REPO_INTELLIGENCE_SCHEMA_VERSION = "1.0";

const REQUIRED_SYSTEM_IDS = [
  "repo.root",
  "repo.docs",
  "repo.ui.landing",
  "repo.server",
  "repo.desktop",
  "repo.scripts",
  "repo.tests",
  "repo.brain",
];

const REPO_SUPPORT_SOURCE_FILES = {
  subsystemContracts: path.join(repoSupportRoot, "subsystem-contracts.json"),
  taskPlaybooks: path.join(repoSupportRoot, "task-playbooks.json"),
  changeImpact: path.join(repoSupportRoot, "change-impact.json"),
};

function readRequiredJsonFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${relPath(repoRoot, filePath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${relPath(repoRoot, filePath)} (${error.message})`);
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizePathArray(value) {
  return normalizeStringArray(value).map((item) => normalizeSlashes(item));
}

function validateRepoSupportData(model, repoSupport) {
  const issues = [];
  const knownSystemIds = new Set(model.systems.map((system) => system.systemId));
  const knownTaskNames = new Set(model.taskRouting.map((entry) => entry.task));
  const knownCommands = new Set(
    model.entrypoints.commands.flatMap((entry) => [String(entry.name || "").trim(), String(entry.invoke || "").trim()]).filter(Boolean)
  );
  const seenContractIds = new Set();
  const seenPlaybookIds = new Set();
  const seenImpactIds = new Set();

  const pushIssue = (code, pathLabel, message) => {
    issues.push({ code, path: pathLabel, message });
  };

  const validatePaths = (paths, pathLabel) => {
    for (const rel of paths) {
      if (!fs.existsSync(path.join(repoRoot, rel))) {
        pushIssue("missing_path", pathLabel, `Referenced path is missing: ${rel}`);
      }
    }
  };

  const validateCommandRefs = (commands, pathLabel) => {
    for (const command of commands) {
      if (!knownCommands.has(command)) {
        pushIssue("unknown_command", pathLabel, `Unknown command reference: ${command}`);
      }
    }
  };

  for (const contract of repoSupport.subsystemContracts) {
    const pathLabel = `repo-support/subsystem-contracts.json:${contract.systemId || "unknown"}`;
    if (!contract.systemId || typeof contract.systemId !== "string") {
      pushIssue("missing_system_id", pathLabel, "Subsystem contract is missing systemId.");
      continue;
    }
    if (seenContractIds.has(contract.systemId)) {
      pushIssue("duplicate_system_id", pathLabel, `Duplicate subsystem contract: ${contract.systemId}`);
    }
    seenContractIds.add(contract.systemId);
    if (!knownSystemIds.has(contract.systemId)) {
      pushIssue("unknown_system", pathLabel, `Unknown systemId in subsystem contract: ${contract.systemId}`);
    }
    if (!String(contract.purpose || "").trim()) {
      pushIssue("missing_purpose", pathLabel, "Subsystem contract is missing purpose.");
    }
    validatePaths(contract.ownedPaths, `${pathLabel}:ownedPaths`);
    validatePaths(contract.generatedOrRuntimePaths, `${pathLabel}:generatedOrRuntimePaths`);
    for (const systemId of contract.readsFromSystems) {
      if (!knownSystemIds.has(systemId)) {
        pushIssue("unknown_system", `${pathLabel}:readsFromSystems`, `Unknown readsFromSystems reference: ${systemId}`);
      }
    }
    if (!contract.safeEditRules.length) {
      pushIssue("missing_safe_edit_rules", pathLabel, "Subsystem contract should define at least one safeEditRule.");
    }
    validateCommandRefs(contract.regenerationCommands, `${pathLabel}:regenerationCommands`);
    validateCommandRefs(contract.validationCommands, `${pathLabel}:validationCommands`);
  }

  for (const requiredSystemId of REQUIRED_SYSTEM_IDS) {
    if (!seenContractIds.has(requiredSystemId)) {
      pushIssue(
        "missing_contract",
        "repo-support/subsystem-contracts.json",
        `Missing subsystem contract for required system: ${requiredSystemId}`
      );
    }
  }

  for (const playbook of repoSupport.taskPlaybooks) {
    const pathLabel = `repo-support/task-playbooks.json:${playbook.taskId || "unknown"}`;
    if (!playbook.taskId || typeof playbook.taskId !== "string") {
      pushIssue("missing_task_id", pathLabel, "Task playbook is missing taskId.");
      continue;
    }
    if (seenPlaybookIds.has(playbook.taskId)) {
      pushIssue("duplicate_task_id", pathLabel, `Duplicate task playbook: ${playbook.taskId}`);
    }
    seenPlaybookIds.add(playbook.taskId);
    if (!knownTaskNames.has(playbook.routedTask)) {
      pushIssue("unknown_routed_task", pathLabel, `Unknown routedTask in playbook: ${playbook.routedTask}`);
    }
    if (!String(playbook.whenToUse || "").trim()) {
      pushIssue("missing_when_to_use", pathLabel, "Task playbook is missing whenToUse.");
    }
    for (const systemId of playbook.systemIds) {
      if (!knownSystemIds.has(systemId)) {
        pushIssue("unknown_system", `${pathLabel}:systemIds`, `Unknown systemId in playbook: ${systemId}`);
      }
    }
    validatePaths(playbook.primaryFiles, `${pathLabel}:primaryFiles`);
    if (!playbook.steps.length) {
      pushIssue("missing_steps", pathLabel, "Task playbook should define at least one step.");
    }
    validateCommandRefs(playbook.regenerationCommands, `${pathLabel}:regenerationCommands`);
    validateCommandRefs(playbook.validationCommands, `${pathLabel}:validationCommands`);
  }

  for (const taskName of knownTaskNames) {
    if (!repoSupport.taskPlaybooks.some((playbook) => playbook.routedTask === taskName)) {
      pushIssue("missing_playbook", "repo-support/task-playbooks.json", `Missing playbook for routed task: ${taskName}`);
    }
  }

  for (const rule of repoSupport.changeImpactRules) {
    const pathLabel = `repo-support/change-impact.json:${rule.ruleId || "unknown"}`;
    if (!rule.ruleId || typeof rule.ruleId !== "string") {
      pushIssue("missing_rule_id", pathLabel, "Change-impact rule is missing ruleId.");
      continue;
    }
    if (seenImpactIds.has(rule.ruleId)) {
      pushIssue("duplicate_rule_id", pathLabel, `Duplicate change-impact rule: ${rule.ruleId}`);
    }
    seenImpactIds.add(rule.ruleId);
    if (!String(rule.label || "").trim()) {
      pushIssue("missing_label", pathLabel, "Change-impact rule is missing label.");
    }
    for (const systemId of rule.systemIds) {
      if (!knownSystemIds.has(systemId)) {
        pushIssue("unknown_system", `${pathLabel}:systemIds`, `Unknown systemId in change-impact rule: ${systemId}`);
      }
    }
    validatePaths(rule.affectedPaths, `${pathLabel}:affectedPaths`);
    validatePaths(rule.downstreamArtifacts, `${pathLabel}:downstreamArtifacts`);
    validateCommandRefs(rule.requiredCommands, `${pathLabel}:requiredCommands`);
    if (!rule.riskNotes.length) {
      pushIssue("missing_risk_notes", pathLabel, "Change-impact rule should define at least one risk note.");
    }
  }

  return issues;
}

function loadRepoSupportData(model) {
  const subsystemContractsDoc = readRequiredJsonFile(REPO_SUPPORT_SOURCE_FILES.subsystemContracts, "subsystem contracts source");
  const taskPlaybooksDoc = readRequiredJsonFile(REPO_SUPPORT_SOURCE_FILES.taskPlaybooks, "task playbooks source");
  const changeImpactDoc = readRequiredJsonFile(REPO_SUPPORT_SOURCE_FILES.changeImpact, "change impact source");

  const repoSupport = {
    sourceFiles: Object.values(REPO_SUPPORT_SOURCE_FILES).map((filePath) => normalizeSlashes(relPath(repoRoot, filePath))),
    subsystemContracts: Array.isArray(subsystemContractsDoc?.contracts) ? subsystemContractsDoc.contracts : [],
    taskPlaybooks: Array.isArray(taskPlaybooksDoc?.playbooks) ? taskPlaybooksDoc.playbooks : [],
    changeImpactRules: Array.isArray(changeImpactDoc?.rules) ? changeImpactDoc.rules : [],
  };

  repoSupport.subsystemContracts = repoSupport.subsystemContracts.map((contract) => ({
    systemId: String(contract?.systemId || "").trim(),
    purpose: String(contract?.purpose || "").trim(),
    ownedPaths: normalizePathArray(contract?.ownedPaths),
    readsFromSystems: normalizeStringArray(contract?.readsFromSystems),
    generatedOrRuntimePaths: normalizePathArray(contract?.generatedOrRuntimePaths),
    safeEditRules: normalizeStringArray(contract?.safeEditRules),
    regenerationCommands: normalizeStringArray(contract?.regenerationCommands),
    validationCommands: normalizeStringArray(contract?.validationCommands),
  }));

  repoSupport.taskPlaybooks = repoSupport.taskPlaybooks.map((playbook) => ({
    taskId: String(playbook?.taskId || "").trim(),
    routedTask: String(playbook?.routedTask || "").trim(),
    whenToUse: String(playbook?.whenToUse || "").trim(),
    systemIds: normalizeStringArray(playbook?.systemIds),
    primaryFiles: normalizePathArray(playbook?.primaryFiles),
    steps: normalizeStringArray(playbook?.steps),
    regenerationCommands: normalizeStringArray(playbook?.regenerationCommands),
    validationCommands: normalizeStringArray(playbook?.validationCommands),
  }));

  repoSupport.changeImpactRules = repoSupport.changeImpactRules.map((rule) => ({
    ruleId: String(rule?.ruleId || "").trim(),
    label: String(rule?.label || "").trim(),
    systemIds: normalizeStringArray(rule?.systemIds),
    affectedPaths: normalizePathArray(rule?.affectedPaths),
    downstreamArtifacts: normalizePathArray(rule?.downstreamArtifacts),
    requiredCommands: normalizeStringArray(rule?.requiredCommands),
    riskNotes: normalizeStringArray(rule?.riskNotes),
  }));

  const issues = validateRepoSupportData(model, repoSupport);
  if (subsystemContractsDoc?.schemaVersion !== REPO_INTELLIGENCE_SCHEMA_VERSION) {
    issues.push({
      code: "schema_version_mismatch",
      path: "repo-support/subsystem-contracts.json",
      message: `Unsupported schemaVersion in repo-support/subsystem-contracts.json: ${subsystemContractsDoc?.schemaVersion ?? "missing"}`,
    });
  }
  if (!Array.isArray(subsystemContractsDoc?.contracts)) {
    issues.push({
      code: "missing_contracts_array",
      path: "repo-support/subsystem-contracts.json",
      message: "repo-support/subsystem-contracts.json must define a contracts array.",
    });
  }
  if (taskPlaybooksDoc?.schemaVersion !== REPO_INTELLIGENCE_SCHEMA_VERSION) {
    issues.push({
      code: "schema_version_mismatch",
      path: "repo-support/task-playbooks.json",
      message: `Unsupported schemaVersion in repo-support/task-playbooks.json: ${taskPlaybooksDoc?.schemaVersion ?? "missing"}`,
    });
  }
  if (!Array.isArray(taskPlaybooksDoc?.playbooks)) {
    issues.push({
      code: "missing_playbooks_array",
      path: "repo-support/task-playbooks.json",
      message: "repo-support/task-playbooks.json must define a playbooks array.",
    });
  }
  if (changeImpactDoc?.schemaVersion !== REPO_INTELLIGENCE_SCHEMA_VERSION) {
    issues.push({
      code: "schema_version_mismatch",
      path: "repo-support/change-impact.json",
      message: `Unsupported schemaVersion in repo-support/change-impact.json: ${changeImpactDoc?.schemaVersion ?? "missing"}`,
    });
  }
  if (!Array.isArray(changeImpactDoc?.rules)) {
    issues.push({
      code: "missing_rules_array",
      path: "repo-support/change-impact.json",
      message: "repo-support/change-impact.json must define a rules array.",
    });
  }
  if (issues.length) {
    const error = new Error(`Repo support data is invalid:\n${issues.map((issue) => `- ${issue.message}`).join("\n")}`);
    error.repoSupportIssues = issues;
    throw error;
  }

  return repoSupport;
}

function createRepoMapDefinition() {
  return {
    schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
    repo: {
      name: "Horizons AI",
      path: ".",
      purpose:
        "Local-first AI workspace combining a premium launcher UI, a structured brain system, and a retrieval/runtime layer.",
      primaryLanguages: ["JavaScript", "TypeScript", "Markdown", "YAML", "JSON"],
      docsStartHere: "doc/README.md",
      aiStartHere: "AGENTS.md",
      narrativeOverview: "context.md",
    },
    entrypoints: {
      files: [
        {
          path: "00_START_HERE_AI_TASK_TEMPLATE.md",
          role: "Prompt template for AI coding agents working in this repo.",
          system: "repo.root",
        },
        {
          path: "README.md",
          role: "Root orientation and quick start.",
          system: "repo.root",
        },
        {
          path: "context.md",
          role: "Narrative overview of the app and main systems.",
          system: "repo.root",
        },
        {
          path: "doc/README.md",
          role: "Human documentation hub.",
          system: "repo.docs",
        },
        {
          path: "package.json",
          role: "Root command registry for server, UI, brain tooling, and tests.",
          system: "repo.root",
        },
        {
          path: "start.bat",
          role: "Primary Windows launcher for the app.",
          system: "repo.root",
        },
        {
          path: "run-ui-dev.cmd",
          role: "Convenience helper for running the UI dev server.",
          system: "repo.root",
        },
        {
          path: "desktop/main.cjs",
          role: "Electron desktop entry point.",
          system: "repo.desktop",
        },
        {
          path: "server/index.mjs",
          role: "Local API entry point used by the UI and brain browser.",
          system: "repo.server",
        },
        {
          path: "UI-landing/package.json",
          role: "UI package command registry for Vite/TypeScript build and dev.",
          system: "repo.ui.landing",
        },
        {
          path: "taskmanager/package.json",
          role: "Standalone task-manager package command registry and Electron entry metadata.",
          system: "repo.taskmanager",
        },
        {
          path: "brain/README.md",
          role: "Brain system overview and conventions.",
          system: "repo.brain",
        },
        {
          path: "brain/MANIFEST.yaml",
          role: "Authoritative structural manifest for the brain directory.",
          system: "repo.brain",
        },
        {
          path: "brain/INDEX.md",
          role: "Catalog of key knowledge documents and retrieval anchors.",
          system: "repo.brain",
        },
      ],
      commands: [
        {
          name: "desktop-dev",
          invoke: "npm run desktop:dev",
          purpose: "Run the desktop shell with the local API and UI.",
          source: "package.json",
        },
        {
          name: "api-dev",
          invoke: "npm run dev:api",
          purpose: "Run the local API only.",
          source: "package.json",
        },
        {
          name: "ui-dev",
          invoke: "npm run dev --prefix UI-landing",
          purpose: "Run the Vite UI only.",
          source: "package.json",
        },
        {
          name: "build-landing",
          invoke: "npm run build:landing",
          purpose: "Build the launcher UI package.",
          source: "package.json",
        },
        {
          name: "taskmanager-ui-dev",
          invoke: "npm run taskmanager:dev",
          purpose: "Run the standalone task-manager Vite frontend.",
          source: "package.json",
        },
        {
          name: "taskmanager-build",
          invoke: "npm run taskmanager:build",
          purpose: "Build the standalone task-manager frontend package.",
          source: "package.json",
        },
        {
          name: "taskmanager-desktop-dev",
          invoke: "npm run taskmanager:desktop:dev",
          purpose: "Run the standalone task-manager Electron app.",
          source: "package.json",
        },
        {
          name: "taskmanager-test-core",
          invoke: "npm run taskmanager:test:core",
          purpose: "Run standalone task-manager core process-grouping coverage.",
          source: "package.json",
        },
        {
          name: "taskmanager-test-services",
          invoke: "npm run taskmanager:test:services",
          purpose: "Run standalone task-manager runtime service coverage.",
          source: "package.json",
        },
        {
          name: "build-brain-ir",
          invoke: "npm run build-brain-ir",
          purpose: "Rebuild brain runtime artifacts from current source.",
          source: "package.json",
        },
        {
          name: "rebuild-retrieval",
          invoke: "npm run rebuild-retrieval",
          purpose: "Refresh retrieval artifacts.",
          source: "package.json",
        },
        {
          name: "run-brain-evals",
          invoke: "npm run run-brain-evals",
          purpose: "Run retrieval/runtime evaluation cases.",
          source: "package.json",
        },
        {
          name: "repo-intel-build",
          invoke: "npm run repo:intel:build",
          purpose: "Rebuild AGENTS.md, REPO_MAP.yaml, and repo-intelligence artifacts.",
          source: "package.json",
        },
        {
          name: "repo-intel-validate",
          invoke: "npm run repo:intel:validate",
          purpose: "Validate the repo AI support layer for freshness and coverage.",
          source: "package.json",
        },
        {
          name: "repo-intel-test",
          invoke: "npm run repo:intel:test",
          purpose: "Run repo intelligence regression coverage.",
          source: "package.json",
        },
        {
          name: "brain-test",
          invoke: "npm run brain:test",
          purpose: "Run brain runtime regression coverage.",
          source: "package.json",
        },
        {
          name: "brain-browser-test",
          invoke: "npm run brain:test:browser",
          purpose: "Run Brain Browser regression coverage.",
          source: "package.json",
        },
      ],
    },
    authoritativeSources: [
      {
        id: "repo_docs_hub",
        path: "doc/README.md",
        purpose: "Primary human documentation entrypoint.",
      },
      {
        id: "repo_narrative_context",
        path: "context.md",
        purpose: "Narrative repo summary for quick orientation.",
      },
      {
        id: "root_command_registry",
        path: "package.json",
        purpose: "Defines root commands for runtime, builds, indexing, and tests.",
      },
      {
        id: "taskmanager_package",
        path: "taskmanager/package.json",
        purpose: "Defines standalone task-manager frontend and Electron commands.",
      },
      {
        id: "brain_manifest",
        path: "brain/MANIFEST.yaml",
        purpose: "Single source of truth for the brain directory layout and surfaces.",
      },
      {
        id: "brain_index",
        path: "brain/INDEX.md",
        purpose: "Catalog of important knowledge documents and retrieval anchors.",
      },
      {
        id: "brain_retrieval_profiles",
        path: "brain/retrieval/profiles.json",
        purpose: "Profile-specific retrieval policy and routing defaults.",
      },
      {
        id: "server_entry",
        path: "server/index.mjs",
        purpose: "Defines local API routes and UI/backend wiring.",
      },
      {
        id: "ui_entry",
        path: "UI-landing/src/main.tsx",
        purpose: "UI bootstrap entry for the launcher app.",
      },
      {
        id: "repo_support_contracts",
        path: "repo-support/subsystem-contracts.json",
        purpose: "Authored subsystem contracts for the AI support layer.",
      },
      {
        id: "repo_support_playbooks",
        path: "repo-support/task-playbooks.json",
        purpose: "Authored machine-readable task playbooks for common editing workflows.",
      },
      {
        id: "repo_support_change_impact",
        path: "repo-support/change-impact.json",
        purpose: "Authored change-impact rules used to generate repo intelligence artifacts.",
      },
    ],
    systems: [
      {
        systemId: "repo.root",
        path: ".",
        role: "Top-level project entry, command surface, and startup scripts.",
        whenToLookHere: [
          "starting the app",
          "finding root commands",
          "repo-wide orientation",
          "cross-system configuration",
        ],
        keyFiles: [
          { path: "00_START_HERE_AI_TASK_TEMPLATE.md", purpose: "Prompt template for AI task setup and repo-aware edit boundaries." },
          { path: "README.md", purpose: "Root quick-start and repo overview." },
          { path: "context.md", purpose: "Short narrative summary of the product and systems." },
          { path: "package.json", purpose: "Root script registry for server, UI, brain tooling, and tests." },
          { path: "start.bat", purpose: "Launch the full app on Windows." },
          { path: "run-ui-dev.cmd", purpose: "Convenience launcher for the UI dev workflow." },
          { path: ".env.example", purpose: "Template for local environment configuration." },
          { path: "repo-support/subsystem-contracts.json", purpose: "Authored subsystem contracts for AI support tooling." },
          { path: "repo-support/task-playbooks.json", purpose: "Authored task playbooks for common edit workflows." },
          { path: "repo-support/change-impact.json", purpose: "Authored change-impact rules for high-value paths." },
        ],
        keySubtrees: [
          { path: ".github", purpose: "GitHub workflow and automation configuration." },
          { path: "repo-support", purpose: "Authored machine-readable support manifests that feed repo-intelligence generation." },
        ],
        mutability: "mixed",
        safeToEdit: true,
        editVia: "Edit tracked root files directly; keep secrets in .env only.",
        authoritativeSource: "README.md",
        rebuildCommand: "npm run repo:intel:build",
        ownerHint: "platform",
        tags: ["entrypoint", "commands", "startup"],
      },
      {
        systemId: "repo.docs",
        path: "doc",
        role: "Human-readable design, architecture, onboarding, and workflow docs.",
        whenToLookHere: [
          "high-level architecture",
          "onboarding",
          "repository layout",
          "development workflow",
          "product summary",
        ],
        keyFiles: [
          { path: "doc/README.md", purpose: "Docs table of contents." },
          { path: "doc/about-me.md", purpose: "High-level product overview and current state summary." },
          { path: "doc/repository-layout.md", purpose: "Explains where major code and asset groups live." },
          { path: "doc/brain.md", purpose: "Explains the brain directory structure and responsibilities." },
          { path: "doc/ui-landing.md", purpose: "Launcher UI architecture and visual guidance." },
          { path: "doc/development.md", purpose: "Developer workflow, conventions, and commands." },
        ],
        keySubtrees: [],
        mutability: "authored",
        safeToEdit: true,
        editVia: "Edit markdown directly and keep it aligned with code changes.",
        authoritativeSource: "doc/README.md",
        ownerHint: "platform/docs",
        tags: ["docs", "architecture", "onboarding"],
      },
      {
        systemId: "repo.ui.landing",
        path: "UI-landing",
        role: "Vite + React launcher UI, including chat windows, crawler controls, and Brain Browser.",
        whenToLookHere: [
          "launcher visuals",
          "sidebar and settings",
          "Brain Browser UI",
          "chat windows",
          "scrollbars or layout styling",
        ],
        keyFiles: [
          { path: "UI-landing/package.json", purpose: "UI package scripts and dependencies." },
          { path: "UI-landing/src/main.tsx", purpose: "UI bootstrap entry point." },
          { path: "UI-landing/src/App.tsx", purpose: "Top-level app composition for the UI package." },
          { path: "UI-landing/src/index.css", purpose: "Global styles, including shared layout and scrollbar styling." },
          { path: "UI-landing/src/components/horizons-landing/HorizonsLandingPage.tsx", purpose: "Main landing page container and popout orchestration." },
          { path: "UI-landing/src/components/horizons-landing/LandingShellSidebar.tsx", purpose: "Left navigation, actions, and settings entry points." },
          { path: "UI-landing/src/components/horizons-landing/BrainBrowserPopoutWindow.tsx", purpose: "In-app brain file explorer and file viewer UI." },
        ],
        keySubtrees: [
          { path: "UI-landing/src/components/horizons-landing", purpose: "Main launcher UI component tree." },
          { path: "UI-landing/src/components/horizons-landing/styles", purpose: "Component-scoped styling helpers." },
          { path: "UI-landing/src/pages", purpose: "Page-level route containers." },
        ],
        mutability: "mixed",
        safeToEdit: true,
        editVia: "Edit source under UI-landing/src; do not edit UI-landing/dist.",
        authoritativeSource: "UI-landing/src",
        rebuildCommand: "npm run build --prefix UI-landing",
        ownerHint: "ui",
        tags: ["frontend", "react", "launcher", "brain-browser"],
      },
      {
        systemId: "repo.taskmanager",
        path: "taskmanager",
        role: "Standalone task-manager app with its own frontend, Electron shell, task-manager routes, and shared process-control logic.",
        whenToLookHere: [
          "standalone task manager UI",
          "task manager desktop shell",
          "task manager route composition",
          "process-control host",
          "task manager shared logic",
        ],
        keyFiles: [
          { path: "taskmanager/package.json", purpose: "Task-manager package scripts and Electron entry metadata." },
          { path: "taskmanager/src/App.tsx", purpose: "Standalone task-manager app shell." },
          { path: "taskmanager/desktop/main.cjs", purpose: "Standalone task-manager Electron main process." },
          { path: "taskmanager/desktop/runtime-host.cjs", purpose: "Shared desktop runtime host for telemetry, IPC, and process actions." },
          { path: "taskmanager/server/http-routes.mjs", purpose: "Task-manager-specific server route composition." },
          { path: "taskmanager/shared/task-manager-core.mjs", purpose: "Shared task-manager process grouping and protection logic." },
        ],
        keySubtrees: [
          { path: "taskmanager/src", purpose: "Standalone task-manager frontend source." },
          { path: "taskmanager/desktop", purpose: "Standalone Electron shell and desktop host helpers." },
          { path: "taskmanager/server", purpose: "Task-manager server/runtime models and route handlers." },
          { path: "taskmanager/shared", purpose: "Task-manager shared core logic and contracts." },
        ],
        mutability: "mixed",
        safeToEdit: true,
        editVia: "Edit taskmanager source directly; keep taskmanager/dist generated.",
        authoritativeSource: "taskmanager/src",
        rebuildCommand: "npm run build --prefix taskmanager",
        ownerHint: "taskmanager",
        tags: ["frontend", "electron", "task-manager", "desktop"],
      },
      {
        systemId: "repo.server",
        path: "server",
        role: "Local API server that bridges the UI to brain runtime, browser APIs, and settings.",
        whenToLookHere: ["API routes", "runtime settings endpoints", "Brain Browser file APIs", "chat backend wiring"],
        keyFiles: [
          { path: "server/index.mjs", purpose: "Main local API server and route registration." },
        ],
        keySubtrees: [],
        mutability: "authored",
        safeToEdit: true,
        editVia: "Edit the server entry directly and keep request/response contracts in sync with UI callers.",
        authoritativeSource: "server/index.mjs",
        ownerHint: "platform/backend",
        tags: ["server", "api", "runtime-bridge"],
      },
      {
        systemId: "repo.desktop",
        path: "desktop",
        role: "Electron shell that wraps the local API and UI into a desktop app.",
        whenToLookHere: ["desktop boot behavior", "Electron window setup", "browser vs desktop launch flow"],
        keyFiles: [
          { path: "desktop/main.cjs", purpose: "Electron process entry point." },
        ],
        keySubtrees: [],
        mutability: "authored",
        safeToEdit: true,
        editVia: "Edit the Electron main process directly.",
        authoritativeSource: "desktop/main.cjs",
        ownerHint: "platform/desktop",
        tags: ["electron", "desktop", "entrypoint"],
      },
      {
        systemId: "repo.scripts",
        path: "scripts",
        role: "Node CLI tooling for building, indexing, ingesting, evaluating, and maintaining the brain/runtime layer.",
        whenToLookHere: [
          "brain build pipeline",
          "retrieval indexing",
          "evals and diagnostics",
          "ingestion jobs",
          "runtime maintenance",
        ],
        keyFiles: [
          { path: "scripts/build-brain-ir.mjs", purpose: "CLI entry for rebuilding brain runtime artifacts." },
          { path: "scripts/rebuild-retrieval.mjs", purpose: "CLI entry for retrieval rebuilds." },
          { path: "scripts/build-embedding-store.mjs", purpose: "CLI entry for the dense retrieval pilot store." },
          { path: "scripts/update-brain-runtime.mjs", purpose: "Delta-aware runtime refresh orchestration." },
          { path: "scripts/ingest-live-financial.mjs", purpose: "Green-tier live financial ingestion entry." },
          { path: "scripts/ingest-live-intel.mjs", purpose: "Green-tier live intel ingestion entry." },
          { path: "scripts/ingest-bulk-dataset.mjs", purpose: "Bulk dataset ingestion entry." },
        ],
        keySubtrees: [
          { path: "scripts/lib", purpose: "Shared runtime, retrieval, browser, ingestion, and utility libraries." },
        ],
        mutability: "authored",
        safeToEdit: true,
        editVia: "Edit CLI scripts and shared libraries directly; rebuild derived artifacts after changing behavior.",
        authoritativeSource: "scripts/lib",
        ownerHint: "platform/runtime",
        tags: ["tooling", "runtime", "retrieval", "ingestion"],
      },
      {
        systemId: "repo.tests",
        path: "tests",
        role: "Node-based smoke, observability, browser, and runtime upgrade tests.",
        whenToLookHere: [
          "runtime regression checks",
          "browser safety checks",
          "new support-layer validation",
          "expected behavior examples",
        ],
        keyFiles: [
          { path: "tests/brain-ir-runtime.test.mjs", purpose: "Core runtime behavior and retrieval smoke coverage." },
          { path: "tests/brain-runtime-observability.test.mjs", purpose: "Trace, diagnostics, and runtime settings coverage." },
          { path: "tests/brain-runtime-upgrade.test.mjs", purpose: "Upgrade-path and new runtime capability coverage." },
          { path: "tests/brain-browser.test.mjs", purpose: "Brain Browser API and safety coverage." },
          { path: "tests/repo-intelligence.test.mjs", purpose: "Repo AI support layer build and validation checks." },
        ],
        keySubtrees: [],
        mutability: "authored",
        safeToEdit: true,
        editVia: "Edit tests directly and keep them aligned with runtime contracts.",
        authoritativeSource: "tests",
        ownerHint: "platform/qa",
        tags: ["tests", "smoke", "regression"],
      },
      {
        systemId: "repo.brain",
        path: "brain",
        role: "Central knowledge system: canonical docs, prompts, schemas, runtime data, retrieval profiles, imports, and learning pipeline.",
        whenToLookHere: [
          "knowledge documents",
          "retrieval profiles",
          "runtime artifacts",
          "imports and ingestion config",
          "prompts and governance",
        ],
        keyFiles: [
          { path: "brain/README.md", purpose: "Brain system overview and conventions." },
          { path: "brain/MANIFEST.yaml", purpose: "Authoritative structural manifest for the brain." },
          { path: "brain/INDEX.md", purpose: "Catalog of key knowledge documents and retrieval anchors." },
          { path: "brain/retrieval/profiles.json", purpose: "Retrieval policy per surface/profile." },
          { path: "brain/pipeline/ingestion-config.yaml", purpose: "Ingestion configuration for research and external-data lanes." },
        ],
        keySubtrees: [
          { path: "brain/core", purpose: "Shared contracts, safety defaults, and policy-level knowledge." },
          { path: "brain/apps", purpose: "Per-surface knowledge trees and app-specific content." },
          { path: "brain/governance", purpose: "Policies, rules, and safety constraints." },
          { path: "brain/prompts", purpose: "Prompt library and AI-facing behavior guides." },
          { path: "brain/retrieval", purpose: "Profiles, indexes, and retrieval artifacts." },
          { path: "brain/runtime", purpose: "Runtime logs, sessions, learning digests, and settings." },
          { path: "brain/pipeline", purpose: "Research intake plus raw/clean/state ingestion lanes." },
          { path: "brain/imports", purpose: "Imported knowledge packs and machine-acquired content layers." },
          { path: "brain/SCHEMAS", purpose: "Schemas for manifests and knowledge documents." },
        ],
        mutability: "mixed",
        safeToEdit: true,
        editVia: "Edit canonical/authored areas directly; avoid hand-editing generated indexes, runtime logs, or raw/clean pipeline artifacts.",
        authoritativeSource: "brain/MANIFEST.yaml",
        rebuildCommand: "npm run build-brain-ir",
        ownerHint: "platform/brain",
        tags: ["brain", "knowledge", "retrieval", "runtime", "ingestion"],
      },
    ],
    taskRouting: [
      {
        task: "launcher UI layout and styling",
        systemIds: ["repo.ui.landing"],
        focusPaths: [
          "UI-landing/src/components/horizons-landing/HorizonsLandingPage.tsx",
          "UI-landing/src/components/horizons-landing/LandingShellSidebar.tsx",
          "UI-landing/src/components/horizons-landing/LandingSidebarSettingsPanel.tsx",
          "UI-landing/src/index.css",
        ],
        guidance: "Start in the horizons-landing component tree and shared CSS.",
      },
      {
        task: "brain browser or file explorer UI",
        systemIds: ["repo.ui.landing", "repo.server", "repo.scripts"],
        focusPaths: [
          "UI-landing/src/components/horizons-landing/BrainBrowserPopoutWindow.tsx",
          "server/index.mjs",
          "scripts/lib/brain-browser.mjs",
        ],
        guidance: "The UI lives in the BrainBrowser popout; file access and summarization live in server and scripts/lib.",
      },
      {
        task: "chat runtime and answer composition",
        systemIds: ["repo.server", "repo.scripts", "repo.brain"],
        focusPaths: [
          "server/index.mjs",
          "scripts/lib/brain-chat-reply.mjs",
          "scripts/lib/brain-retrieval.mjs",
          "scripts/lib/brain-arbitration.mjs",
          "scripts/lib/brain-context-pack.mjs",
        ],
        guidance: "Start at the chat reply pipeline, then inspect retrieval, arbitration, and context packing.",
      },
      {
        task: "retrieval profiles, evals, and ranking",
        systemIds: ["repo.brain", "repo.scripts", "repo.tests"],
        focusPaths: [
          "brain/retrieval/profiles.json",
          "brain/evals/retrieval-eval-cases.json",
          "scripts/lib/brain-evals.mjs",
          "scripts/lib/brain-rerank.mjs",
          "tests/brain-ir-runtime.test.mjs",
        ],
        guidance: "Profiles define policy, eval cases define expected outcomes, and scripts/lib holds ranking behavior.",
      },
      {
        task: "external ingestion and compliance",
        systemIds: ["repo.brain", "repo.scripts"],
        focusPaths: [
          "brain/pipeline/ingestion-config.yaml",
          "scripts/ingest-live-financial.mjs",
          "scripts/ingest-live-intel.mjs",
          "scripts/ingest-bulk-dataset.mjs",
          "scripts/lib/brain-ingestion-utils.mjs",
          "scripts/lib/brain-compliance.mjs",
          "scripts/lib/brain-provenance.mjs",
        ],
        guidance: "Ingestion policy lives in brain/pipeline; executable jobs and compliance helpers live in scripts.",
      },
      {
        task: "crawler, idle training, and runtime settings",
        systemIds: ["repo.scripts", "repo.server", "repo.ui.landing"],
        focusPaths: [
          "scripts/lib/brain-idle-training.mjs",
          "scripts/lib/brain-runtime-settings.mjs",
          "server/index.mjs",
          "UI-landing/src/components/horizons-landing/LandingSidebarSettingsPanel.tsx",
        ],
        guidance: "Worker behavior is in scripts/lib; settings API is in server; the UI control surface is in the landing sidebar.",
      },
      {
        task: "standalone task manager frontend and desktop shell",
        systemIds: ["repo.taskmanager", "repo.desktop", "repo.server"],
        focusPaths: [
          "taskmanager/src/App.tsx",
          "taskmanager/desktop/main.cjs",
          "taskmanager/server/http-routes.mjs",
          "taskmanager/shared/task-manager-core.mjs",
        ],
        guidance: "Start in taskmanager/ for the standalone UI and desktop host, then confirm stable integration points in the root desktop shell and API.",
      },
      {
        task: "docs, architecture, and repo orientation",
        systemIds: ["repo.root", "repo.docs", "repo.brain"],
        focusPaths: [
          "AGENTS.md",
          "REPO_MAP.yaml",
          "context.md",
          "doc/README.md",
          "doc/repository-layout.md",
          "brain/MANIFEST.yaml",
        ],
        guidance: "Start with AGENTS and REPO_MAP, then follow the docs hub and brain manifest.",
      },
      {
        task: "tests and regression coverage",
        systemIds: ["repo.tests", "repo.scripts", "repo.brain"],
        focusPaths: [
          "tests/brain-ir-runtime.test.mjs",
          "tests/brain-runtime-observability.test.mjs",
          "tests/brain-runtime-upgrade.test.mjs",
          "tests/brain-browser.test.mjs",
          "tests/repo-intelligence.test.mjs",
        ],
        guidance: "Tests are plain Node scripts; use them as executable specifications for runtime behavior.",
      },
    ],
    generatedAreas: [
      {
        path: "repo-intelligence",
        mutability: "generated",
        safeToEdit: false,
        editVia: "npm run repo:intel:build",
        authoritativeSource: "scripts/lib/repo-intelligence.mjs",
        rebuildCommand: "npm run repo:intel:build",
        reason: "Derived AI support bundle generated from the curated repo map.",
      },
      {
        path: "brain/runtime",
        mutability: "runtime",
        safeToEdit: false,
        editVia: "Use runtime commands and UI workflows; do not hand-edit logs or session artifacts.",
        authoritativeSource: "brain/README.md",
        reason: "Operational runtime state, logs, digests, and session artifacts.",
      },
      {
        path: "brain/retrieval/indexes",
        mutability: "generated",
        safeToEdit: false,
        editVia: "Run build-brain-ir, rebuild-retrieval, or related indexing commands.",
        authoritativeSource: "scripts/build-brain-ir.mjs",
        rebuildCommand: "npm run rebuild-retrieval",
        reason: "Derived retrieval manifests and indexes.",
      },
      {
        path: "brain/pipeline/raw",
        mutability: "runtime",
        safeToEdit: false,
        editVia: "Populate through ingestion scripts only.",
        authoritativeSource: "brain/pipeline/ingestion-config.yaml",
        reason: "Raw fetched material kept out of normal authored flows.",
      },
      {
        path: "brain/pipeline/clean",
        mutability: "generated",
        safeToEdit: false,
        editVia: "Populate through ingestion scripts only.",
        authoritativeSource: "brain/pipeline/ingestion-config.yaml",
        reason: "Derived cleaned artifacts from external ingestion.",
      },
      {
        path: "brain/pipeline/state",
        mutability: "runtime",
        safeToEdit: false,
        editVia: "Update via ingestion state management only.",
        authoritativeSource: "brain/pipeline/ingestion-config.yaml",
        reason: "Incremental ingestion state, caches, and quarantine bookkeeping.",
      },
      {
        path: "UI-landing/dist",
        mutability: "generated",
        safeToEdit: false,
        editVia: "npm run build --prefix UI-landing",
        authoritativeSource: "UI-landing/src",
        rebuildCommand: "npm run build --prefix UI-landing",
        reason: "Bundled UI output.",
      },
      {
        path: "taskmanager/dist",
        mutability: "generated",
        safeToEdit: false,
        editVia: "npm run build --prefix taskmanager",
        authoritativeSource: "taskmanager/src",
        rebuildCommand: "npm run build --prefix taskmanager",
        reason: "Bundled standalone task-manager output.",
      },
      {
        path: "node_modules",
        mutability: "generated",
        safeToEdit: false,
        editVia: "npm install",
        authoritativeSource: "package.json",
        reason: "Installed dependencies, never hand-maintained as source.",
      },
      {
        path: ".codex-runtime",
        mutability: "runtime",
        safeToEdit: false,
        editVia: "Local tooling only.",
        authoritativeSource: "README.md",
        reason: "Local runtime and tooling logs.",
      },
    ],
    editPolicy: [
      { rule: "Prefer authored sources over generated or runtime artifacts." },
      { rule: "When a path is marked generated or runtime, follow editVia or rebuildCommand instead of hand-editing." },
      { rule: "For repo intelligence additions, edit repo-support/ or scripts/lib/repo-intelligence.mjs, then rebuild generated outputs." },
      { rule: "For brain structure, trust brain/MANIFEST.yaml and brain/INDEX.md before derived retrieval artifacts." },
      { rule: "For repo navigation, use REPO_MAP.yaml and repo-intelligence first, then dive into source files." },
    ],
  };
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function renderYamlScalar(value) {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(String(value ?? ""));
}

function renderYamlValue(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value
      .map((item) => {
        if (Array.isArray(item) || isPlainObject(item)) {
          return `${pad}-\n${renderYamlValue(item, indent + 2)}`;
        }
        return `${pad}- ${renderYamlScalar(item)}`;
      })
      .join("\n");
  }
  if (isPlainObject(value)) {
    const lines = [];
    for (const [key, item] of Object.entries(value)) {
      if (Array.isArray(item) && item.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else if (Array.isArray(item) || isPlainObject(item)) {
        lines.push(`${pad}${key}:`);
        lines.push(renderYamlValue(item, indent + 2));
      } else {
        lines.push(`${pad}${key}: ${renderYamlScalar(item)}`);
      }
    }
    return lines.join("\n");
  }
  return `${pad}${renderYamlScalar(value)}`;
}

function renderRepoMapYaml(model) {
  return `# Generated by npm run repo:intel:build\n${renderYamlValue(model)}\n`;
}

function renderAgentsMd(model) {
  const tasks = model.taskRouting
    .slice(0, 7)
    .map(
      (entry) =>
        `- **${entry.task}**: start with \`${entry.focusPaths[0]}\`${entry.focusPaths[1] ? ` and \`${entry.focusPaths[1]}\`` : ""}.`
    )
    .join("\n");

  const generated = model.generatedAreas
    .slice(0, 5)
    .map((entry) => `- \`${entry.path}\` (${entry.mutability})`)
    .join("\n");

  return `# AGENTS.md

Horizons AI is a local-first AI workspace with three main authored systems:

- \`UI-landing/\` for the launcher UI and Brain Browser
- \`server/\` + \`scripts/\` for the runtime, APIs, retrieval, and ingestion tooling
- \`brain/\` for canonical knowledge, prompts, schemas, retrieval profiles, imports, and runtime data

## Start Here

- **AI task prompt template**: [00_START_HERE_AI_TASK_TEMPLATE.md](00_START_HERE_AI_TASK_TEMPLATE.md)
- **Whole-repo locator**: [REPO_MAP.yaml](REPO_MAP.yaml)
- **Human docs hub**: [doc/README.md](doc/README.md)
- **Narrative repo summary**: [context.md](context.md)
- **Brain structural truth**: [brain/MANIFEST.yaml](brain/MANIFEST.yaml)
- **Brain knowledge catalog**: [brain/INDEX.md](brain/INDEX.md)
- **Command registry**: [package.json](package.json)

## Where To Start By Task

${tasks}

## Source-Of-Truth Guidance

- Prefer authored docs and source files over runtime logs or generated indexes.
- Treat \`brain/MANIFEST.yaml\`, \`brain/INDEX.md\`, \`doc/README.md\`, and \`package.json\` as authoritative entry documents.
- Use \`repo-support/\` as the authored source for subsystem contracts, task playbooks, and change-impact rules.
- Use \`repo-intelligence/\` for generated AI support artifacts, not as the primary authored source.

## Generated / Runtime Areas

Do not hand-edit these unless the task explicitly requires regenerating them:

${generated}

## Rebuild Commands

- \`npm run repo:intel:build\` regenerates this file, \`REPO_MAP.yaml\`, and \`repo-intelligence/\`
- \`npm run repo:intel:validate\` checks freshness, coverage, and missing-path drift
- \`npm run build-brain-ir\` refreshes the brain runtime layer
- \`npm run rebuild-retrieval\` refreshes retrieval artifacts
`;
}

function uniquePaths(items) {
  return [...new Set(items.filter(Boolean).map((value) => normalizeSlashes(value)))];
}

function makePathPurposeIndex(model) {
  const rows = [];
  const pushRow = (row) => {
    rows.push({
      path: normalizeSlashes(row.path),
      kind: row.kind,
      system: row.system || null,
      purpose: row.purpose,
      mutability: row.mutability || null,
      ownerHint: row.ownerHint || null,
      tags: [...new Set((row.tags || []).map((tag) => String(tag)))].sort(),
      authoritativeSource: row.authoritativeSource || null,
    });
  };

  for (const system of model.systems) {
    pushRow({
      path: system.path,
      kind: "system",
      system: system.systemId,
      purpose: system.role,
      mutability: system.mutability,
      ownerHint: system.ownerHint,
      tags: system.tags,
      authoritativeSource: system.authoritativeSource,
    });
    for (const file of system.keyFiles) {
      pushRow({
        path: file.path,
        kind: "file",
        system: system.systemId,
        purpose: file.purpose,
        mutability: system.mutability,
        ownerHint: system.ownerHint,
        tags: system.tags,
        authoritativeSource: system.authoritativeSource,
      });
    }
    for (const subtree of system.keySubtrees) {
      pushRow({
        path: subtree.path,
        kind: "subtree",
        system: system.systemId,
        purpose: subtree.purpose,
        mutability: system.mutability,
        ownerHint: system.ownerHint,
        tags: system.tags,
        authoritativeSource: system.authoritativeSource,
      });
    }
  }

  for (const source of model.authoritativeSources) {
    pushRow({
      path: source.path,
      kind: "authoritative-source",
      purpose: source.purpose,
      mutability: "authored",
      tags: ["authoritative", "source-of-truth"],
      authoritativeSource: source.path,
    });
  }

  for (const area of model.generatedAreas) {
    pushRow({
      path: area.path,
      kind: "generated-area",
      purpose: area.reason,
      mutability: area.mutability,
      tags: ["generated-boundary"],
      authoritativeSource: area.authoritativeSource,
    });
  }

  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

function jsonLine(value) {
  return JSON.stringify(value);
}

function writeTextIfChanged(filePath, nextText) {
  ensureDir(path.dirname(filePath));
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === nextText) return { changed: false, bytes: Buffer.byteLength(nextText, "utf8") };
  fs.writeFileSync(filePath, nextText, "utf8");
  return { changed: true, bytes: Buffer.byteLength(nextText, "utf8") };
}

function renderJsonLines(rows) {
  return rows.map((row) => jsonLine(row)).join("\n") + "\n";
}

function buildArtifacts(model, repoSupport) {
  const systems = model.systems.map((system) => ({
    systemId: system.systemId,
    path: normalizeSlashes(system.path),
    role: system.role,
    whenToLookHere: system.whenToLookHere,
    keyFiles: system.keyFiles.map((file) => file.path),
    keySubtrees: system.keySubtrees.map((subtree) => subtree.path),
    mutability: system.mutability,
    safeToEdit: system.safeToEdit,
    editVia: system.editVia,
    authoritativeSource: system.authoritativeSource,
    rebuildCommand: system.rebuildCommand || null,
    ownerHint: system.ownerHint || null,
    tags: system.tags || [],
  }));

  const pathPurposeIndex = makePathPurposeIndex(model);
  const boundaries = [
    ...model.systems.map((system) => ({
      path: normalizeSlashes(system.path),
      scope: system.systemId,
      mutability: system.mutability,
      safeToEdit: system.safeToEdit,
      editVia: system.editVia,
      authoritativeSource: system.authoritativeSource,
      rebuildCommand: system.rebuildCommand || null,
    })),
    ...model.generatedAreas.map((area) => ({
      path: normalizeSlashes(area.path),
      scope: "generated-area",
      mutability: area.mutability,
      safeToEdit: area.safeToEdit,
      editVia: area.editVia,
      authoritativeSource: area.authoritativeSource,
      rebuildCommand: area.rebuildCommand || null,
    })),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const generatedVsCanonical = {
    artifactType: "repo-generated-vs-canonical",
    schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
    authored: model.systems
      .filter((system) => system.mutability === "authored")
      .map((system) => ({
        path: system.path,
        authoritativeSource: system.authoritativeSource,
        reason: system.role,
      })),
    mixed: model.systems
      .filter((system) => system.mutability === "mixed")
      .map((system) => ({
        path: system.path,
        authoritativeSource: system.authoritativeSource,
        reason: system.role,
      })),
    generated: model.generatedAreas
      .filter((area) => area.mutability === "generated")
      .map((area) => ({
        path: area.path,
        authoritativeSource: area.authoritativeSource,
        rebuildCommand: area.rebuildCommand || null,
        reason: area.reason,
      })),
    runtime: model.generatedAreas
      .filter((area) => area.mutability === "runtime")
      .map((area) => ({
        path: area.path,
        authoritativeSource: area.authoritativeSource,
        reason: area.reason,
      })),
  };

  return {
    "entrypoints.json": {
      artifactType: "repo-entrypoints",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      files: model.entrypoints.files,
      commands: model.entrypoints.commands,
    },
    "systems.json": {
      artifactType: "repo-systems",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      systems,
    },
    "edit-boundaries.json": {
      artifactType: "repo-edit-boundaries",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      rules: model.editPolicy,
      boundaries,
    },
    "generated-vs-canonical.json": generatedVsCanonical,
    "task-routing.json": {
      artifactType: "repo-task-routing",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      tasks: model.taskRouting,
    },
    "subsystem-contracts.json": {
      artifactType: "repo-subsystem-contracts",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      sourceFiles: repoSupport.sourceFiles,
      contracts: repoSupport.subsystemContracts,
    },
    "task-playbooks.json": {
      artifactType: "repo-task-playbooks",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      sourceFiles: repoSupport.sourceFiles,
      playbooks: repoSupport.taskPlaybooks,
    },
    "change-impact.json": {
      artifactType: "repo-change-impact",
      schemaVersion: REPO_INTELLIGENCE_SCHEMA_VERSION,
      sourceFiles: repoSupport.sourceFiles,
      rules: repoSupport.changeImpactRules,
    },
    "path-purpose-index.jsonl": renderJsonLines(pathPurposeIndex),
  };
}

function writeArtifacts(artifacts) {
  const outputs = [];
  ensureDir(generatedRoot);
  for (const [fileName, payload] of Object.entries(artifacts)) {
    const outputPath = path.join(generatedRoot, fileName);
    if (fileName.endsWith(".json")) {
      const result = writeJsonStable(outputPath, payload);
      outputs.push({ path: outputPath, changed: result.changed });
      continue;
    }
    if (fileName.endsWith(".jsonl")) {
      const result = writeTextIfChanged(outputPath, payload);
      outputs.push({ path: outputPath, changed: result.changed });
    }
  }
  return outputs;
}

function collectReferencedPaths(model, repoSupport) {
  return uniquePaths([
    ...model.entrypoints.files.map((entry) => entry.path),
    ...model.authoritativeSources.map((entry) => entry.path),
    ...model.generatedAreas.map((entry) => entry.path),
    ...model.systems.flatMap((system) => [
      system.path,
      ...system.keyFiles.map((entry) => entry.path),
      ...system.keySubtrees.map((entry) => entry.path),
    ]),
    ...model.taskRouting.flatMap((entry) => entry.focusPaths),
    ...repoSupport.sourceFiles,
    ...repoSupport.subsystemContracts.flatMap((contract) => [
      ...contract.ownedPaths,
      ...contract.generatedOrRuntimePaths,
    ]),
    ...repoSupport.taskPlaybooks.flatMap((playbook) => playbook.primaryFiles),
    ...repoSupport.changeImpactRules.flatMap((rule) => [
      ...rule.affectedPaths,
      ...rule.downstreamArtifacts,
    ]),
  ]);
}

function requiredOutputPaths() {
  return [
    agentsPath,
    repoMapPath,
    path.join(generatedRoot, "entrypoints.json"),
    path.join(generatedRoot, "systems.json"),
    path.join(generatedRoot, "path-purpose-index.jsonl"),
    path.join(generatedRoot, "edit-boundaries.json"),
    path.join(generatedRoot, "generated-vs-canonical.json"),
    path.join(generatedRoot, "task-routing.json"),
    path.join(generatedRoot, "subsystem-contracts.json"),
    path.join(generatedRoot, "task-playbooks.json"),
    path.join(generatedRoot, "change-impact.json"),
  ];
}

function fileContentsOrNull(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

export function getRepoIntelligencePaths() {
  return {
    repoRoot,
    generatedRoot,
    agentsPath,
    repoMapPath,
    sourceScriptPath,
  };
}

export function getRepoMapModel() {
  return createRepoMapDefinition();
}

export function buildRepoIntelligence(options = {}) {
  const { writeFiles = true, logger = console } = options;
  const model = createRepoMapDefinition();
  const repoSupport = loadRepoSupportData(model);
  const repoMapYaml = renderRepoMapYaml(model);
  const agentsMd = renderAgentsMd(model);
  const parsed = parseYaml(repoMapYaml.replace(/^#.*\n/, ""));
  const artifacts = buildArtifacts(model, repoSupport);

  if (!parsed || parsed.schemaVersion !== REPO_INTELLIGENCE_SCHEMA_VERSION) {
    throw new Error("Generated REPO_MAP.yaml failed round-trip parsing.");
  }

  const writes = [];
  if (writeFiles) {
    writes.push({ path: agentsPath, ...writeTextIfChanged(agentsPath, agentsMd) });
    writes.push({ path: repoMapPath, ...writeTextIfChanged(repoMapPath, repoMapYaml) });
    writes.push(...writeArtifacts(artifacts));
    logger?.log?.(`[repo-intel] wrote ${writes.length} artifact(s)`);
  }

  return {
    model,
    repoSupport,
    outputs: {
      agentsMd,
      repoMapYaml,
      artifacts,
    },
    writes,
  };
}

export function validateRepoIntelligence(options = {}) {
  const { requireGeneratedFiles = true } = options;
  const issues = [];
  const warnings = [];
  let built;

  try {
    built = buildRepoIntelligence({ writeFiles: false, logger: null });
  } catch (error) {
    const supportIssues = Array.isArray(error?.repoSupportIssues) ? error.repoSupportIssues : [];
    if (supportIssues.length) {
      issues.push(...supportIssues);
    } else {
      issues.push({
        code: "repo_support_invalid",
        path: "repo-support",
        message: error instanceof Error ? error.message : "Repo support data could not be loaded.",
      });
    }
    return {
      ok: false,
      issues,
      warnings,
      requiredOutputPaths: requiredOutputPaths().map((item) => relPath(repoRoot, item)),
    };
  }

  const referencedPaths = collectReferencedPaths(built.model, built.repoSupport);
  for (const rel of referencedPaths) {
    if (!fs.existsSync(path.join(repoRoot, rel))) {
      issues.push({
        code: "missing_path",
        path: rel,
        message: `Referenced path is missing: ${rel}`,
      });
    }
  }

  for (const systemId of REQUIRED_SYSTEM_IDS) {
    if (!built.model.systems.some((system) => system.systemId === systemId)) {
      issues.push({
        code: "missing_system",
        path: systemId,
        message: `Required system entry is missing: ${systemId}`,
      });
    }
  }

  const expectedRootFiles = [
    [agentsPath, built.outputs.agentsMd],
    [repoMapPath, built.outputs.repoMapYaml],
  ];
  for (const [filePath, expected] of expectedRootFiles) {
    const actual = fileContentsOrNull(filePath);
    if (requireGeneratedFiles && actual === null) {
      issues.push({
        code: "missing_generated_file",
        path: relPath(repoRoot, filePath),
        message: `Generated file is missing: ${relPath(repoRoot, filePath)}`,
      });
      continue;
    }
    if (actual !== null && actual !== expected) {
      issues.push({
        code: "out_of_sync",
        path: relPath(repoRoot, filePath),
        message: `Generated file is stale: ${relPath(repoRoot, filePath)}`,
      });
    }
  }

  for (const [fileName, payload] of Object.entries(built.outputs.artifacts)) {
    const outputPath = path.join(generatedRoot, fileName);
    const expected = fileName.endsWith(".json")
      ? `${stableStringify(payload)}\n`
      : String(payload);
    const actual = fileContentsOrNull(outputPath);
    if (requireGeneratedFiles && actual === null) {
      issues.push({
        code: "missing_generated_file",
        path: relPath(repoRoot, outputPath),
        message: `Generated artifact is missing: ${relPath(repoRoot, outputPath)}`,
      });
      continue;
    }
    if (actual !== null && actual !== expected) {
      issues.push({
        code: "out_of_sync",
        path: relPath(repoRoot, outputPath),
        message: `Generated artifact is stale: ${relPath(repoRoot, outputPath)}`,
      });
    }
  }

  const mapText = fileContentsOrNull(repoMapPath);
  if (mapText) {
    try {
      const parsedMap = parseYaml(mapText.replace(/^#.*\n/, ""));
      for (const key of [
        "schemaVersion",
        "repo",
        "entrypoints",
        "systems",
        "taskRouting",
        "authoritativeSources",
        "generatedAreas",
        "editPolicy",
      ]) {
        if (!Object.prototype.hasOwnProperty.call(parsedMap, key)) {
          issues.push({
            code: "missing_top_level_key",
            path: "REPO_MAP.yaml",
            message: `REPO_MAP.yaml is missing top-level key: ${key}`,
          });
        }
      }
    } catch (error) {
      issues.push({
        code: "invalid_yaml",
        path: "REPO_MAP.yaml",
        message: `REPO_MAP.yaml could not be parsed: ${error.message}`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    requiredOutputPaths: requiredOutputPaths().map((item) => relPath(repoRoot, item)),
  };
}
