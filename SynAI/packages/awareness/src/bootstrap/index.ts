import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AwarenessContextReason,
  AwarenessDigest,
  AwarenessMode,
  AwarenessCurrentUiDiagnostic,
  AwarenessPerformanceDiagnostic,
  AwarenessQueryRequest,
  AwarenessQueryAnswer,
  ScreenAwarenessSnapshot,
  ScreenAwarenessStatus,
  LastReportedBaseline,
  FileAwarenessSnapshot,
  FileAwarenessSummary,
  MachineBaseline,
  MachineAwarenessSnapshot,
  MachineAwarenessSummary,
  PermissionTier,
  PrivacyScope,
  RepoBaseline,
  SessionBaseline,
  AwarenessScopeSummary,
  AwarenessStartupDiagnostic,
  AwarenessSummaryMode,
  AwarenessSummaryScope
} from "../../../contracts/src/awareness";
import {
  buildAwarenessDigest,
  buildLastReportedBaseline,
  buildSessionBaseline,
  captureMachineBaseline,
  captureRepoBaseline,
  DEFAULT_AWARENESS_MODE,
  DEFAULT_IGNORED_ROOTS,
  DEFAULT_WATCHED_ROOTS,
  PHASE_ONE_ALLOWED_PRIVACY_SCOPE,
  PHASE_ONE_PERMISSION_TIERS,
  resolveRepositoryRoot
} from "../baseline";
import { stampAwarenessDigestFreshness } from "../context";
import {
  buildAwarenessCurrentUiDiagnostic,
  buildAwarenessPerformanceDiagnostic,
  buildAwarenessQueryAnswer,
  buildAwarenessScopeSummary,
  buildAwarenessStartupDiagnostic,
  type AwarenessHistoryView,
  type AwarenessPathView,
  type AwarenessQueryBuildInput,
  type AwarenessView
} from "../reasoning";
import {
  captureMachineAwarenessSnapshot,
  type MachineCaptureOptions
} from "../machine";
import {
  captureFileAwarenessSnapshot,
  initializeFileAwareness,
  type FileAwarenessState,
  type FileCaptureOptions as FileAwarenessCaptureOptions
} from "../files";
import {
  initializeScreenAwareness,
  type ScreenAwarenessState,
  type ScreenCaptureOptions as ScreenAwarenessCaptureOptions
} from "../screen";
import {
  appendAwarenessEvent,
  normalizeAwarenessEvent,
  readAwarenessEvents,
  type AppendAwarenessEventInput
} from "../journal";

export interface RuntimePaths {
  repoRoot: string;
  runtimeRoot: string;
  fileRuntimeRoot: string;
  screenRuntimeRoot: string;
  currentSessionPath: string;
  previousSessionPath: string;
  lastReportedBaselinePath: string;
  latestDigestPath: string;
  eventsPath: string;
  fileCurrentCatalogPath: string;
  filePreviousCatalogPath: string;
  fileRecentChangesPath: string;
  fileLatestSummaryPath: string;
  screenCurrentPath: string;
  screenPreviousPath: string;
  screenLatestSummaryPath: string;
  screenEventsPath: string;
}

export interface AwarenessRuntimeSnapshot {
  version: 1;
  capturedAt: string;
  session: SessionBaseline;
  repo: RepoBaseline;
  machine: MachineBaseline;
  machineAwareness: MachineAwarenessSnapshot;
  fileAwareness: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessSnapshot | null;
  lastReportedBaseline: LastReportedBaseline | null;
  digest: AwarenessDigest;
}

