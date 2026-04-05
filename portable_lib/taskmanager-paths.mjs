import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnvPath(name, fallback) {
  const value = String(process.env[name] || "").trim();
  return value ? path.resolve(value) : fallback;
}

const TASKMANAGER_ROOT = readEnvPath("HORIZONS_TASKMANAGER_ROOT", path.resolve(__dirname, ".."));
const OUTER_WORKSPACE_ROOT = path.resolve(TASKMANAGER_ROOT, "..");
const BRAIN_ROOT = readEnvPath("HORIZONS_BRAIN_ROOT", path.join(TASKMANAGER_ROOT, "brain"));
const GENERATED_ROOT = readEnvPath("HORIZONS_BRAIN_GENERATED_ROOT", path.join(BRAIN_ROOT, "generated"));
const REPORTS_ROOT = readEnvPath("HORIZONS_BRAIN_REPORTS_ROOT", path.join(BRAIN_ROOT, "reports"));
const LEGACY_ROOT_ARCHIVE_ROOT = readEnvPath(
  "HORIZONS_LEGACY_ROOT_ARCHIVE",
  path.join(REPORTS_ROOT, "legacy-root")
);
const APP_RUNTIME_STATE_ROOT = readEnvPath(
  "HORIZONS_RUNTIME_STATE_ROOT",
  path.join(TASKMANAGER_ROOT, ".runtime")
);

const CANONICAL_RUNTIME_ROOT = path.join(BRAIN_ROOT, "runtime");
const CANONICAL_RUNTIME_SETTINGS_ROOT = path.join(CANONICAL_RUNTIME_ROOT, "settings");
const GENERATED_RUNTIME_ROOT = readEnvPath(
  "HORIZONS_GENERATED_RUNTIME_ROOT",
  path.join(GENERATED_ROOT, "runtime")
);
const GENERATED_RETRIEVAL_ROOT = readEnvPath(
  "HORIZONS_GENERATED_RETRIEVAL_ROOT",
  path.join(GENERATED_ROOT, "retrieval")
);
const GENERATED_RUNTIME_FILTER_ROOT = readEnvPath(
  "HORIZONS_RUNTIME_FILTER_ROOT",
  path.join(GENERATED_ROOT, "runtime-filter")
);

const RETRIEVAL_ROOT = path.join(BRAIN_ROOT, "retrieval");
const RETRIEVAL_INDEXES_ROOT = path.join(RETRIEVAL_ROOT, "indexes");

export function resolveExistingPath(primary, fallbacks = []) {
  const candidates = [primary, ...fallbacks].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return primary;
}

export function getOptimizationReportPaths(stamp) {
  const safeStamp = String(stamp || "").trim() || "latest";
  const root = path.join(REPORTS_ROOT, "optimization", safeStamp);
  return {
    root,
    baselineRoot: path.join(root, "baseline"),
    metricsRoot: path.join(root, "metrics"),
    testsRoot: path.join(root, "tests"),
  };
}

