import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_SYNAI_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_SYNAI_ROOT, "..");
const DEFAULT_ARTIFACTS_DIR = path.join(DEFAULT_SYNAI_ROOT, "artifacts");
const DEFAULT_CONTEXT_DIR = path.join(DEFAULT_SYNAI_ROOT, "context");
const DEFAULT_FILE_NOTES_DIR = path.join(DEFAULT_CONTEXT_DIR, "file-notes");
const DEFAULT_TASK_PACKS_DIR = path.join(DEFAULT_CONTEXT_DIR, "task-packs");
const DOC_FILENAMES = [
  "AGENT_GUIDE.md",
  "REPO_MAP.md",
  "BLAST_RADIUS.md",
  "ARCHITECTURE_SUMMARY.md",
];
const TASK_PACK_FILENAMES = [
  "bugfix.md",
  "refactor.md",
  "ui-change.md",
  "tests.md",
  "governed-actions.md",
];

const toPosixPath = (value) => value.split(path.sep).join("/");

const stableJson = (value) =>
  JSON.stringify(value, (_key, current) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return Object.keys(current)
        .sort()
        .reduce((accumulator, key) => {
          accumulator[key] = current[key];
          return accumulator;
        }, {});
    }
    return current;
  }, 2);

const hashText = (value) => createHash("sha256").update(value).digest("hex");

const readJson = async (absolutePath) =>
  JSON.parse(await readFile(absolutePath, "utf8"));

const readArtifact = async (artifactsDir, name) => readJson(path.join(artifactsDir, name));

const writeIfChanged = async (absolutePath, content) => {
  try {
    const current = await readFile(absolutePath, "utf8");
    if (current === content) {
      return false;
    }
  } catch {
    // File missing is expected on first run.
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return true;
};

const listFilesRecursive = async (root) => {
  const files = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await listFilesRecursive(absolutePath)));
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  } catch {
    return [];
  }
  return files;
};

const trimSynaiPrefix = (repoPath) =>
  repoPath.startsWith("SynAI/") ? repoPath.slice("SynAI/".length) : repoPath;

const toNotePath = (fileNotesDir, repoPath) =>
  path.join(fileNotesDir, `${trimSynaiPrefix(repoPath)}.md`);

const buildPathIndex = (repoTree) => {
  const fileSet = new Set(repoTree.filter((entry) => entry.kind === "file").map((entry) => entry.path));
  return {
    has(repoPath) {
      return fileSet.has(repoPath);
    },
  };
};

const getImportsMap = (importsArtifact) =>
  new Map(importsArtifact.map((entry) => [entry.path, entry]));

const getExportsMap = (exportsArtifact) =>
  new Map(exportsArtifact.map((entry) => [entry.path, entry]));

const getHashMap = (hashArtifact) =>
  new Map(hashArtifact.map((entry) => [entry.path, entry]));

const getConfigMap = (configArtifact) =>
  new Map(configArtifact.map((entry) => [entry.path, entry]));

const getDuplicateMembership = (duplicateArtifact) => {
  const duplicateMap = new Map();
  for (const candidate of duplicateArtifact) {
    for (const member of candidate.members) {
      duplicateMap.set(member, candidate);
    }
  }
  return duplicateMap;
};

const getBoundaryMap = (packageBoundaries) => {
  const map = new Map();
  for (const boundary of packageBoundaries) {
    map.set(boundary.root, boundary);
  }
  return map;
};

const inferPurpose = (repoPath, role, configEntry) => {
  if (role === "config") {
    return configEntry
      ? `Config surface for ${configEntry.type}.`
      : "Configuration surface.";
  }
  if (role === "test") {
    return "Test coverage file for a product behavior or contract.";
  }
  if (repoPath.startsWith("SynAI/apps/desktop/electron/")) {
    return "Electron main-process orchestration and side-effect boundary.";
  }
  if (repoPath.startsWith("SynAI/apps/desktop/src/")) {
    return "Renderer-side desktop UI module.";
  }
  if (repoPath.startsWith("SynAI/packages/Agent-Runtime/src/contracts/")) {
    return "Canonical runtime contract surface.";
  }
  if (repoPath.startsWith("SynAI/packages/Agent-Runtime/src/")) {
    return "Canonical agent runtime implementation module.";
  }
  if (repoPath.startsWith("SynAI/packages/Governance-Execution/src/")) {
    return "Governed execution policy/orchestration module.";
  }
  if (repoPath.startsWith("SynAI/packages/Awareness-Reasoning/src/")) {
    return "Shared awareness, memory, retrieval, or local-AI module.";
  }
  if (repoPath.startsWith("SynAI/scripts/context/")) {
    return "Deterministic repo-context pipeline script.";
  }
  if (repoPath.startsWith("SynAI/scripts/")) {
    return "Project support or operator script.";
  }
  return "Canonical project file.";
};