export interface AwarenessStatus {
  sessionId: string;
  awarenessMode: AwarenessMode;
  permissionTier: PermissionTier;
  privacyScope: PrivacyScope;
  digestId: string;
  baselineFingerprint: string;
  includeInContext: boolean;
  includeReason: AwarenessContextReason;
  summary: string;
  freshness: AwarenessDigest["freshness"];
  repo: {
    branch: string | null;
    headSha: string | null;
    dirtyState: RepoBaseline["dirtyState"];
    recentCommitCount: number;
    activeFeatureFlags: string[];
  };
  machine: {
    machineName: string;
    osVersion: string;
    timezone: string;
  };
  machineAwareness: MachineAwarenessSummary;
  fileAwareness: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessStatus | null;
  session: {
    appStartedAt: string;
    previousSessionRestored: boolean;
  };
  paths: RuntimePaths;
  supportedPermissionTiers: PermissionTier[];
  supportedPrivacyScopes: PrivacyScope[];
  lastReportedBaseline: LastReportedBaseline | null;
  evidenceRefs: AwarenessDigest["evidenceRefs"];
  affectedAreas: AwarenessDigest["affectedAreas"];
}

export interface AwarenessEngineOptions {
  workspaceRoot?: string;
  appStartedAt: string;
  sessionId?: string;
  awarenessMode?: AwarenessMode;
  permissionTier?: PermissionTier;
  privacyScope?: PrivacyScope;
  watchedRoots?: string[];
  ignoredRoots?: string[];
  activeFeatureFlags?: string[];
  runGit?: Parameters<typeof captureRepoBaseline>[0]["runGit"];
  now?: () => Date;
  maxCommits?: number;
  machineInventory?: MachineCaptureOptions;
  fileInventory?: FileAwarenessCaptureOptions;
  screenInventory?: ScreenAwarenessCaptureOptions;
}

export interface AwarenessEngine {
  readonly paths: RuntimePaths;
  readonly session: SessionBaseline;
  readonly repo: RepoBaseline;
  readonly machine: MachineBaseline;
  readonly machineAwareness: MachineAwarenessSnapshot;
  readonly fileAwareness: FileAwarenessSnapshot;
  readonly screenAwareness: ScreenAwarenessSnapshot | null;
  readonly currentSnapshot: AwarenessRuntimeSnapshot;
  getDigest(): AwarenessDigest;
  getStatus(): AwarenessStatus;
  queryAwareness(request: AwarenessQueryRequest): AwarenessQueryAnswer | null;
  getAwarenessSummary(scope: AwarenessSummaryScope, mode?: AwarenessSummaryMode): AwarenessScopeSummary;
  getPerformanceDiagnostic(): AwarenessPerformanceDiagnostic;
  getStartupDiagnostic(): AwarenessStartupDiagnostic;
  getCurrentUiDiagnostic(): AwarenessCurrentUiDiagnostic;
  refresh(reason?: string): Promise<AwarenessDigest>;
  refreshFiles(reason?: string): Promise<FileAwarenessSnapshot>;
  refreshScreen(reason?: string): Promise<ScreenAwarenessSnapshot>;
  startAssistMode(options?: Parameters<ScreenAwarenessState["startAssist"]>[0]): Promise<ScreenAwarenessSnapshot>;
  stopAssistMode(reason?: string): Promise<ScreenAwarenessSnapshot>;
  getScreenStatus(): ScreenAwarenessStatus;
  markDigestDelivered(reason?: string): Promise<LastReportedBaseline>;
  appendEvent(input: AppendAwarenessEventInput): Promise<ReturnType<typeof normalizeAwarenessEvent>>;
  close(): Promise<void>;
}