const PATHS = Object.freeze({
  taskmanagerRoot: TASKMANAGER_ROOT,
  outerWorkspaceRoot: OUTER_WORKSPACE_ROOT,
  portableLibRoot: path.join(TASKMANAGER_ROOT, "portable_lib"),
  appRuntimeStateRoot: APP_RUNTIME_STATE_ROOT,
  desktop: Object.freeze({
    root: path.join(TASKMANAGER_ROOT, "desktop"),
    mainFile: path.join(TASKMANAGER_ROOT, "desktop", "main.cjs"),
    preloadFile: path.join(TASKMANAGER_ROOT, "desktop", "preload.cjs"),
    runtimeHostFile: path.join(TASKMANAGER_ROOT, "desktop", "runtime-host.cjs"),
  }),
  server: Object.freeze({
    root: path.join(TASKMANAGER_ROOT, "server"),
    devApiFile: path.join(TASKMANAGER_ROOT, "server", "dev-api.mjs"),
    httpRoutesFile: path.join(TASKMANAGER_ROOT, "server", "http-routes.mjs"),
    runtimeManager: Object.freeze({
      root: path.join(TASKMANAGER_ROOT, "server", "runtime-manager"),
      processMonitorServiceFile: path.join(
        TASKMANAGER_ROOT,
        "server",
        "runtime-manager",
        "process-monitor-service.mjs"
      ),
      systemMetricsServiceFile: path.join(
        TASKMANAGER_ROOT,
        "server",
        "runtime-manager",
        "system-metrics-service.mjs"
      ),
      optimizationAdvisorFile: path.join(
        TASKMANAGER_ROOT,
        "server",
        "runtime-manager",
        "optimization-advisor.mjs"
      ),
      safeProcessControllerFile: path.join(
        TASKMANAGER_ROOT,
        "server",
        "runtime-manager",
        "safe-process-controller.mjs"
      ),
    }),
  }),
  shared: Object.freeze({
    root: path.join(TASKMANAGER_ROOT, "shared"),
    taskManagerCoreFile: path.join(TASKMANAGER_ROOT, "shared", "task-manager-core.mjs"),
  }),
  tests: Object.freeze({
    root: path.join(TASKMANAGER_ROOT, "tests"),
    integrationPythonRoot: path.join(TASKMANAGER_ROOT, "tests", "integration-python"),
  }),
  brain: Object.freeze({
    root: BRAIN_ROOT,
    coreRoot: path.join(BRAIN_ROOT, "core"),
    dataRoot: path.join(BRAIN_ROOT, "data"),
    importsRoot: path.join(BRAIN_ROOT, "imports"),
    processesRoot: path.join(BRAIN_ROOT, "processes"),
    scriptsRoot: path.join(BRAIN_ROOT, "scripts"),
    reports: Object.freeze({
      root: REPORTS_ROOT,
      optimizationRoot: path.join(REPORTS_ROOT, "optimization"),
      legacyRootArchiveRoot: LEGACY_ROOT_ARCHIVE_ROOT,
    }),
    retrieval: Object.freeze({
      root: RETRIEVAL_ROOT,
      profilesFile: path.join(RETRIEVAL_ROOT, "profiles.json"),
      importsRoot: path.join(RETRIEVAL_ROOT, "imports"),
      embeddingsRoot: path.join(RETRIEVAL_ROOT, "embeddings"),
      indexesRoot: RETRIEVAL_INDEXES_ROOT,
      chunksFile: path.join(RETRIEVAL_INDEXES_ROOT, "chunks.jsonl"),
      importsFiles: path.join(RETRIEVAL_INDEXES_ROOT, "imports-files.jsonl"),
      runtimeManifestFile: path.join(RETRIEVAL_INDEXES_ROOT, "runtime-manifest.json"),
      previousRuntimeManifestFile: path.join(
        RETRIEVAL_INDEXES_ROOT,
        "runtime-manifest.previous.json"
      ),
      runtimeDiagnosticsFile: path.join(RETRIEVAL_INDEXES_ROOT, "runtime-diagnostics.json"),
      aliasesFile: path.join(RETRIEVAL_INDEXES_ROOT, "aliases.json"),
      synonymsFile: path.join(RETRIEVAL_INDEXES_ROOT, "synonyms.json"),
      semanticMapFile: path.join(RETRIEVAL_INDEXES_ROOT, "semantic-map.json"),
      compactFactsFile: path.join(RETRIEVAL_INDEXES_ROOT, "compact-facts.json"),
      scenarioLookupFile: path.join(RETRIEVAL_INDEXES_ROOT, "scenario-lookup.json"),
      responsePriorsFile: path.join(RETRIEVAL_INDEXES_ROOT, "response-priors.json"),
      promptPackFile: path.join(RETRIEVAL_INDEXES_ROOT, "prompt-pack.json"),
      densePilotManifestFile: path.join(RETRIEVAL_INDEXES_ROOT, "dense-pilot-manifest.json"),
      contradictionReportFile: path.join(RETRIEVAL_INDEXES_ROOT, "contradiction-report.json"),
    }),
    runtime: Object.freeze({
      canonicalRoot: CANONICAL_RUNTIME_ROOT,
      settingsRoot: CANONICAL_RUNTIME_SETTINGS_ROOT,
      runtimeSettingsFile: path.join(CANONICAL_RUNTIME_SETTINGS_ROOT, "runtime-settings.json"),
      optimizerSettingsFile: path.join(CANONICAL_RUNTIME_SETTINGS_ROOT, "optimizer-settings.json"),
      developerModeSettingsFile: path.join(
        CANONICAL_RUNTIME_SETTINGS_ROOT,
        "developer-mode-settings.json"
      ),
      legacyReviewChatTurnsRoot: path.join(BRAIN_ROOT, "review", "chat-turns"),
      legacyLearnedQaFile: path.join(
        BRAIN_ROOT,
        "apps",
        "assistant",
        "knowledge",
        "build",
        "learned-qa.jsonl"
      ),
      legacySessionSnapshotsRoot: path.join(BRAIN_ROOT, "memory", "sessions", "snapshots"),
    }),
    generated: Object.freeze({
      root: GENERATED_ROOT,
      runtime: Object.freeze({
        root: GENERATED_RUNTIME_ROOT,
        logsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs"),
        chatTurnsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "chat-turns"),
        learnedQaRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "learned-qa"),
        learnedQaFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "logs",
          "learned-qa",
          "learned-qa.jsonl"
        ),
        fetchLogsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "fetch"),
        jobLogsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "jobs"),
        digestRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "digests"),
        optimizerLogsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "optimizer"),
        specialistLogsRoot: path.join(GENERATED_RUNTIME_ROOT, "logs", "specialist"),
        governedActionsLogsRoot: path.join(
          GENERATED_RUNTIME_ROOT,
          "logs",
          "governed-actions"
        ),
        sessionsRoot: path.join(GENERATED_RUNTIME_ROOT, "sessions"),
        sessionSnapshotsRoot: path.join(GENERATED_RUNTIME_ROOT, "sessions", "snapshots"),
        learningRoot: path.join(GENERATED_RUNTIME_ROOT, "learning"),
        queueRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "queue"),
        queueFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "learning",
          "queue",
          "pending-urls.json"
        ),
        rawRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "raw"),
        processedRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "processed"),
        promotedRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "promoted"),
        quarantineRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "quarantine"),
        manifestsRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "manifests"),
        stateRoot: path.join(GENERATED_RUNTIME_ROOT, "learning", "state"),
        learningStatusFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "learning",
          "state",
          "idle-training-status.json"
        ),
        seenUrlsFile: path.join(GENERATED_RUNTIME_ROOT, "learning", "state", "seen-urls.json"),
        missTopicsFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "learning",
          "state",
          "miss-topics.json"
        ),
        domainStateFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "learning",
          "state",
          "domain-state.json"
        ),
        specialistRoot: path.join(GENERATED_RUNTIME_ROOT, "specialist"),
        specialistIndexRoot: path.join(GENERATED_RUNTIME_ROOT, "specialist", "index"),
        specialistStateFile: path.join(GENERATED_RUNTIME_ROOT, "specialist", "state.json"),
        specialistLearningFile: path.join(
          GENERATED_RUNTIME_ROOT,
          "specialist",
          "learning.json"
        ),
        testArtifactsRoot: path.join(GENERATED_RUNTIME_ROOT, "test-artifacts"),
        trashRoot: path.join(GENERATED_RUNTIME_ROOT, "trash"),
        legacyRoot: CANONICAL_RUNTIME_ROOT,
        legacyLogsRoot: path.join(CANONICAL_RUNTIME_ROOT, "logs"),
        legacySessionsRoot: path.join(CANONICAL_RUNTIME_ROOT, "sessions"),
        legacySessionSnapshotsRoot: path.join(CANONICAL_RUNTIME_ROOT, "sessions", "snapshots"),
        legacyLearningRoot: path.join(CANONICAL_RUNTIME_ROOT, "learning"),
        legacyTestArtifactsRoot: path.join(CANONICAL_RUNTIME_ROOT, "test-artifacts"),
        legacyTrashRoot: path.join(CANONICAL_RUNTIME_ROOT, "trash"),
      }),
      retrieval: Object.freeze({
        root: GENERATED_RETRIEVAL_ROOT,
        normalizedDocsRoot: path.join(GENERATED_RETRIEVAL_ROOT, "normalized", "docs"),
        contextPacksRoot: path.join(GENERATED_RETRIEVAL_ROOT, "context-packs"),
        lancedbRoot: path.join(GENERATED_RETRIEVAL_ROOT, "lancedb"),
        evalHistoryRoot: path.join(GENERATED_RETRIEVAL_ROOT, "evals", "history"),
        legacyNormalizedDocsRoot: path.join(RETRIEVAL_INDEXES_ROOT, "normalized", "docs"),
        legacyContextPacksRoot: path.join(RETRIEVAL_INDEXES_ROOT, "context-packs"),
        legacyLancedbRoot: path.join(RETRIEVAL_INDEXES_ROOT, "lancedb"),
        legacyEvalHistoryRoot: path.join(RETRIEVAL_INDEXES_ROOT, "evals", "history"),
      }),
      runtimeFilter: Object.freeze({
        root: GENERATED_RUNTIME_FILTER_ROOT,
        reportFile: path.join(GENERATED_RUNTIME_FILTER_ROOT, "brain_report.json"),
        logsRoot: path.join(GENERATED_RUNTIME_FILTER_ROOT, "logs"),
        stateRoot: path.join(GENERATED_RUNTIME_FILTER_ROOT, "state"),
        lastRunFile: path.join(GENERATED_RUNTIME_FILTER_ROOT, "state", "last-run.json"),
        filesStateFile: path.join(GENERATED_RUNTIME_FILTER_ROOT, "state", "files-state.json"),
        legacyRoot: path.join(TASKMANAGER_ROOT, "brain_runtime_filter"),
      }),
    }),
  }),
  outerWorkspace: Object.freeze({
    root: OUTER_WORKSPACE_ROOT,
    docsRoot: path.join(OUTER_WORKSPACE_ROOT, "docs"),
    scriptsRoot: path.join(OUTER_WORKSPACE_ROOT, "scripts"),
    plansRoot: path.join(OUTER_WORKSPACE_ROOT, "plans"),
    artifactsRoot: path.join(OUTER_WORKSPACE_ROOT, "artifacts"),
    repoMapRoot: path.join(OUTER_WORKSPACE_ROOT, "RepoMAP"),
    repoMapChunksRoot: path.join(OUTER_WORKSPACE_ROOT, "repo_map_chunks"),
    testsRoot: path.join(OUTER_WORKSPACE_ROOT, "tests"),
    deepResearchReportFile: path.join(OUTER_WORKSPACE_ROOT, "deep-research-report.md"),
    repoFileManifestFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_FILE_MANIFEST.csv"),
    repoMapFullJsonFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_MAP_FULL.json"),
    repoMapFullMdFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_MAP_FULL.md"),
    repoMapFullTxtFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_MAP_FULL.txt"),
    repoMapIndexFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_MAP_INDEX.md"),
    repoMapReadmeFile: path.join(OUTER_WORKSPACE_ROOT, "REPO_MAP_README.md"),
  }),
});

export function getTaskmanagerPaths() {
  return PATHS;
}

export function ensureTaskmanagerPathDirs() {
  const directories = [
    PATHS.brain.reports.root,
    PATHS.brain.reports.optimizationRoot,
    PATHS.brain.reports.legacyRootArchiveRoot,
    PATHS.brain.generated.root,
    PATHS.brain.generated.runtime.root,
    PATHS.brain.generated.runtime.logsRoot,
    PATHS.brain.generated.runtime.sessionsRoot,
    PATHS.brain.generated.runtime.learningRoot,
    PATHS.brain.generated.runtime.specialistRoot,
    PATHS.brain.generated.runtime.testArtifactsRoot,
    PATHS.brain.generated.runtime.trashRoot,
    PATHS.brain.generated.retrieval.root,
    PATHS.brain.generated.runtimeFilter.root,
    PATHS.appRuntimeStateRoot,
    PATHS.brain.runtime.settingsRoot,
  ];

  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return PATHS;
}