const inferLikelySideEffects = (repoPath, importEntry, role) => {
  if (role === "test") {
    return "none (test-only)";
  }
  const importSources = new Set((importEntry?.imports ?? []).map((entry) => entry.source));
  if (repoPath.startsWith("SynAI/apps/desktop/electron/")) {
    return "filesystem, IPC, desktop/workflow orchestration, and runtime side effects";
  }
  if (importSources.has("electron")) {
    return "Electron runtime and IPC side effects";
  }
  if ([...importSources].some((source) => source.startsWith("node:fs") || source.startsWith("node:child_process"))) {
    return "filesystem or process side effects";
  }
  if (repoPath.includes("/store/") || repoPath.includes("/hooks/")) {
    return "application state updates";
  }
  if (repoPath.startsWith("SynAI/scripts/context/")) {
    return "artifact/context generation writes";
  }
  return "unknown";
};

const inferStateTouched = (repoPath, role) => {
  if (role === "test") {
    return "test harness state";
  }
  if (repoPath.includes("/memory/")) {
    return "memory and context state";
  }
  if (repoPath.includes("governed-chat") || repoPath.includes("workflow") || repoPath.includes("desktop-actions")) {
    return "governed execution state";
  }
  if (repoPath.includes("/runtime/") || repoPath.includes("/contracts/")) {
    return "agent runtime state and contracts";
  }
  if (repoPath.includes("/local-chat/")) {
    return "local chat UI state";
  }
  if (repoPath.includes("screen") || repoPath.includes("machine") || repoPath.includes("files/")) {
    return "awareness snapshots and retrieval state";
  }
  return "unknown";
};

const inferEditRisk = (repoPath, role) => {
  if (role === "config") {
    return "high";
  }
  if (role === "test") {
    return "low";
  }
  if (
    repoPath.includes("/contracts/") ||
    repoPath.includes("workflow-orchestrator") ||
    repoPath.includes("governed-chat") ||
    repoPath.includes("desktop-actions") ||
    repoPath.endsWith("/main.ts") ||
    repoPath.endsWith("/preload.ts")
  ) {
    return "high";
  }
  if (repoPath.includes("/components/") || repoPath.includes("/hooks/")) {
    return "medium";
  }
  return "medium";
};

const inferEditGuidance = (repoPath, role) => {
  if (role === "config") {
    return "Change only with direct tooling evidence and verify the targeted command path.";
  }
  if (role === "test") {
    return "Update when behavior or contract expectations intentionally change.";
  }
  if (repoPath.includes("workflow-orchestrator") || repoPath.includes("governed-chat") || repoPath.includes("desktop-actions")) {
    return "Keep semantics explicit, preserve approvals/clarification details, and run focused capability tests.";
  }
  if (repoPath.includes("/contracts/")) {
    return "Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.";
  }
  if (repoPath.startsWith("SynAI/apps/desktop/src/")) {
    return "Keep renderer changes narrow and avoid changing governed semantics in UI-only code.";
  }
  return "Keep edits local and verify adjacent tests before widening scope.";
};