const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const buildRuntimePaths = (repoRoot: string): RuntimePaths => {
  const runtimeRoot = path.join(repoRoot, ".runtime", "awareness");
  const fileRuntimeRoot = path.join(runtimeRoot, "files");
  const screenRuntimeRoot = path.join(runtimeRoot, "screen");

  return {
    repoRoot,
    runtimeRoot,
    fileRuntimeRoot,
    screenRuntimeRoot,
    currentSessionPath: path.join(runtimeRoot, "current-session.json"),
    previousSessionPath: path.join(runtimeRoot, "previous-session.json"),
    lastReportedBaselinePath: path.join(runtimeRoot, "last-reported-baseline.json"),
    latestDigestPath: path.join(runtimeRoot, "latest-digest.json"),
    eventsPath: path.join(runtimeRoot, "events.jsonl"),
    fileCurrentCatalogPath: path.join(fileRuntimeRoot, "current-catalog.json"),
    filePreviousCatalogPath: path.join(fileRuntimeRoot, "previous-catalog.json"),
    fileRecentChangesPath: path.join(fileRuntimeRoot, "recent-changes.json"),
    fileLatestSummaryPath: path.join(fileRuntimeRoot, "latest-summary.json"),
    screenCurrentPath: path.join(screenRuntimeRoot, "current-screen.json"),
    screenPreviousPath: path.join(screenRuntimeRoot, "previous-screen.json"),
    screenLatestSummaryPath: path.join(screenRuntimeRoot, "latest-summary.json"),
    screenEventsPath: path.join(screenRuntimeRoot, "events.jsonl")
  };
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const buildSnapshot = (input: {
  session: SessionBaseline;
  repo: RepoBaseline;
  machine: MachineBaseline;
  machineAwareness: MachineAwarenessSnapshot;
  fileAwareness: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessSnapshot | null;
  lastReportedBaseline: LastReportedBaseline | null;
  digest: AwarenessDigest;
}): AwarenessRuntimeSnapshot => ({
  version: 1,
  capturedAt: input.session.capturedAt,
  session: clone(input.session),
  repo: clone(input.repo),
  machine: clone(input.machine),
  machineAwareness: clone(input.machineAwareness),
  fileAwareness: input.fileAwareness ? clone(input.fileAwareness) : null,
  screenAwareness: input.screenAwareness ? clone(input.screenAwareness) : null,
  lastReportedBaseline: input.lastReportedBaseline ? clone(input.lastReportedBaseline) : null,
  digest: clone(input.digest)
});

const toHistoryView = (snapshot: AwarenessRuntimeSnapshot): AwarenessHistoryView => ({
  session: clone(snapshot.session),
  repo: clone(snapshot.repo),
  machine: clone(snapshot.machine),
  machineAwareness: clone(snapshot.machineAwareness),
  fileAwarenessSummary: snapshot.fileAwareness ? clone(snapshot.fileAwareness) : null,
  screenAwareness: snapshot.screenAwareness ? clone(snapshot.screenAwareness) : null,
  digest: clone(snapshot.digest),
  lastReportedBaseline: snapshot.lastReportedBaseline ? clone(snapshot.lastReportedBaseline) : null
});

const toCurrentView = (
  snapshot: AwarenessRuntimeSnapshot,
  fileAwarenessSnapshot: FileAwarenessSnapshot
): AwarenessView => ({
  ...toHistoryView(snapshot),
  fileAwarenessSnapshot: clone(fileAwarenessSnapshot)
});

const persistSnapshot = async (paths: RuntimePaths, snapshot: AwarenessRuntimeSnapshot): Promise<void> => {
  await writeJson(paths.currentSessionPath, snapshot);
  await writeJson(paths.latestDigestPath, snapshot.digest);
  if (snapshot.lastReportedBaseline) {
    await writeJson(paths.lastReportedBaselinePath, snapshot.lastReportedBaseline);
  }
};

const copyIfExists = async (sourcePath: string, destinationPath: string): Promise<boolean> => {
  try {
    await copyFile(sourcePath, destinationPath);
    return true;
  } catch {
    return false;
  }
};

const resolveStartupWorkspaceRoot = (requestedRoot?: string): string => {
  if (requestedRoot) {
    return path.resolve(requestedRoot);
  }

  const envRoot = process.env.SYNAI_WORKSPACE_ROOT?.trim();
  if (envRoot) {
    return path.resolve(envRoot);
  }

  return resolveRepositoryRoot(process.cwd());
};

const createAwarenessStatus = (engine: InternalAwarenessEngine): AwarenessStatus => {
  const digest = engine.getDigest();

  return {
    sessionId: engine.session.sessionId,
    awarenessMode: engine.session.awarenessMode,
    permissionTier: engine.session.permissionTier,
    privacyScope: engine.session.privacyScope,
    digestId: digest.id,
    baselineFingerprint: digest.baselineFingerprint,
    includeInContext: digest.includeInContext,
    includeReason: digest.includeReason,
    summary: digest.summary,
    freshness: digest.freshness,
    repo: {
      branch: digest.repo.branch,
      headSha: digest.repo.headSha,
      dirtyState: digest.repo.dirtyState,
      recentCommitCount: digest.repo.recentCommits.length,
      activeFeatureFlags: clone(digest.repo.activeFeatureFlags)
    },
    machine: {
      machineName: digest.machine.machineName,
      osVersion: digest.machine.osVersion,
      timezone: digest.machine.timezone
    },
    machineAwareness: clone(engine.machineAwareness.summary),
    fileAwareness: engine.fileAwareness ? clone(engine.fileAwareness.summary) : null,
    screenAwareness: engine.screenAwareness ? clone(engine.getScreenStatus()) : null,
    session: {
      appStartedAt: digest.session.appStartedAt,
      previousSessionRestored: digest.session.previousSessionRestored
    },
    paths: clone(engine.paths),
    supportedPermissionTiers: [...PHASE_ONE_PERMISSION_TIERS],
    supportedPrivacyScopes: ["public metadata", PHASE_ONE_ALLOWED_PRIVACY_SCOPE],
    lastReportedBaseline: engine.lastReportedBaseline ? clone(engine.lastReportedBaseline) : null,
    evidenceRefs: clone(digest.evidenceRefs),
    affectedAreas: clone(digest.affectedAreas)
  };
};

interface InternalAwarenessEngine extends AwarenessEngine {
  digest: AwarenessDigest;
  lastReportedBaseline: LastReportedBaseline | null;
  machineAwarenessState: MachineAwarenessSnapshot;
  fileAwarenessState: FileAwarenessState;
  screenAwarenessState: ScreenAwarenessState;
}

const ensureFallbackEvent = async (
  engine: InternalAwarenessEngine,
  message: string,
  details: Record<string, unknown>
): Promise<void> => {
  await appendAwarenessEvent(engine.paths.eventsPath, {
    type: "fallback_mode_enabled",
    source: "awareness/bootstrap",
    sessionId: engine.session.sessionId,
    evidenceRefs: engine.digest.evidenceRefs,
    affectedAreas: ["repo", "session", "machine", "files", "media"],
    confidence: 1,
    message,
    details
  });
};

export const initializeAwarenessEngine = async (
  options: AwarenessEngineOptions
): Promise<AwarenessEngine> => {
  const now = options.now ?? (() => new Date());
  const workspaceRoot = resolveStartupWorkspaceRoot(options.workspaceRoot);
  const paths = buildRuntimePaths(workspaceRoot);
  const awarenessPaths: AwarenessPathView = paths;
  await mkdir(paths.runtimeRoot, { recursive: true });

  const currentSessionSnapshot = await readJsonIfExists<AwarenessRuntimeSnapshot>(paths.currentSessionPath);
  const previousSessionSnapshot = currentSessionSnapshot
    ? currentSessionSnapshot
    : await readJsonIfExists<AwarenessRuntimeSnapshot>(paths.previousSessionPath);

  if (currentSessionSnapshot) {
    await copyIfExists(paths.currentSessionPath, paths.previousSessionPath);
  }

  const previousSession = previousSessionSnapshot?.session ?? null;
  const fileAwarenessState = await initializeFileAwareness({
    runtimeRoot: paths.fileRuntimeRoot,
    workspaceRoot,
    ...(options.fileInventory ?? {}),
    now
  });
  const machineAwarenessCapture = captureMachineAwarenessSnapshot({
    ...options.machineInventory,
    now
  });
  const repoCapture = captureRepoBaseline({
    workspaceRoot,
    watchedRoots: options.watchedRoots ?? DEFAULT_WATCHED_ROOTS,
    ignoredRoots: options.ignoredRoots ?? DEFAULT_IGNORED_ROOTS,
    activeFeatureFlags: options.activeFeatureFlags ?? [],
    maxCommits: options.maxCommits ?? 5,
    runGit: options.runGit,
    now
  });
  const machine = captureMachineBaseline({ now });
  const machineAwareness = await machineAwarenessCapture;
  const session = buildSessionBaseline({
    sessionId: options.sessionId ?? randomUUID(),
    appStartedAt: options.appStartedAt,
    workspaceRoot,
    runtimeRoot: paths.runtimeRoot,
    currentSessionPath: paths.currentSessionPath,
    previousSessionPath: paths.previousSessionPath,
    lastReportedBaselinePath: paths.lastReportedBaselinePath,
    latestDigestPath: paths.latestDigestPath,
    eventsPath: paths.eventsPath,
    awarenessMode: options.awarenessMode ?? DEFAULT_AWARENESS_MODE,
    permissionTier: options.permissionTier ?? "Observe",
    privacyScope: options.privacyScope ?? "public metadata",
    previousSessionId: previousSession?.sessionId ?? null,
    previousSessionRestored: Boolean(previousSessionSnapshot),
    now
  });
  const screenAwarenessState = await initializeScreenAwareness({
    runtimeRoot: paths.runtimeRoot,
    sessionId: session.sessionId,
    ...(options.screenInventory ?? {}),
    now
  });

  const initialDigest = buildAwarenessDigest({
    session,
    repo: repoCapture.repo,
    machine,
    lastReportedBaseline: previousSessionSnapshot?.lastReportedBaseline ?? null,
    evidenceRefs: repoCapture.evidenceRefs,
    includeReasonOverride: repoCapture.fallbackMode ? "fallback" : undefined
  });

  let digest = initialDigest;
  let lastReportedBaseline: LastReportedBaseline | null = previousSessionSnapshot?.lastReportedBaseline ?? null;
  let repoState = repoCapture.repo;
  let machineState = machine;
  let machineAwarenessState = machineAwareness;
  let currentSnapshot = buildSnapshot({
    session,
    repo: repoState,
    machine: machineState,
    machineAwareness: machineAwarenessState,
    fileAwareness: fileAwarenessState.snapshot.summary,
    screenAwareness: screenAwarenessState.snapshot,
    lastReportedBaseline,
    digest
  });
  let startupSnapshot = clone(currentSnapshot);

  const buildAwarenessViews = (nowValue = now()): Omit<AwarenessQueryBuildInput, "query" | "scope" | "mode"> => ({
    current: toCurrentView(currentSnapshot, fileAwarenessState.snapshot),
    startup: startupSnapshot ? toHistoryView(startupSnapshot) : null,
    previous: previousSessionSnapshot ? toHistoryView(previousSessionSnapshot) : null,
    paths: awarenessPaths,
    now: nowValue
  });

  const engine: InternalAwarenessEngine = {
    paths,
    session,
    fileAwarenessState,
    get repo() {
      return repoState;
    },
    get machine() {
      return machineState;
    },
    get machineAwareness() {
      return machineAwarenessState;
    },
    get fileAwareness() {
      return fileAwarenessState.snapshot;
    },
    get screenAwareness() {
      return screenAwarenessState.snapshot;
    },
    get currentSnapshot() {
      return currentSnapshot;
    },
    getDigest() {
      return stampAwarenessDigestFreshness(digest);
    },
    getStatus() {
      return createAwarenessStatus(engine);
    },
    queryAwareness(request) {
      const answer = buildAwarenessQueryAnswer({
        ...buildAwarenessViews(),
        query: request.query,
        scope: request.scope,
        mode: request.mode
      });
      return answer;
    },
    getAwarenessSummary(scope, mode) {
      return buildAwarenessScopeSummary({
        scope,
        mode,
        current: buildAwarenessViews().current,
        startup: startupSnapshot ? toHistoryView(startupSnapshot) : null,
        previous: previousSessionSnapshot ? toHistoryView(previousSessionSnapshot) : null,
        paths: awarenessPaths,
        now: now()
      });
    },
    getPerformanceDiagnostic() {
      return buildAwarenessPerformanceDiagnostic({
        current: buildAwarenessViews().current,
        paths: awarenessPaths,
        now: now()
      });
    },
    getStartupDiagnostic() {
      return buildAwarenessStartupDiagnostic({
        current: buildAwarenessViews().current,
        paths: awarenessPaths,
        now: now()
      });
    },
    getCurrentUiDiagnostic() {
      return buildAwarenessCurrentUiDiagnostic({
        current: buildAwarenessViews().current,
        paths: awarenessPaths,
        now: now()
      });
    },
    async refresh(reason = "manual") {
      const machineAwarenessRefresh = captureMachineAwarenessSnapshot({
        ...options.machineInventory,
        now
      });
      const fileAwarenessRefresh = fileAwarenessState.refresh(reason);
      const screenAwarenessRefresh = screenAwarenessState.refresh(reason);
      const repoRefresh = captureRepoBaseline({
        workspaceRoot,
        watchedRoots: repoState.watchedRoots,
        ignoredRoots: repoState.ignoredRoots,
        activeFeatureFlags: repoState.activeFeatureFlags,
        maxCommits: repoState.recentCommits.length || 5,
        runGit: options.runGit,
        now
      });
      const machineRefresh = captureMachineBaseline({ now });
      repoState = repoRefresh.repo;
      machineState = machineRefresh;
      machineAwarenessState = await machineAwarenessRefresh;
      await fileAwarenessRefresh;
      const refreshedScreenAwareness = await screenAwarenessRefresh;
      digest = buildAwarenessDigest({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        lastReportedBaseline,
        evidenceRefs: repoRefresh.evidenceRefs,
        includeReasonOverride: repoRefresh.fallbackMode ? "fallback" : undefined
      });
      currentSnapshot = buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: refreshedScreenAwareness,
        lastReportedBaseline,
        digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      await appendAwarenessEvent(engine.paths.eventsPath, {
        type: "digest_generated",
        source: "awareness/bootstrap",
        sessionId: engine.session.sessionId,
        evidenceRefs: digest.evidenceRefs,
        affectedAreas: digest.affectedAreas,
        confidence: 1,
        message: reason,
        details: {
          reason,
          includeInContext: digest.includeInContext,
          includeReason: digest.includeReason
        }
      });
      if (repoRefresh.fallbackMode) {
        await ensureFallbackEvent(engine, "Git metadata unavailable; running in fallback awareness mode.", {
          repoRoot: workspaceRoot
        });
      }
      return engine.getDigest();
    },
    async refreshFiles(reason = "manual") {
      const snapshot = await fileAwarenessState.refresh(reason);
      currentSnapshot = buildSnapshot({
        session: engine.session,
      repo: repoState,
      machine: machineState,
      machineAwareness: machineAwarenessState,
      fileAwareness: snapshot.summary,
      screenAwareness: screenAwarenessState.snapshot,
      lastReportedBaseline,
      digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      return snapshot;
    },
    async refreshScreen(reason = "manual") {
      const snapshot = await screenAwarenessState.refresh(reason);
      currentSnapshot = buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: snapshot,
        lastReportedBaseline,
        digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      return snapshot;
    },
    async startAssistMode(options) {
      const snapshot = await screenAwarenessState.startAssist(options);
      currentSnapshot = buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: snapshot,
        lastReportedBaseline,
        digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      return snapshot;
    },
    async stopAssistMode(reason) {
      const snapshot = await screenAwarenessState.stopAssist(reason);
      currentSnapshot = buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: snapshot,
        lastReportedBaseline,
        digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      return snapshot;
    },
    getScreenStatus() {
      return screenAwarenessState.status;
    },
    async markDigestDelivered(reason = "startup") {
      const deliveredDigest = engine.getDigest();
      lastReportedBaseline = buildLastReportedBaseline({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        digest: deliveredDigest,
        now
      });
      digest = buildAwarenessDigest({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        lastReportedBaseline,
        evidenceRefs: deliveredDigest.evidenceRefs,
        affectedAreas: deliveredDigest.affectedAreas,
        includeReasonOverride: deliveredDigest.includeReason === "debug" ? "debug" : "not_relevant"
      });
      currentSnapshot = buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: screenAwarenessState.snapshot,
        lastReportedBaseline,
        digest
      });
      await persistSnapshot(engine.paths, currentSnapshot);
      await appendAwarenessEvent(engine.paths.eventsPath, {
        type: "report_marked_delivered",
        source: "awareness/bootstrap",
        sessionId: engine.session.sessionId,
        evidenceRefs: [
          ...digest.evidenceRefs,
          {
            id: engine.paths.lastReportedBaselinePath,
            kind: "file",
            label: "last-reported-baseline",
            path: engine.paths.lastReportedBaselinePath
          }
        ],
        affectedAreas: ["journal", "api", "context"],
        confidence: 1,
        message: reason,
        details: {
          reason,
          digestId: digest.id
        }
      });
      return lastReportedBaseline;
    },
    async appendEvent(input) {
      return appendAwarenessEvent(engine.paths.eventsPath, input);
    },
    async close() {
      await screenAwarenessState.close();
      return Promise.resolve();
    }
  };

  if (previousSessionSnapshot) {
    await appendAwarenessEvent(paths.eventsPath, {
      type: "baseline_restored",
      source: "awareness/bootstrap",
      sessionId: session.sessionId,
      evidenceRefs: [
        {
          id: paths.previousSessionPath,
          kind: "session",
          label: "previous-session",
          path: paths.previousSessionPath
        }
      ],
      affectedAreas: ["session", "repo", "machine"],
      confidence: 1,
      details: {
        previousSessionId: previousSessionSnapshot.session.sessionId
      }
    });
  }

  await appendAwarenessEvent(paths.eventsPath, {
    type: "session_started",
    source: "awareness/bootstrap",
    sessionId: session.sessionId,
    evidenceRefs: [
      ...repoCapture.evidenceRefs,
      {
        id: paths.currentSessionPath,
        kind: "session",
        label: "current-session",
        path: paths.currentSessionPath
      }
    ],
    affectedAreas: ["session"],
    confidence: 1,
    details: {
      awarenessMode: session.awarenessMode,
      permissionTier: session.permissionTier,
      privacyScope: session.privacyScope
    }
  });

  await appendAwarenessEvent(paths.eventsPath, {
    type: "baseline_created",
    source: "awareness/bootstrap",
    sessionId: session.sessionId,
    evidenceRefs: [
      {
        id: paths.currentSessionPath,
        kind: "session",
        label: "current-session",
        path: paths.currentSessionPath
      }
    ],
    affectedAreas: ["repo", "session", "machine"],
    confidence: 1,
    details: {
      repoFingerprint: repoCapture.repo.fingerprint,
      machineFingerprint: machine.fingerprint,
      machineAwareness: machineAwareness.summary.summary,
      processCount: machineAwareness.summary.counts.processes,
      serviceCount: machineAwareness.summary.counts.services,
      fileAwareness: fileAwarenessState.snapshot.summary.summary,
      fileCount: fileAwarenessState.snapshot.summary.counts.files,
      folderCount: fileAwarenessState.snapshot.summary.counts.folders,
      mediaCount: fileAwarenessState.snapshot.summary.counts.media
    }
  });

  if (repoCapture.fallbackMode) {
    await ensureFallbackEvent(engine, "Git metadata unavailable; running in fallback awareness mode.", {
      repoRoot: workspaceRoot
    });
  }

  await appendAwarenessEvent(paths.eventsPath, {
    type: "digest_generated",
    source: "awareness/bootstrap",
    sessionId: session.sessionId,
    evidenceRefs: digest.evidenceRefs,
    affectedAreas: digest.affectedAreas,
    confidence: 1,
    details: {
      digestId: digest.id,
      includeInContext: digest.includeInContext,
      reason: digest.includeReason
    }
  });

  await persistSnapshot(paths, currentSnapshot);
  await engine.markDigestDelivered("startup");
  startupSnapshot = clone(currentSnapshot);

  return engine;
};

export const readAwarenessRuntimeSnapshot = async (
  snapshotPath: string
): Promise<AwarenessRuntimeSnapshot | null> => readJsonIfExists<AwarenessRuntimeSnapshot>(snapshotPath);

export const readAwarenessJournal = async (eventsPath: string) => readAwarenessEvents(eventsPath);
