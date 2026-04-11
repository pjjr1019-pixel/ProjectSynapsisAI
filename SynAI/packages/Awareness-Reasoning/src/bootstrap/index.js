import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { buildAwarenessDigest, buildLastReportedBaseline, buildSessionBaseline, captureMachineBaseline, captureRepoBaseline, DEFAULT_AWARENESS_MODE, DEFAULT_IGNORED_ROOTS, DEFAULT_WATCHED_ROOTS, PHASE_ONE_ALLOWED_PRIVACY_SCOPE, PHASE_ONE_PERMISSION_TIERS, resolveRepositoryRoot } from "../baseline";
import { createFreshnessMetadata, stampAwarenessDigestFreshness } from "../context";
import { buildRecurringPatterns, buildStartupDigest, updateRollingMetrics } from "./insights";
import { createBackgroundTaskRunner } from "./task-runner";
import { initializeOfficialKnowledge } from "../official-knowledge";
import { buildAwarenessCurrentUiDiagnostic, buildAwarenessAnomalyDiagnostic, buildAwarenessEventLogDiagnostic, buildAwarenessPerformanceDiagnostic, buildAwarenessQueryAnswer, buildAwarenessScopeSummary, buildAwarenessStorageDiagnostic, buildAwarenessStartupDiagnostic, planAwarenessIntents } from "../reasoning";
import { captureMachineAwarenessSnapshot, buildMachineAwarenessSummary, createWindowsMachineInventorySource } from "../machine";
import { initializeFileAwareness, queryWindowsIndexedEntries } from "../files";
import { initializeScreenAwareness } from "../screen";
import { appendAwarenessEvent, readAwarenessEvents, rotateEventsJournal } from "../journal";
const readJsonIfExists = async (filePath) => {
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const writeJson = async (filePath, value) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const buildRuntimePaths = (repoRoot) => {
    const runtimeRoot = path.join(repoRoot, ".runtime", "awareness");
    const fileRuntimeRoot = path.join(runtimeRoot, "files");
    const screenRuntimeRoot = path.join(runtimeRoot, "screen");
    const officialKnowledgeRuntimeRoot = path.join(runtimeRoot, "official-knowledge");
    return {
        repoRoot,
        runtimeRoot,
        fileRuntimeRoot,
        screenRuntimeRoot,
        officialKnowledgeRuntimeRoot,
        currentSessionPath: path.join(runtimeRoot, "current-session.json"),
        previousSessionPath: path.join(runtimeRoot, "previous-session.json"),
        lastReportedBaselinePath: path.join(runtimeRoot, "last-reported-baseline.json"),
        lastReportedSnapshotPath: path.join(runtimeRoot, "last-reported-session.json"),
        latestDigestPath: path.join(runtimeRoot, "latest-digest.json"),
        eventsPath: path.join(runtimeRoot, "events.jsonl"),
        fileCurrentCatalogPath: path.join(fileRuntimeRoot, "current-catalog.json"),
        filePreviousCatalogPath: path.join(fileRuntimeRoot, "previous-catalog.json"),
        fileRecentChangesPath: path.join(fileRuntimeRoot, "recent-changes.json"),
        fileLatestSummaryPath: path.join(fileRuntimeRoot, "latest-summary.json"),
        screenCurrentPath: path.join(screenRuntimeRoot, "current-screen.json"),
        screenPreviousPath: path.join(screenRuntimeRoot, "previous-screen.json"),
        screenLatestSummaryPath: path.join(screenRuntimeRoot, "latest-summary.json"),
        screenEventsPath: path.join(screenRuntimeRoot, "events.jsonl"),
        officialKnowledgeMirrorPath: path.join(officialKnowledgeRuntimeRoot, "mirror.json"),
        officialKnowledgeStatusPath: path.join(officialKnowledgeRuntimeRoot, "status.json")
    };
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const buildSnapshot = (input) => ({
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
const toHistoryView = (snapshot) => ({
    session: clone(snapshot.session),
    repo: clone(snapshot.repo),
    machine: clone(snapshot.machine),
    machineAwareness: clone(snapshot.machineAwareness),
    fileAwarenessSummary: snapshot.fileAwareness ? clone(snapshot.fileAwareness) : null,
    screenAwareness: snapshot.screenAwareness ? clone(snapshot.screenAwareness) : null,
    digest: clone(snapshot.digest),
    lastReportedBaseline: snapshot.lastReportedBaseline ? clone(snapshot.lastReportedBaseline) : null
});
const toCurrentView = (snapshot, fileAwarenessSnapshot) => ({
    ...toHistoryView(snapshot),
    fileAwarenessSnapshot: clone(fileAwarenessSnapshot)
});
const persistSnapshot = async (paths, snapshot) => {
    await writeJson(paths.currentSessionPath, snapshot);
    await writeJson(paths.latestDigestPath, snapshot.digest);
    if (snapshot.lastReportedBaseline) {
        await writeJson(paths.lastReportedBaselinePath, snapshot.lastReportedBaseline);
    }
};
const copyIfExists = async (sourcePath, destinationPath) => {
    try {
        await copyFile(sourcePath, destinationPath);
        return true;
    }
    catch {
        return false;
    }
};
const resolveStartupWorkspaceRoot = (requestedRoot) => {
    if (requestedRoot) {
        return path.resolve(requestedRoot);
    }
    const envRoot = process.env.SYNAI_WORKSPACE_ROOT?.trim();
    if (envRoot) {
        return path.resolve(envRoot);
    }
    return resolveRepositoryRoot(process.cwd());
};
const createAwarenessStatus = (engine) => {
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
            activeFeatureFlags: clone(digest.repo.activeFeatureFlags),
            workingTreeSummary: digest.repo.workingTree.summary,
            workingTreeCounts: clone(digest.repo.workingTree.counts)
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
        supportedAwarenessAnswerModes: ["evidence-first", "llm-primary"],
        defaultAwarenessAnswerMode: "evidence-first",
        lastReportedBaseline: engine.lastReportedBaseline ? clone(engine.lastReportedBaseline) : null,
        evidenceRefs: clone(digest.evidenceRefs),
        affectedAreas: clone(digest.affectedAreas),
        officialKnowledge: clone(engine.getOfficialKnowledgeStatus()),
        runtime: clone(engine.getRuntimeHealth()),
        startupDigest: engine.startupDigest ? clone(engine.startupDigest) : null
    };
};
const MIN_REFRESH_INTERVALS_MS = {
    repo: 2_500,
    machine: 4_000,
    files: 2_500,
    screen: 1_500,
    "live-usage": 1_500
};
const ensureFallbackEvent = async (engine, message, details) => {
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
const normalizeQuery = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const uniqueStrings = (values) => {
    const seen = new Set();
    const output = [];
    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        output.push(normalized);
    }
    return output;
};
const mergeIndexedFileEvidence = (snapshot, indexed) => {
    const seenFiles = new Set();
    const files = [...indexed.files, ...snapshot.files].filter((entry) => {
        const key = entry.path.toLowerCase();
        if (seenFiles.has(key)) {
            return false;
        }
        seenFiles.add(key);
        return true;
    });
    const seenMedia = new Set();
    const media = [...indexed.media, ...snapshot.media].filter((entry) => {
        const key = entry.path.toLowerCase();
        if (seenMedia.has(key)) {
            return false;
        }
        seenMedia.add(key);
        return true;
    });
    return {
        ...snapshot,
        files,
        media
    };
};
const buildOfficialUpdateCorrelation = (current, documents, machine, nowValue) => {
    if (!current) {
        return null;
    }
    const versionHint = normalizeQuery(`${machine.systemIdentity.windowsEdition ?? ""} ${machine.systemIdentity.windowsVersion ?? ""} ${machine.systemIdentity.windowsBuild ?? ""}`);
    const relevantDocs = documents.filter((document) => ["release-health", "release-information", "whats-new", "windows-update"].includes(document.topic));
    const versionMatchedDocs = versionHint.length === 0
        ? relevantDocs
        : relevantDocs.filter((document) => document.versionTags.length === 0 ||
            document.versionTags.some((tag) => versionHint.includes(normalizeQuery(tag))));
    const knownIssueMatches = uniqueStrings(versionMatchedDocs
        .filter((document) => document.topic === "release-health")
        .flatMap((document) => document.extracts.slice(0, 1))).slice(0, 3);
    const whatsNewHighlights = uniqueStrings(versionMatchedDocs
        .filter((document) => document.topic === "whats-new" || document.topic === "release-information")
        .flatMap((document) => document.extracts.slice(0, 1))).slice(0, 3);
    return {
        ...current,
        freshness: createFreshnessMetadata(current.capturedAt, current.capturedAt, nowValue),
        currentBuild: current.currentBuild ?? machine.systemIdentity.windowsBuild,
        knownIssueMatches,
        whatsNewHighlights
    };
};
const buildRefreshPlan = (request, screenEnabled) => {
    const intentPlan = planAwarenessIntents(request.query, request.conversationContext);
    const route = intentPlan.primary;
    const normalized = normalizeQuery(request.query);
    const targets = new Set();
    const families = [intentPlan.primary.family, ...intentPlan.secondary.map((item) => item.family)];
    for (const family of families) {
        switch (family) {
            case "file-folder-media":
                targets.add("files");
                break;
            case "live-usage":
                targets.add("machine");
                break;
            case "resource-hotspot":
            case "process-service-startup":
            case "hardware":
            case "performance-diagnostic":
                targets.add("machine");
                break;
            case "settings-control-panel":
            case "registry":
                if (normalized.includes("running") ||
                    normalized.includes("service") ||
                    normalized.includes("process") ||
                    normalized.includes("startup")) {
                    targets.add("machine");
                }
                break;
            case "on-screen":
                if (screenEnabled) {
                    targets.add("screen");
                }
                break;
            case "repo-change":
            default:
                targets.add("repo");
                if (normalized.includes("changed") ||
                    normalized.includes("change") ||
                    normalized.includes("diff") ||
                    normalized.includes("downloads") ||
                    normalized.includes("files")) {
                    targets.add("files");
                }
                if (screenEnabled && (normalized.includes("screen") || normalized.includes("window"))) {
                    targets.add("screen");
                }
                break;
        }
    }
    if (normalized.includes("startup") || normalized.includes("slowing") || normalized.includes("slow")) {
        targets.add("machine");
    }
    return {
        route,
        targets: [...targets],
        reason: `query:${route.family}`
    };
};
export const initializeAwarenessEngine = async (options) => {
    const initStartedAtMs = Date.now();
    const now = options.now ?? (() => new Date());
    const workspaceRoot = resolveStartupWorkspaceRoot(options.workspaceRoot);
    const paths = buildRuntimePaths(workspaceRoot);
    const awarenessPaths = paths;
    await mkdir(paths.runtimeRoot, { recursive: true });
    const officialKnowledgeState = await initializeOfficialKnowledge({
        runtimeRoot: paths.officialKnowledgeRuntimeRoot,
        now,
        ...(options.officialKnowledge ?? {})
    });
    const currentSessionSnapshot = await readJsonIfExists(paths.currentSessionPath);
    const previousSessionSnapshot = currentSessionSnapshot
        ? currentSessionSnapshot
        : await readJsonIfExists(paths.previousSessionPath);
    const initialLastReportedSnapshot = await readJsonIfExists(paths.lastReportedSnapshotPath);
    if (currentSessionSnapshot) {
        await copyIfExists(paths.currentSessionPath, paths.previousSessionPath);
    }
    // Rec #13: rotate main events journal to prevent unbounded growth across sessions
    await rotateEventsJournal(paths.eventsPath);
    const previousSession = previousSessionSnapshot?.session ?? null;
    const fileAwarenessState = await initializeFileAwareness({
        runtimeRoot: paths.fileRuntimeRoot,
        workspaceRoot,
        roots: options.fileInventory?.roots && options.fileInventory.roots.length > 0
            ? options.fileInventory.roots
            : [workspaceRoot],
        additionalRoots: options.fileInventory?.additionalRoots,
        ...(options.fileInventory ?? {}),
        now
    });
    // Run machine inventory and git baseline concurrently — neither depends on the other
    const [machineAwareness, repoCapture] = await Promise.all([
        captureMachineAwarenessSnapshot({ ...options.machineInventory, now }),
        captureRepoBaseline({
            workspaceRoot,
            watchedRoots: options.watchedRoots ?? DEFAULT_WATCHED_ROOTS,
            ignoredRoots: options.ignoredRoots ?? DEFAULT_IGNORED_ROOTS,
            activeFeatureFlags: options.activeFeatureFlags ?? [],
            maxCommits: options.maxCommits ?? 5,
            runGit: options.runGit,
            now
        })
    ]);
    const machine = captureMachineBaseline({ now });
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
        lastReportedBaseline: previousSessionSnapshot?.lastReportedBaseline ?? initialLastReportedSnapshot?.lastReportedBaseline ?? null,
        evidenceRefs: repoCapture.evidenceRefs,
        includeReasonOverride: repoCapture.fallbackMode ? "fallback" : undefined
    });
    let digest = initialDigest;
    let lastReportedBaseline = previousSessionSnapshot?.lastReportedBaseline ?? initialLastReportedSnapshot?.lastReportedBaseline ?? null;
    let lastReportedSnapshot = initialLastReportedSnapshot;
    let repoState = repoCapture.repo;
    let machineState = machine;
    let machineAwarenessState = machineAwareness;
    let startupDigestState = initialDigest.startupDigest ?? null;
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
    const inFlightRefreshes = new Map();
    const recentDurationsMs = {};
    const backgroundTaskRunner = createBackgroundTaskRunner(now);
    const samplerIntervalsMs = {
        "live-usage": 12_000,
        repo: 60_000,
        machine: 45_000,
        files: 120_000
    };
    let lastSampledAt = null;
    let backgroundSamplerActive = false;
    const backgroundSamplerTimers = new Set();
    const recordDurationMs = (label, startedAtMs) => {
        recentDurationsMs[label] = Math.max(0, Date.now() - startedAtMs);
    };
    let lastInitDurationMs = Math.max(0, Date.now() - initStartedAtMs);
    const toRuntimeInsightView = (snapshot) => snapshot
        ? {
            session: snapshot.session,
            repo: snapshot.repo,
            machineAwareness: snapshot.machineAwareness,
            fileAwareness: snapshot.fileAwareness,
            screenAwareness: snapshot.screenAwareness
        }
        : null;
    const getTargetCapturedAt = (target) => {
        if (target === "repo") {
            return digest.freshness.capturedAt;
        }
        if (target === "machine") {
            return machineAwarenessState.capturedAt;
        }
        if (target === "files") {
            return fileAwarenessState.snapshot.freshness.capturedAt;
        }
        if (target === "screen") {
            return screenAwarenessState.snapshot.freshness.capturedAt;
        }
        return (machineAwarenessState.systemIdentity.hardware.freshness.capturedAt ??
            machineAwarenessState.systemIdentity.freshness.capturedAt ??
            machineAwarenessState.capturedAt);
    };
    const isTargetFreshEnough = (target) => {
        const capturedAt = getTargetCapturedAt(target);
        if (!capturedAt) {
            return false;
        }
        const capturedAtMs = Date.parse(capturedAt);
        if (!Number.isFinite(capturedAtMs)) {
            return false;
        }
        return now().getTime() - capturedAtMs <= MIN_REFRESH_INTERVALS_MS[target];
    };
    const runTrackedRefresh = async (target, refresh) => {
        const existing = inFlightRefreshes.get(target);
        if (existing) {
            return existing;
        }
        const startedAtMs = Date.now();
        const promise = Promise.resolve()
            .then(refresh)
            .finally(() => {
            recordDurationMs(target, startedAtMs);
            inFlightRefreshes.delete(target);
        });
        inFlightRefreshes.set(target, promise);
        return promise;
    };
    const getRuntimeHealth = () => ({
        initializing: false,
        ready: true,
        inFlightTargets: [...inFlightRefreshes.keys()].sort(),
        backgroundWorkerStatus: backgroundTaskRunner.getHealth().status,
        backgroundWorkerTask: backgroundTaskRunner.getHealth().activeTask,
        backgroundWorkerQueueDepth: backgroundTaskRunner.getHealth().queueDepth,
        backgroundWorkerLastCompletedAt: backgroundTaskRunner.getHealth().lastCompletedAt,
        backgroundWorkerLastError: backgroundTaskRunner.getHealth().lastError,
        recentDurationsMs: clone(recentDurationsMs),
        lastInitDurationMs,
        backgroundSamplerActive,
        lastSampledAt,
        samplerIntervalsMs: clone(samplerIntervalsMs),
        startupDigestReady: Boolean(startupDigestState),
        officialKnowledgeReady: officialKnowledgeState.getStatus().ready,
        officialKnowledgeDocCount: officialKnowledgeState.getStatus().documentCount,
        officialKnowledgeLastRefreshedAt: officialKnowledgeState.getStatus().lastRefreshedAt,
        volumeMonitorHealthy: (fileAwarenessState.snapshot.monitor?.volumes ?? []).length === 0 ||
            (fileAwarenessState.snapshot.monitor?.volumes ?? []).every((volume) => volume.watcherHealth === "healthy" || volume.watcherHealth === "idle")
    });
    const buildAwarenessViews = (nowValue = now()) => ({
        current: toCurrentView(currentSnapshot, fileAwarenessState.snapshot),
        startup: startupSnapshot ? toHistoryView(startupSnapshot) : null,
        previous: previousSessionSnapshot ? toHistoryView(previousSessionSnapshot) : null,
        lastReport: lastReportedSnapshot ? toHistoryView(lastReportedSnapshot) : null,
        paths: awarenessPaths,
        now: nowValue
    });
    const rebuildCurrentSnapshot = () => buildSnapshot({
        session: engine.session,
        repo: repoState,
        machine: machineState,
        machineAwareness: machineAwarenessState,
        fileAwareness: fileAwarenessState.snapshot.summary,
        screenAwareness: screenAwarenessState.snapshot,
        lastReportedBaseline,
        digest
    });
    const refreshDigest = (evidenceRefs = digest.evidenceRefs, includeReasonOverride) => {
        digest = buildAwarenessDigest({
            session: session,
            repo: repoState,
            machine: machineState,
            lastReportedBaseline,
            startupDigest: startupDigestState,
            evidenceRefs,
            includeReasonOverride
        });
    };
    const applyDerivedInsights = (nowValue = now(), options) => {
        const rollingMetrics = options?.appendRollingSample || !machineAwarenessState.rollingMetrics
            ? updateRollingMetrics(machineAwarenessState.rollingMetrics ?? null, machineAwarenessState, nowValue)
            : machineAwarenessState.rollingMetrics;
        const updateCorrelation = buildOfficialUpdateCorrelation(machineAwarenessState.updateCorrelation ?? null, officialKnowledgeState.documents, machineAwarenessState, nowValue);
        const nextMachineAwareness = {
            ...machineAwarenessState,
            rollingMetrics,
            updateCorrelation
        };
        const currentView = {
            session,
            repo: repoState,
            machineAwareness: nextMachineAwareness,
            fileAwareness: fileAwarenessState.snapshot.summary,
            screenAwareness: screenAwarenessState.snapshot
        };
        const recurringPatterns = buildRecurringPatterns({
            current: currentView,
            previous: toRuntimeInsightView(previousSessionSnapshot),
            lastReport: toRuntimeInsightView(lastReportedSnapshot),
            now: nowValue
        });
        machineAwarenessState = {
            ...nextMachineAwareness,
            recurringPatterns
        };
        machineAwarenessState.summary = buildMachineAwarenessSummary(machineAwarenessState);
        startupDigestState = buildStartupDigest({
            current: {
                ...currentView,
                machineAwareness: machineAwarenessState
            },
            previous: toRuntimeInsightView(previousSessionSnapshot),
            lastReport: toRuntimeInsightView(lastReportedSnapshot),
            patterns: recurringPatterns,
            now: nowValue
        });
        refreshDigest(digest.evidenceRefs);
    };
    const persistCurrentState = async () => {
        currentSnapshot = rebuildCurrentSnapshot();
        await persistSnapshot(paths, currentSnapshot);
    };
    const engine = {
        paths,
        session,
        get digest() {
            return digest;
        },
        get lastReportedBaseline() {
            return lastReportedBaseline;
        },
        get startupDigestState() {
            return startupDigestState;
        },
        get machineAwarenessState() {
            return machineAwarenessState;
        },
        fileAwarenessState,
        get screenAwarenessState() {
            return screenAwarenessState;
        },
        get lastReportedSnapshot() {
            return lastReportedSnapshot;
        },
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
        get startupDigest() {
            return startupDigestState;
        },
        getRuntimeHealth() {
            return getRuntimeHealth();
        },
        getDigest() {
            return stampAwarenessDigestFreshness(digest);
        },
        getStatus() {
            return createAwarenessStatus(engine);
        },
        getStartupDigest() {
            return startupDigestState ? clone(startupDigestState) : null;
        },
        getOfficialKnowledgeStatus() {
            return clone(officialKnowledgeState.getStatus());
        },
        listOfficialKnowledgeSources() {
            return clone(officialKnowledgeState.listSources());
        },
        async setOfficialKnowledgeSourceEnabled(sourceId, enabled) {
            await officialKnowledgeState.setSourceEnabled(sourceId, enabled);
            await persistCurrentState();
            return clone(officialKnowledgeState.getStatus());
        },
        async refreshOfficialKnowledgeSource(sourceId) {
            await officialKnowledgeState.refreshSource(sourceId);
            return clone(officialKnowledgeState.getStatus());
        },
        async queryOfficialKnowledge(query, queryOptions) {
            const context = await officialKnowledgeState.query(query, queryOptions);
            return context ? clone(context) : null;
        },
        async refreshOfficialKnowledge(reason = "manual") {
            await officialKnowledgeState.refresh(reason);
            return clone(officialKnowledgeState.getStatus());
        },
        listFileVolumes() {
            return clone(fileAwarenessState.snapshot.volumes ?? []);
        },
        async browseFolder(folderPath) {
            const listing = await fileAwarenessState.browseFolder(folderPath);
            return listing ? clone(listing) : null;
        },
        getFileMonitorStatus() {
            const monitor = fileAwarenessState.getMonitorStatus();
            return monitor ? clone(monitor) : null;
        },
        queryAwareness(request) {
            const answerMode = request.awarenessAnswerMode ?? "evidence-first";
            const strictGrounding = request.hints?.strictGrounding ?? answerMode === "evidence-first";
            const force = request.hints?.force ?? answerMode === "evidence-first";
            const intentPlan = planAwarenessIntents(request.query, request.conversationContext);
            const answer = buildAwarenessQueryAnswer({
                ...buildAwarenessViews(),
                query: request.query,
                route: intentPlan.primary,
                intentPlan,
                conversationContext: request.conversationContext,
                scope: request.scope,
                mode: request.mode,
                answerMode,
                strictGrounding,
                force
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
                lastReport: lastReportedSnapshot ? toHistoryView(lastReportedSnapshot) : null,
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
        getStorageDiagnostic() {
            return buildAwarenessStorageDiagnostic({
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
        getEventLogDiagnostic() {
            return buildAwarenessEventLogDiagnostic({
                current: buildAwarenessViews().current,
                paths: awarenessPaths,
                now: now()
            });
        },
        getAnomalyDiagnostic() {
            return buildAwarenessAnomalyDiagnostic({
                current: buildAwarenessViews().current,
                paths: awarenessPaths,
                now: now()
            });
        },
        async queryAwarenessLive(request) {
            const queryStartedAtMs = Date.now();
            const answerMode = request.awarenessAnswerMode ?? "evidence-first";
            const strictGrounding = request.hints?.strictGrounding ?? answerMode === "evidence-first";
            const force = request.hints?.force ?? answerMode === "evidence-first";
            const maxScanMs = Math.max(100, request.hints?.maxScanMs ?? (answerMode === "evidence-first" ? 300 : 200));
            const intentPlan = planAwarenessIntents(request.query, request.conversationContext);
            const route = intentPlan.primary;
            const officialKnowledgePolicy = request.officialKnowledgePolicy ??
                request.hints?.officialKnowledgePolicy ??
                "mirror-first";
            const allowOfficialWindowsKnowledge = request.allowOfficialWindowsKnowledge ??
                request.hints?.allowOfficialWindowsKnowledge ??
                true;
            const shouldClarify = buildAwarenessQueryAnswer({
                ...buildAwarenessViews(),
                query: request.query,
                route,
                intentPlan,
                conversationContext: request.conversationContext,
                officialKnowledge: null,
                scope: request.scope,
                mode: request.mode,
                answerMode,
                strictGrounding,
                force,
                scanTimedOut: false,
                scanTargets: []
            })?.clarification;
            const shouldRefresh = request.refresh ?? true;
            const scanTargets = [];
            let scanTimedOut = false;
            let officialKnowledge = null;
            let indexedFileEvidence = null;
            if (shouldRefresh && !shouldClarify) {
                if (route.family === "live-usage") {
                    if (!isTargetFreshEnough("live-usage") || inFlightRefreshes.has("live-usage")) {
                        scanTargets.push("machine");
                        try {
                            await engine.refreshLiveUsage("query:live-usage");
                        }
                        catch {
                            // Fall back to the last known live snapshot if the quick refresh fails.
                        }
                    }
                }
                else {
                    const plan = buildRefreshPlan(request, Boolean(screenAwarenessState.snapshot.assistMode.enabled));
                    const hasStrongIntentSignals = route.confidence >= 0.55 || route.signals.length > 0;
                    const scanStartedAt = Date.now();
                    for (const target of plan.targets) {
                        if (Date.now() - scanStartedAt >= maxScanMs) {
                            scanTimedOut = true;
                            break;
                        }
                        if (isTargetFreshEnough(target) && !inFlightRefreshes.has(target)) {
                            continue;
                        }
                        if (answerMode !== "evidence-first" && !hasStrongIntentSignals && !inFlightRefreshes.has(target)) {
                            continue;
                        }
                        scanTargets.push(target);
                        if (target === "repo") {
                            await engine.refreshRepo(plan.reason);
                        }
                        else if (target === "machine") {
                            await engine.refreshMachine(plan.reason);
                        }
                        else if (target === "files") {
                            await engine.refreshFiles(plan.reason);
                        }
                        else if (target === "screen") {
                            await engine.refreshScreen(plan.reason);
                        }
                    }
                }
            }
            if (allowOfficialWindowsKnowledge && officialKnowledgePolicy !== "off") {
                officialKnowledge = await officialKnowledgeState.query(request.query, {
                    policy: officialKnowledgePolicy,
                    windowsVersionHint: request.windowsVersionHint ??
                        request.hints?.windowsVersionHint ??
                        machineAwarenessState.systemIdentity.windowsBuild ??
                        machineAwarenessState.systemIdentity.windowsVersion ??
                        undefined,
                    allowLiveFetch: officialKnowledgePolicy === "live-fallback",
                    route
                });
            }
            const views = buildAwarenessViews();
            if (route.family === "file-folder-media" && views.current.fileAwarenessSnapshot) {
                indexedFileEvidence = await queryWindowsIndexedEntries(request.query, {
                    limit: 12,
                    volumeRoots: views.current.fileAwarenessSnapshot.volumes
                        .filter((volume) => volume.indexedSearchCapable)
                        .map((volume) => volume.rootPath),
                    mode: request.query.toLowerCase().includes("photo") ||
                        request.query.toLowerCase().includes("video") ||
                        request.query.toLowerCase().includes("audio") ||
                        request.query.toLowerCase().includes("document") ||
                        request.query.toLowerCase().includes("media")
                        ? "media"
                        : "files",
                    now: now()
                });
                if (indexedFileEvidence) {
                    scanTargets.push("files:indexed");
                }
            }
            const queryBuildInput = indexedFileEvidence && views.current.fileAwarenessSnapshot
                ? {
                    ...views,
                    current: {
                        ...views.current,
                        fileAwarenessSnapshot: mergeIndexedFileEvidence(views.current.fileAwarenessSnapshot, indexedFileEvidence)
                    }
                }
                : views;
            const answer = buildAwarenessQueryAnswer({
                ...queryBuildInput,
                query: request.query,
                scope: request.scope,
                mode: request.mode,
                route,
                intentPlan,
                conversationContext: request.conversationContext,
                officialKnowledge,
                answerMode,
                strictGrounding,
                force,
                scanTimedOut,
                scanTargets
            });
            recordDurationMs("queryAwarenessLive", queryStartedAtMs);
            return answer;
        },
        async refresh(reason = "manual") {
            await Promise.all([
                engine.refreshRepo(reason),
                engine.refreshMachine(reason),
                engine.refreshFiles(reason),
                engine.refreshScreen(reason)
            ]);
            refreshDigest(digest.evidenceRefs);
            await persistCurrentState();
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
            return engine.getDigest();
        },
        async refreshRepo(reason = "manual") {
            return runTrackedRefresh("repo", async () => {
                const repoRefresh = await captureRepoBaseline({
                    workspaceRoot,
                    watchedRoots: repoState.watchedRoots,
                    ignoredRoots: repoState.ignoredRoots,
                    activeFeatureFlags: repoState.activeFeatureFlags,
                    maxCommits: repoState.recentCommits.length || 5,
                    runGit: options.runGit,
                    now
                });
                repoState = repoRefresh.repo;
                refreshDigest(repoRefresh.evidenceRefs, repoRefresh.fallbackMode ? "fallback" : undefined);
                applyDerivedInsights(now(), { appendRollingSample: false });
                await persistCurrentState();
                return repoState;
            });
        },
        async refreshMachine(reason = "manual") {
            void reason;
            return runTrackedRefresh("machine", async () => {
                const machineAwarenessRefresh = captureMachineAwarenessSnapshot({
                    ...options.machineInventory,
                    now
                });
                machineState = captureMachineBaseline({ now });
                machineAwarenessState = await machineAwarenessRefresh;
                applyDerivedInsights(now(), { appendRollingSample: true });
                lastSampledAt = now().toISOString();
                await persistCurrentState();
                return machineAwarenessState;
            });
        },
        async refreshLiveUsage(reason = "live-usage") {
            void reason;
            return runTrackedRefresh("live-usage", async () => {
                try {
                    const inventorySource = options.machineInventory?.source ?? createWindowsMachineInventorySource();
                    const refreshedIdentity = await Promise.resolve(inventorySource.captureSystemIdentity()).catch(() => machineAwarenessState.systemIdentity);
                    const refreshedAt = now();
                    const capturedAt = refreshedAt.toISOString();
                    const nextMachineAwareness = {
                        ...machineAwarenessState,
                        capturedAt,
                        freshness: createFreshnessMetadata(capturedAt, capturedAt, refreshedAt),
                        systemIdentity: {
                            ...machineAwarenessState.systemIdentity,
                            ...refreshedIdentity,
                            freshness: refreshedIdentity.freshness ??
                                createFreshnessMetadata(refreshedIdentity.capturedAt, refreshedIdentity.capturedAt, refreshedAt),
                            hardware: {
                                ...machineAwarenessState.systemIdentity.hardware,
                                ...refreshedIdentity.hardware,
                                freshness: refreshedIdentity.hardware.freshness ??
                                    createFreshnessMetadata(refreshedIdentity.hardware.capturedAt, refreshedIdentity.hardware.capturedAt, refreshedAt)
                            }
                        }
                    };
                    machineState = captureMachineBaseline({ now });
                    machineAwarenessState = nextMachineAwareness;
                    applyDerivedInsights(refreshedAt, { appendRollingSample: true });
                    lastSampledAt = refreshedAt.toISOString();
                    await persistCurrentState();
                }
                catch {
                    currentSnapshot = rebuildCurrentSnapshot();
                }
                return machineAwarenessState;
            });
        },
        async refreshFiles(reason = "manual") {
            return runTrackedRefresh("files", async () => {
                const snapshot = await fileAwarenessState.refresh(reason);
                void snapshot;
                applyDerivedInsights(now(), { appendRollingSample: false });
                await persistCurrentState();
                return snapshot;
            });
        },
        async refreshScreen(reason = "manual") {
            return runTrackedRefresh("screen", async () => {
                const snapshot = await screenAwarenessState.refresh(reason);
                void snapshot;
                applyDerivedInsights(now(), { appendRollingSample: false });
                await persistCurrentState();
                return snapshot;
            });
        },
        async startAssistMode(options) {
            const snapshot = await screenAwarenessState.startAssist(options);
            void snapshot;
            applyDerivedInsights(now(), { appendRollingSample: false });
            await persistCurrentState();
            return snapshot;
        },
        async stopAssistMode(reason) {
            const snapshot = await screenAwarenessState.stopAssist(reason);
            void snapshot;
            applyDerivedInsights(now(), { appendRollingSample: false });
            await persistCurrentState();
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
                startupDigest: startupDigestState,
                evidenceRefs: deliveredDigest.evidenceRefs,
                affectedAreas: deliveredDigest.affectedAreas,
                includeReasonOverride: deliveredDigest.includeReason === "debug" ? "debug" : "not_relevant"
            });
            await persistCurrentState();
            lastReportedSnapshot = clone(currentSnapshot);
            await writeJson(engine.paths.lastReportedSnapshotPath, lastReportedSnapshot);
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
            stopBackgroundSampler();
            officialKnowledgeState.close();
            await screenAwarenessState.close();
            return Promise.resolve();
        }
    };
    applyDerivedInsights(now(), { appendRollingSample: true });
    currentSnapshot = rebuildCurrentSnapshot();
    const stopBackgroundSampler = () => {
        for (const timer of backgroundSamplerTimers) {
            clearInterval(timer);
        }
        backgroundSamplerTimers.clear();
        backgroundSamplerActive = false;
    };
    const addBackgroundWorkerSampler = (target, intervalMs, task, predicate) => {
        const timer = setInterval(() => {
            if (predicate && !predicate()) {
                return;
            }
            if (inFlightRefreshes.has(target)) {
                return;
            }
            if (target !== "live-usage" && isTargetFreshEnough(target)) {
                return;
            }
            void backgroundTaskRunner
                .run(`background:${target}`, task)
                .then(() => {
                lastSampledAt = now().toISOString();
            })
                .catch(() => undefined);
        }, intervalMs);
        backgroundSamplerTimers.add(timer);
    };
    const startBackgroundSampler = () => {
        if (backgroundSamplerActive) {
            return;
        }
        backgroundSamplerActive = true;
        addBackgroundWorkerSampler("live-usage", samplerIntervalsMs["live-usage"], () => engine.refreshLiveUsage("background-sampler"));
        addBackgroundWorkerSampler("repo", samplerIntervalsMs.repo, () => engine.refreshRepo("background-sampler"));
        addBackgroundWorkerSampler("machine", samplerIntervalsMs.machine, () => engine.refreshMachine("background-sampler"));
        addBackgroundWorkerSampler("files", samplerIntervalsMs.files, () => engine.refreshFiles("background-sampler"), () => fileAwarenessState.snapshot.summary.counts.roots > 0);
        const officialTimer = setInterval(() => {
            void backgroundTaskRunner
                .run("background:official-knowledge", () => engine.refreshOfficialKnowledge("background-sampler:official-knowledge"))
                .catch(() => undefined);
        }, 24 * 60 * 60 * 1000);
        backgroundSamplerTimers.add(officialTimer);
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
            eventLogCount: machineAwareness.summary.counts.eventLogEntries,
            eventLogErrorCount: machineAwareness.summary.counts.eventLogErrors,
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
    startBackgroundSampler();
    lastInitDurationMs = Math.max(0, Date.now() - initStartedAtMs);
    return engine;
};
export const readAwarenessRuntimeSnapshot = async (snapshotPath) => readJsonIfExists(snapshotPath);
export const readAwarenessJournal = async (eventsPath) => readAwarenessEvents(eventsPath);