const resolveLocalImport = (repoPath, source, pathIndex) => {
  if (!source.startsWith(".")) {
    return null;
  }

  const baseDirectory = path.posix.dirname(repoPath);
  const candidateBase = path.posix.normalize(path.posix.join(baseDirectory, source));
  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.mts`,
    `${candidateBase}.cts`,
    `${candidateBase}.mjs`,
    `${candidateBase}.cjs`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    `${candidateBase}/index.ts`,
    `${candidateBase}/index.tsx`,
    `${candidateBase}/index.mjs`,
    `${candidateBase}/index.cjs`,
    `${candidateBase}/index.js`,
  ];

  for (const candidate of candidates) {
    if (pathIndex.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

const inferRelatedFiles = ({ repoPath, importEntry, duplicateEntry, tests, pathIndex }) => {
  const related = new Set();
  if (duplicateEntry) {
    for (const member of duplicateEntry.members) {
      if (member !== repoPath) {
        related.add(member);
      }
    }
  }

  for (const source of importEntry?.imports ?? []) {
    const resolved = resolveLocalImport(repoPath, source.source, pathIndex);
    if (resolved) {
      related.add(resolved);
    }
  }

  const basename = path.posix.basename(repoPath).replace(/\.[^.]+$/, "");
  for (const testPath of tests) {
    if (testPath === repoPath) {
      continue;
    }
    if (testPath.includes(basename) || repoPath.includes(path.posix.basename(testPath).replace(/\.[^.]+$/, ""))) {
      related.add(testPath);
    }
  }

  return [...related].sort().slice(0, 8);
};

const inferLikelyTests = ({ repoPath, tests }) => {
  const basename = path.posix.basename(repoPath).replace(/\.[^.]+$/, "");
  const packageArea = repoPath.split("/").slice(0, 4).join("/");
  return tests
    .filter(
      (testPath) =>
        testPath.includes(basename) ||
        (repoPath.startsWith("SynAI/packages/") && testPath.startsWith(packageArea.replace("/src", "/tests"))) ||
        (repoPath.startsWith("SynAI/apps/desktop/") && testPath.startsWith("SynAI/tests/")),
    )
    .sort()
    .slice(0, 8);
};

const isRelevantFile = (entry, configMap, duplicateMap) => {
  if (entry.area !== "primary-synai" || entry.kind !== "file") {
    return false;
  }
  const duplicateEntry = duplicateMap.get(entry.path);
  if (
    duplicateEntry &&
    duplicateEntry.canonicalCandidate !== entry.path &&
    /\.(js|jsx|mjs|cjs)$/i.test(entry.path)
  ) {
    return false;
  }
  if (configMap.has(entry.path)) {
    return true;
  }
  return /\.(ts|tsx|mjs|cjs)$/i.test(entry.path);
};

const resolveRole = ({ repoPath, configEntry, duplicateEntry }) => {
  if (configEntry) {
    return "config";
  }
  if (/(\.test\.|\/tests\/|\/vitest\/)/i.test(repoPath)) {
    return "test";
  }
  if (duplicateEntry && duplicateEntry.canonicalCandidate !== repoPath) {
    return "duplicate-candidate";
  }
  if (
    repoPath.endsWith("/index.ts") ||
    repoPath.endsWith("/main.ts") ||
    repoPath.endsWith("/preload.ts") ||
    repoPath.endsWith("/main.tsx") ||
    repoPath.endsWith("/App.tsx") ||
    repoPath.includes("/contracts/")
  ) {
    return "canonical";
  }
  return "support";
};

const renderList = (values, fallback = "unknown") =>
  values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : `- ${fallback}`;

const buildFileNote = ({
  repoPath,
  area,
  role,
  sourceHash,
  configEntry,
  importEntry,
  exportEntry,
  relatedFiles,
  likelyTests,
}) => {
  const importSummary = (importEntry?.imports ?? []).map((entry) => entry.source).slice(0, 8);
  const exportSummary = (exportEntry?.exports ?? [])
    .flatMap((entry) =>
      entry.specifiers.length > 0
        ? entry.specifiers.map((specifier) => specifier.name)
        : [entry.kind === "default-export" ? "default" : entry.kind],
    )
    .slice(0, 8);
  const noteHash = hashText(stableJson({
    repoPath,
    sourceHash,
    role,
    importSummary,
    exportSummary,
    relatedFiles,
    likelyTests,
    configType: configEntry?.type ?? null,
  }));

  return [
    `<!-- source-hash:${sourceHash}; note-hash:${noteHash} -->`,
    `# ${repoPath}`,
    "",
    "## Path",
    repoPath,
    "",
    "## Area",
    area,
    "",
    "## Role",
    role,
    "",
    "## Purpose",
    inferPurpose(repoPath, role, configEntry),
    "",
    "## Main Imports",
    renderList(importSummary, "none"),
    "",
    "## Main Exports",
    renderList(exportSummary, "none"),
    "",
    "## Likely Side Effects",
    inferLikelySideEffects(repoPath, importEntry, role),
    "",
    "## State Touched",
    inferStateTouched(repoPath, role),
    "",
    "## Related Files",
    renderList(relatedFiles, "none identified"),
    "",
    "## Edit Risk",
    inferEditRisk(repoPath, role),
    "",
    "## Edit Guidance",
    inferEditGuidance(repoPath, role),
    "",
    "## Likely Tests Affected",
    renderList(likelyTests, "needs verification"),
    "",
  ].join("\n");
};

const buildDocHeader = (name, input) =>
  `<!-- doc:${name}; input-hash:${hashText(stableJson(input))} -->\n`;

const buildAgentGuide = ({ duplicateCandidates, packageBoundaries, configSurfaces }) => {
  const primaryBoundary = packageBoundaries.find((entry) => entry.root === "SynAI");
  const canonicalConfigLines = configSurfaces
    .filter((entry) => entry.isCanonical)
    .map((entry) => `- \`${entry.path}\` (${entry.type})`)
    .slice(0, 8);
  const duplicateLines = duplicateCandidates
    .filter((entry) => entry.category === "config-pair" || entry.category === "same-basename")
    .map((entry) => `- \`${entry.canonicalCandidate}\` is the current candidate over ${entry.alternates.map((alt) => `\`${alt}\``).join(", ")}`)
    .slice(0, 8);

  const body = [
    "# SynAI Agent Guide",
    "",
    "## Root Model",
    `- \`${primaryBoundary?.root ?? "SynAI"}\` is the canonical app/package root.`,
    "- The repository root is a bootstrap shell only; do not flatten it with the app code surface.",
    "- Root-level `context`, `docs`, `scripts`, `specs`, `src`, and `tests` are secondary support surfaces unless a task explicitly targets them.",
    "",
    "## Start Here",
    "- Read `SynAI/context/REPO_MAP.md` for boundaries and high-signal entrypoints.",
    "- Read `SynAI/context/BLAST_RADIUS.md` before editing workflow, governance, runtime, or config surfaces.",
    "- Use `npm run context:build` from `SynAI/` after structural changes so the deterministic context stays fresh.",
    "",
    "## Canonical Config Candidates",
    ...canonicalConfigLines,
    "",
    "## Duplicate Handling",
    "- TS/JS twins are documented first, not mass-deleted.",
    "- Treat TypeScript config variants as canonical candidates where tooling already references them.",
    ...duplicateLines,
    "",
    "## Status Semantics",
    "- Preserve `clarification_needed` as distinct from `blocked`, `failed`, `completed`, and `running/pending` states.",
    "- Keep clarification payloads observable, including human-readable prompts and any `missingFields` detail.",
    "",
    "## Useful Commands",
    "- `npm run context:scan`",
    "- `npm run context:refresh`",
    "- `npm run context:build`",
    "- `npm test -- tests/capability/desktop-actions-clarification.test.ts tests/capability/governed-chat-service.test.ts tests/capability/workflow-orchestrator.test.ts`",
    "- `npx jest --runInBand --config jest.agent-runtime.config.cjs packages/Agent-Runtime/tests/runtime/runtime.noop.test.ts`",
    "",
  ].join("\n");
  return buildDocHeader("AGENT_GUIDE", {
    duplicateCandidates,
    packageBoundaries,
    configSurfaces,
  }) + body + "\n";
};

const buildRepoMap = ({ packageBoundaries, configSurfaces, duplicateCandidates }) => {
  const boundaryLines = packageBoundaries.map(
    (entry) => `- \`${entry.root}\` | ${entry.boundaryType} | ${entry.summary}`,
  );
  const configLines = configSurfaces.map(
    (entry) =>
      `- \`${entry.path}\` | ${entry.type} | canonical: ${entry.isCanonical ? "yes" : "no"} | ${entry.reason}`,
  );
  const duplicateLines = duplicateCandidates.slice(0, 24).map(
    (entry) =>
      `- \`${entry.basename}\` | canonical candidate: \`${entry.canonicalCandidate}\` | alternates: ${entry.alternates.map((alt) => `\`${alt}\``).join(", ") || "none"}`,
  );

  const body = [
    "# SynAI Repo Map",
    "",
    "## Package And App Boundaries",
    ...boundaryLines,
    "",
    "## Active Config Surfaces",
    ...configLines,
    "",
    "## Duplicate Candidates",
    "- These are documented candidates only unless direct tooling evidence proves a safe consolidation path.",
    ...duplicateLines,
    "",
  ].join("\n");
  return buildDocHeader("REPO_MAP", {
    packageBoundaries,
    configSurfaces,
    duplicateCandidates,
  }) + body + "\n";
};

const buildBlastRadius = () => {
  const body = [
    "# SynAI Blast Radius",
    "",
    "## High Risk",
    "- `SynAI/apps/desktop/electron/governed-chat.ts`, `workflow-orchestrator.ts`, and `desktop-actions.ts`: execution semantics, approvals, clarification, rollback, and policy-visible behavior.",
    "- `SynAI/apps/desktop/electron/agent-runtime-adapters.ts` and `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`: shared runtime status/contract behavior.",
    "- `SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`: renderer/main-process contracts.",
    "",
    "## Medium Risk",
    "- `SynAI/apps/desktop/src/features/local-chat/*`: UI rendering and task-state presentation.",
    "- `SynAI/packages/Awareness-Reasoning/src/*`: memory, retrieval, awareness, and context assembly.",
    "- `SynAI/scripts/context/*`: deterministic context generation.",
    "",
    "## Focused Validation",
    "- Clarification/governed execution: `tests/capability/desktop-actions-clarification.test.ts`, `tests/capability/governed-chat-service.test.ts`, `tests/capability/workflow-orchestrator.test.ts`.",
    "- Runtime contracts/status: `packages/Agent-Runtime/tests/runtime/runtime.noop.test.ts` plus any adapter/status contract test added for this pass.",
    "- Context pipeline: `tests/context/context-pipeline.test.ts`.",
    "",
  ].join("\n");
  return buildDocHeader("BLAST_RADIUS", { version: 1 }) + body + "\n";
};

const buildArchitectureSummary = ({ packageBoundaries }) => {
  const body = [
    "# SynAI Architecture Summary",
    "",
    "## Canonical Shape",
    "- `SynAI/` is the real product root.",
    "- `SynAI/apps/desktop/` contains the Electron app and renderer.",
    "- `SynAI/packages/Agent-Runtime/` is the canonical runtime package surface.",
    "- `SynAI/packages/Governance-Execution/` owns governed execution, approvals, policy, and workflow wiring.",
    "- `SynAI/packages/Awareness-Reasoning/` owns awareness, memory, retrieval, local AI, and contract surfaces consumed by the app.",
    "",
    "## Secondary Repo Shell",
    "- The repository root exists for bootstrap/hygiene only.",
    "- Secondary root folders should only be read when a task explicitly targets wrapper/support content.",
    "",
    "## Current Ambiguity Policy",
    "- Checked-in `.js` twins are treated as documented mirrors or compatibility surfaces until proven redundant.",
    "- TypeScript variants of paired configs are the current canonical candidates.",
    "",
    "## Key Boundaries",
    ...packageBoundaries.map((entry) => `- \`${entry.root}\`: ${entry.summary}`),
    "",
  ].join("\n");
  return buildDocHeader("ARCHITECTURE_SUMMARY", { packageBoundaries }) + body + "\n";
};

const buildTaskPack = (name) => {
  const sharedTail = [
    "",
    "## Keep Narrow",
    "- Prefer `SynAI/` edits over root-shell edits.",
    "- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.",
    "- Refresh deterministic context after structural changes with `npm run context:build`.",
    "",
  ];

  if (name === "bugfix") {
    return (
      buildDocHeader("task-pack:bugfix", { name }) +
      [
        "# Bugfix Pack",
        "",
        "## Inspect First",
        "- The failing feature surface under `apps/desktop/electron`, `apps/desktop/src/features`, or the relevant `packages/*/src` area.",
        "- Shared contracts in `packages/Awareness-Reasoning/src/contracts` and `packages/Agent-Runtime/src/contracts` if any status or payload field is involved.",
        "",
        "## Relevant Tests",
        "- Start with the narrow capability/runtime test nearest the failing surface.",
        "- For governed execution semantics use `tests/capability/desktop-actions-clarification.test.ts`, `tests/capability/governed-chat-service.test.ts`, and `tests/capability/workflow-orchestrator.test.ts`.",
        ...sharedTail,
      ].join("\n") +
      "\n"
    );
  }

  if (name === "refactor") {
    return (
      buildDocHeader("task-pack:refactor", { name }) +
      [
        "# Refactor Pack",
        "",
        "## Inspect First",
        "- `REPO_MAP.md` and `BLAST_RADIUS.md` for shared boundaries.",
        "- Imports/exports artifacts to avoid widening changes across packages.",
        "",
        "## Do Not Touch Casually",
        "- `packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`",
        "- `packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`",
        "- `apps/desktop/electron/governed-chat.ts`, `workflow-orchestrator.ts`, `desktop-actions.ts`",
        ...sharedTail,
      ].join("\n") +
      "\n"
    );
  }

  if (name === "ui-change") {
    return (
      buildDocHeader("task-pack:ui-change", { name }) +
      [
        "# UI Change Pack",
        "",
        "## Inspect First",
        "- `apps/desktop/src/features/local-chat/components/*` and supporting hooks/store files.",
        "- `packages/Awareness-Reasoning/src/contracts/chat.ts` if task-state rendering depends on new metadata fields.",
        "",
        "## Relevant Tests",
        "- Renderer smoke tests under `tests/smoke/*`.",
        "- Capability tests if the UI reflects governed execution or runtime state.",
        ...sharedTail,
      ].join("\n") +
      "\n"
    );
  }

  if (name === "tests") {
    return (
      buildDocHeader("task-pack:tests", { name }) +
      [
        "# Tests Pack",
        "",
        "## Start Narrow",
        "- Vitest app/capability tests: `npm test -- <target files>`.",
        "- Agent runtime Jest tests: `npx jest --runInBand --config jest.agent-runtime.config.cjs <target>`.",
        "- Context pipeline tests: `npm test -- tests/context/context-pipeline.test.ts`.",
        "",
        "## Keep Relevant",
        "- Prefer the smallest set that covers the changed contract or behavior.",
        "- Add status/clarification assertions where semantics are adapted or rendered.",
        ...sharedTail,
      ].join("\n") +
      "\n"
    );
  }

  return (
    buildDocHeader("task-pack:governed-actions", { name }) +
    [
      "# Governed Actions Pack",
      "",
      "## Inspect First",
      "- `apps/desktop/electron/governed-chat.ts`",
      "- `apps/desktop/electron/workflow-orchestrator.ts`",
      "- `apps/desktop/electron/desktop-actions.ts`",
      "- `apps/desktop/electron/agent-runtime-adapters.ts`",
      "- `packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`",
      "",
      "## Must Preserve",
      "- `clarification_needed`, `blocked`, `failed`, `completed`, and pending/running semantics as distinct states.",
      "- Human-readable clarification prompts and any `missingFields` detail.",
      "- Approval/denial/rollback metadata.",
      "",
      "## Relevant Tests",
      "- `tests/capability/desktop-actions-clarification.test.ts`",
      "- `tests/capability/governed-chat-service.test.ts`",
      "- `tests/capability/workflow-orchestrator.test.ts`",
      ...sharedTail,
    ].join("\n") +
    "\n"
  );
};

export const refreshContext = async (options = {}) => {
  const synaiRoot = path.resolve(options.synaiRoot ?? DEFAULT_SYNAI_ROOT);
  const repoRoot = path.resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const artifactsDir = path.resolve(options.artifactsDir ?? DEFAULT_ARTIFACTS_DIR);
  const contextDir = path.resolve(options.contextDir ?? DEFAULT_CONTEXT_DIR);
  const fileNotesDir = path.resolve(options.fileNotesDir ?? DEFAULT_FILE_NOTES_DIR);
  const taskPacksDir = path.resolve(options.taskPacksDir ?? DEFAULT_TASK_PACKS_DIR);

  const [
    repoTree,
    fileHashes,
    importsArtifact,
    exportsArtifact,
    configSurfaces,
    packageBoundaries,
    duplicateCandidates,
  ] = await Promise.all([
    readArtifact(artifactsDir, "repo-tree.json"),
    readArtifact(artifactsDir, "file-hashes.json"),
    readArtifact(artifactsDir, "imports.json"),
    readArtifact(artifactsDir, "exports.json"),
    readArtifact(artifactsDir, "config-surfaces.json"),
    readArtifact(artifactsDir, "package-boundaries.json"),
    readArtifact(artifactsDir, "duplicate-candidates.json"),
  ]);

  const importsMap = getImportsMap(importsArtifact);
  const exportsMap = getExportsMap(exportsArtifact);
  const hashMap = getHashMap(fileHashes);
  const configMap = getConfigMap(configSurfaces);
  const duplicateMap = getDuplicateMembership(duplicateCandidates);
  const pathIndex = buildPathIndex(repoTree);
  const tests = repoTree
    .filter(
      (entry) =>
        entry.kind === "file" &&
        entry.area === "primary-synai" &&
        /(\.test\.|\/tests\/|\/vitest\/)/i.test(entry.path),
    )
    .map((entry) => entry.path)
    .sort();

  await Promise.all([
    mkdir(contextDir, { recursive: true }),
    mkdir(fileNotesDir, { recursive: true }),
    mkdir(taskPacksDir, { recursive: true }),
  ]);

  const docs = {
    "AGENT_GUIDE.md": buildAgentGuide({
      duplicateCandidates,
      packageBoundaries,
      configSurfaces,
    }),
    "REPO_MAP.md": buildRepoMap({
      packageBoundaries,
      configSurfaces,
      duplicateCandidates,
    }),
    "BLAST_RADIUS.md": buildBlastRadius(),
    "ARCHITECTURE_SUMMARY.md": buildArchitectureSummary({
      packageBoundaries,
    }),
  };

  const taskPacks = {
    "bugfix.md": buildTaskPack("bugfix"),
    "refactor.md": buildTaskPack("refactor"),
    "ui-change.md": buildTaskPack("ui-change"),
    "tests.md": buildTaskPack("tests"),
    "governed-actions.md": buildTaskPack("governed-actions"),
  };

  const writes = [];
  for (const [fileName, content] of Object.entries(docs)) {
    writes.push(writeIfChanged(path.join(contextDir, fileName), content));
  }
  for (const [fileName, content] of Object.entries(taskPacks)) {
    writes.push(writeIfChanged(path.join(taskPacksDir, fileName), content));
  }

  const relevantFiles = repoTree.filter((entry) => isRelevantFile(entry, configMap, duplicateMap));
  const expectedNotePaths = new Set();
  for (const fileEntry of relevantFiles) {
    const repoPath = fileEntry.path;
    const noteAbsolutePath = toNotePath(fileNotesDir, repoPath);
    expectedNotePaths.add(path.resolve(noteAbsolutePath));
    const relatedFiles = inferRelatedFiles({
      repoPath,
      importEntry: importsMap.get(repoPath),
      duplicateEntry: duplicateMap.get(repoPath),
      tests,
      pathIndex,
    });
    const likelyTests = inferLikelyTests({ repoPath, tests });
    const role = resolveRole({
      repoPath,
      configEntry: configMap.get(repoPath),
      duplicateEntry: duplicateMap.get(repoPath),
    });
    const content = buildFileNote({
      repoPath,
      area: fileEntry.area,
      role,
      sourceHash: hashMap.get(repoPath)?.sha256 ?? "unknown",
      configEntry: configMap.get(repoPath),
      importEntry: importsMap.get(repoPath),
      exportEntry: exportsMap.get(repoPath),
      relatedFiles,
      likelyTests,
    });
    writes.push(writeIfChanged(noteAbsolutePath, content));
  }

  const existingNotes = await listFilesRecursive(fileNotesDir);
  for (const existing of existingNotes) {
    if (!expectedNotePaths.has(path.resolve(existing))) {
      await rm(existing, { force: true });
    }
  }

  const writeResults = await Promise.all(writes);
  return {
    synaiRoot,
    repoRoot,
    artifactsDir,
    contextDir,
    fileNotesDir,
    taskPacksDir,
    rewrittenCount: writeResults.filter(Boolean).length,
    noteCount: relevantFiles.length,
  };
};

const runCli = async () => {
  const result = await refreshContext();
  process.stdout.write(`${stableJson(result)}\n`);
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;

if (isDirectRun) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
