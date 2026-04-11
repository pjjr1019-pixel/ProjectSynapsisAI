import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { appendAwarenessEvent, readAwarenessEvents } from "../journal";
import { buildScreenDiffSummary, buildCounts, buildFreshness, buildHighlights, buildScreenSummaryText, cloneSnapshot, compactJoin, describeCaptureMode, describeScope, formatWindowSummary, isScreenRelevant } from "./shared";
import { createWindowsScreenCaptureSource } from "./windows";
const DEFAULT_MAX_RECENT_EVENTS = 20;
const DEFAULT_CAPTURE_MODE = "on-demand";
const DEFAULT_SAMPLE_INTERVAL_MS = 2000;
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
const buildRuntimePaths = (runtimeRoot) => {
    const screenRoot = path.join(runtimeRoot, "screen");
    return {
        runtimeRoot,
        screenRoot,
        currentScreenPath: path.join(screenRoot, "current-screen.json"),
        previousScreenPath: path.join(screenRoot, "previous-screen.json"),
        latestSummaryPath: path.join(screenRoot, "latest-summary.json"),
        eventsPath: path.join(screenRoot, "events.jsonl")
    };
};
const createEvidenceRef = (pathValue, kind, label) => ({
    id: pathValue,
    kind,
    label,
    path: pathValue
});
const persistSnapshot = async (paths, snapshot) => {
    await writeJson(paths.currentScreenPath, snapshot);
    await writeJson(paths.latestSummaryPath, snapshot.summary);
};
const appendEvents = async (eventsPath, events) => {
    const persisted = await Promise.all(events.map((event) => appendAwarenessEvent(eventsPath, event)));
    return persisted;
};
const makeFingerprint = (snapshot) => createHash("sha1")
    .update(JSON.stringify({
    assistMode: snapshot.assistMode,
    foregroundWindow: snapshot.foregroundWindow,
    frame: snapshot.frame,
    uiTree: snapshot.uiTree
        ? {
            rootWindowHandle: snapshot.uiTree.rootWindowHandle,
            rootWindowTitle: snapshot.uiTree.rootWindowTitle,
            totalCount: snapshot.uiTree.totalCount,
            redactedCount: snapshot.uiTree.redactedCount
        }
        : null,
    recentEvents: snapshot.recentEvents.map((event) => ({
        type: event.type,
        message: event.message ?? null
    }))
}))
    .digest("hex");
const trimEvents = (events, limit = DEFAULT_MAX_RECENT_EVENTS) => events.slice(-limit);
const createAssistMode = (input, now) => ({
    enabled: input.enabled,
    visibleIndicator: input.enabled,
    scope: input.scope,
    targetLabel: input.targetLabel,
    captureMode: input.captureMode,
    sampleIntervalMs: input.sampleIntervalMs,
    startedAt: input.startedAt,
    stoppedAt: input.stoppedAt,
    freshness: buildFreshness(input.startedAt ?? input.stoppedAt ?? now.toISOString(), now)
});
const emptyTree = (scope, targetLabel, now) => ({
    capturedAt: now.toISOString(),
    freshness: buildFreshness(now.toISOString(), now),
    scope,
    targetLabel,
    rootWindowHandle: null,
    rootWindowTitle: null,
    cursorPosition: null,
    elementUnderCursor: null,
    focusedElement: null,
    root: null,
    totalCount: 0,
    isTruncated: false,
    redactedCount: 0
});
const emptyFrame = (scope, targetLabel, captureMode, now) => ({
    capturedAt: now.toISOString(),
    freshness: buildFreshness(now.toISOString(), now),
    scope,
    targetLabel,
    captureMode,
    windowHandle: null,
    windowTitle: null,
    virtualBounds: null,
    monitorCount: null,
    monitors: null,
    redactions: [],
    uiElementCount: 0,
    screenshotPath: null,
    ocrText: null,
    ocrLines: null
});
const emptySnapshot = (options, now) => {
    const assistMode = createAssistMode({
        enabled: false,
        scope: options.scope,
        targetLabel: options.targetLabel,
        captureMode: options.captureMode,
        sampleIntervalMs: options.sampleIntervalMs,
        startedAt: options.startedAt,
        stoppedAt: options.stoppedAt
    }, now);
    const summaryText = "Assist mode off";
    const recentEvents = [];
    const snapshot = {
        capturedAt: now.toISOString(),
        freshness: buildFreshness(now.toISOString(), now),
        assistMode,
        foregroundWindow: null,
        uiTree: emptyTree(options.scope, options.targetLabel, now),
        frame: emptyFrame(options.scope, options.targetLabel, options.captureMode, now),
        recentEvents,
        summary: {
            capturedAt: now.toISOString(),
            freshness: buildFreshness(now.toISOString(), now),
            summary: summaryText,
            assistMode,
            scope: options.scope,
            targetLabel: options.targetLabel,
            foregroundWindowTitle: null,
            counts: {
                windows: 0,
                uiElements: 0,
                events: 0,
                protectedInputs: 0,
                hoverTargets: 0,
                clickTargets: 0
            },
            highlights: {
                activeWindow: [],
                controls: [],
                hoverTargets: [],
                clickTargets: [],
                blockedInputs: []
            },
            diff: null,
            recentEvents: []
        },
        fingerprint: "",
        isTruncated: false
    };
    snapshot.fingerprint = makeFingerprint(snapshot);
    return snapshot;
};
const buildStatus = (snapshot) => ({
    assistMode: cloneSnapshot(snapshot.assistMode),
    scope: snapshot.assistMode.scope,
    targetLabel: snapshot.assistMode.targetLabel,
    visibleIndicator: snapshot.assistMode.visibleIndicator,
    freshness: cloneSnapshot(snapshot.summary.freshness),
    summary: snapshot.summary.summary,
    foregroundWindowTitle: snapshot.summary.foregroundWindowTitle,
    processName: snapshot.foregroundWindow?.processName ?? null,
    counts: cloneSnapshot(snapshot.summary.counts),
    blockedScopes: snapshot.recentEvents
        .filter((event) => event.type === "protected_input_blocked")
        .flatMap((event) => {
        const scope = event.details?.scope;
        return typeof scope === "string" ? [scope] : [];
    }),
    supportedScopes: ["current-window", "selected-app", "chosen-display"],
    lastEventType: snapshot.recentEvents.at(-1)?.type ?? null
});
const buildSummary = (snapshot) => ({
    capturedAt: snapshot.capturedAt,
    freshness: cloneSnapshot(snapshot.freshness),
    summary: buildScreenSummaryText(snapshot),
    assistMode: cloneSnapshot(snapshot.assistMode),
    scope: snapshot.assistMode.scope,
    targetLabel: snapshot.assistMode.targetLabel,
    foregroundWindowTitle: snapshot.foregroundWindow?.title ?? null,
    counts: buildCounts({
        foregroundWindow: snapshot.foregroundWindow,
        uiTree: snapshot.uiTree,
        recentEvents: snapshot.recentEvents
    }),
    highlights: buildHighlights({
        foregroundWindow: snapshot.foregroundWindow,
        uiTree: snapshot.uiTree,
        recentEvents: snapshot.recentEvents
    }),
    diff: snapshot.diff ?? null,
    recentEvents: snapshot.recentEvents.slice(-5).map((event) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        message: event.message ?? null
    }))
});
const buildSnapshot = (input) => {
    const capturedAt = input.now.toISOString();
    const snapshot = {
        capturedAt,
        freshness: buildFreshness(capturedAt, input.now),
        assistMode: input.assistMode,
        foregroundWindow: input.foregroundWindow,
        uiTree: input.uiTree,
        frame: input.frame,
        diff: null,
        recentEvents: cloneSnapshot(input.recentEvents),
        summary: {
            capturedAt,
            freshness: buildFreshness(capturedAt, input.now),
            summary: "",
            assistMode: input.assistMode,
            scope: input.assistMode.scope,
            targetLabel: input.assistMode.targetLabel,
            foregroundWindowTitle: null,
            counts: {
                windows: 0,
                uiElements: 0,
                events: 0,
                protectedInputs: 0,
                hoverTargets: 0,
                clickTargets: 0
            },
            highlights: {
                activeWindow: [],
                controls: [],
                hoverTargets: [],
                clickTargets: [],
                blockedInputs: []
            },
            diff: null,
            recentEvents: []
        },
        fingerprint: "",
        isTruncated: Boolean(input.uiTree?.isTruncated)
    };
    snapshot.summary = buildSummary(snapshot);
    snapshot.fingerprint = makeFingerprint(snapshot);
    return snapshot;
};
const compareWindow = (left, right) => Boolean(left &&
    right &&
    left.windowHandle === right.windowHandle &&
    left.title === right.title &&
    left.processId === right.processId &&
    left.processName === right.processName);
const compareNode = (left, right) => {
    if (!left || !right) {
        return false;
    }
    return (left.name === right.name &&
        left.controlType === right.controlType &&
        left.focused === right.focused &&
        left.selected === right.selected);
};
const buildEvents = (input) => {
    const events = [];
    const screenRef = createEvidenceRef(input.paths.currentScreenPath, "screen", "screen-snapshot");
    const windowRef = createEvidenceRef(input.paths.currentScreenPath, "window", "foreground-window");
    const treeRef = createEvidenceRef(input.paths.currentScreenPath, "ui-tree", "ui-tree");
    if (!input.previousSnapshot || input.previousSnapshot.assistMode.enabled !== input.nextSnapshot.assistMode.enabled) {
        events.push({
            type: input.nextSnapshot.assistMode.enabled ? "assist_started" : "assist_stopped",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [screenRef],
            affectedAreas: ["screen", "assist"],
            confidence: 1,
            message: input.reason
        });
    }
    if (input.nextSnapshot.foregroundWindow &&
        (!input.previousSnapshot?.foregroundWindow ||
            !compareWindow(input.previousSnapshot.foregroundWindow, input.nextSnapshot.foregroundWindow))) {
        events.push({
            type: "active_window_changed",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [windowRef],
            affectedAreas: ["screen", "ui"],
            confidence: 1,
            message: input.nextSnapshot.foregroundWindow.title ?? input.nextSnapshot.foregroundWindow.processName ?? "window changed",
            details: {
                title: input.nextSnapshot.foregroundWindow.title,
                processName: input.nextSnapshot.foregroundWindow.processName
            }
        });
    }
    if (input.nextSnapshot.uiTree) {
        events.push({
            type: "ui_tree_refreshed",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [treeRef],
            affectedAreas: ["screen", "ui"],
            confidence: 1,
            message: `${input.nextSnapshot.uiTree.totalCount} elements`
        });
    }
    if (input.nextSnapshot.frame) {
        events.push({
            type: "screen_frame_captured",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [screenRef],
            affectedAreas: ["screen"],
            confidence: 1,
            message: describeCaptureMode(input.nextSnapshot.frame.captureMode),
            details: {
                scope: input.nextSnapshot.frame.scope,
                targetLabel: input.nextSnapshot.frame.targetLabel,
                captureMode: input.nextSnapshot.frame.captureMode,
                uiElementCount: input.nextSnapshot.frame.uiElementCount
            }
        });
    }
    const previousHover = input.previousSnapshot?.uiTree?.elementUnderCursor ?? null;
    const nextHover = input.nextSnapshot.uiTree?.elementUnderCursor ?? null;
    if (nextHover && !compareNode(previousHover, nextHover)) {
        events.push({
            type: "hover_target_changed",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [treeRef],
            affectedAreas: ["screen", "interaction", "ui"],
            confidence: 0.9,
            message: nextHover.name ?? nextHover.localizedControlType ?? nextHover.controlType,
            details: {
                targetLabel: nextHover.name,
                controlType: nextHover.controlType
            }
        });
    }
    const previousFocus = input.previousSnapshot?.uiTree?.focusedElement ?? null;
    const nextFocus = input.nextSnapshot.uiTree?.focusedElement ?? null;
    if (nextFocus && !compareNode(previousFocus, nextFocus)) {
        events.push({
            type: "click_observed",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [treeRef],
            affectedAreas: ["screen", "interaction", "ui"],
            confidence: 0.7,
            message: nextFocus.name ?? nextFocus.localizedControlType ?? nextFocus.controlType,
            details: {
                targetLabel: nextFocus.name,
                controlType: nextFocus.controlType
            }
        });
    }
    if ((input.nextSnapshot.uiTree?.redactedCount ?? 0) > 0) {
        events.push({
            type: "protected_input_blocked",
            source: "awareness/screen",
            sessionId: input.sessionId,
            evidenceRefs: [treeRef],
            affectedAreas: ["screen", "privacy", "ui"],
            confidence: 1,
            message: `${input.nextSnapshot.uiTree?.redactedCount ?? 0} protected input blocked`,
            details: {
                redactedCount: input.nextSnapshot.uiTree?.redactedCount ?? 0
            }
        });
    }
    return events;
};
const captureOnce = async (source, current, paths, sessionId, reason, now) => {
    if (!current.assistMode.enabled) {
        return current;
    }
    const foregroundWindow = cloneSnapshot(await source.captureForegroundWindow());
    const rawUiTree = cloneSnapshot(await source.captureUiTree());
    const rawFrame = cloneSnapshot((await source.captureFrame?.()) ?? null);
    const targetLabel = current.assistMode.targetLabel?.toLowerCase() ?? null;
    const shouldRedact = current.assistMode.scope === "selected-app" &&
        targetLabel !== null &&
        Boolean(foregroundWindow &&
            ![foregroundWindow.title, foregroundWindow.processName, foregroundWindow.executablePath]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(targetLabel)));
    const uiTree = shouldRedact ? null : rawUiTree;
    const assistMode = createAssistMode({
        enabled: true,
        scope: current.assistMode.scope,
        targetLabel: current.assistMode.targetLabel,
        captureMode: current.assistMode.captureMode,
        sampleIntervalMs: current.assistMode.sampleIntervalMs,
        startedAt: current.assistMode.startedAt,
        stoppedAt: null
    }, now);
    const frame = rawFrame
        ? {
            ...rawFrame,
            capturedAt: now.toISOString(),
            freshness: buildFreshness(now.toISOString(), now),
            scope: assistMode.scope,
            targetLabel: assistMode.targetLabel,
            captureMode: assistMode.captureMode,
            windowHandle: foregroundWindow?.windowHandle ?? rawFrame.windowHandle ?? null,
            windowTitle: foregroundWindow?.title ?? rawFrame.windowTitle ?? null,
            redactions: uiTree?.redactedCount ? ["protected-input"] : rawFrame.redactions ?? [],
            uiElementCount: uiTree?.totalCount ?? rawFrame.uiElementCount ?? 0
        }
        : {
            capturedAt: now.toISOString(),
            freshness: buildFreshness(now.toISOString(), now),
            scope: assistMode.scope,
            targetLabel: assistMode.targetLabel,
            captureMode: assistMode.captureMode,
            windowHandle: foregroundWindow?.windowHandle ?? null,
            windowTitle: foregroundWindow?.title ?? null,
            virtualBounds: null,
            monitorCount: null,
            monitors: null,
            redactions: uiTree?.redactedCount ? ["protected-input"] : [],
            uiElementCount: uiTree?.totalCount ?? 0,
            screenshotPath: null,
            ocrText: null,
            ocrLines: null
        };
    const previousSnapshot = cloneSnapshot(current);
    const nextSnapshot = buildSnapshot({
        assistMode,
        foregroundWindow,
        uiTree,
        frame,
        recentEvents: current.recentEvents,
        now
    });
    nextSnapshot.diff = buildScreenDiffSummary({
        previous: previousSnapshot,
        current: nextSnapshot
    });
    const events = buildEvents({
        sessionId,
        reason,
        paths,
        previousSnapshot,
        nextSnapshot
    });
    const persisted = await appendEvents(paths.eventsPath, events);
    nextSnapshot.recentEvents = trimEvents([...current.recentEvents, ...persisted], DEFAULT_MAX_RECENT_EVENTS);
    nextSnapshot.summary = buildSummary(nextSnapshot);
    nextSnapshot.fingerprint = makeFingerprint(nextSnapshot);
    await persistSnapshot(paths, nextSnapshot);
    return nextSnapshot;
};
export const initializeScreenAwareness = async (options) => {
    const now = options.now ?? (() => new Date());
    const paths = buildRuntimePaths(path.resolve(options.runtimeRoot));
    const source = options.source ?? createWindowsScreenCaptureSource({ runtimeRoot: paths.runtimeRoot });
    const maxRecentEvents = options.maxRecentEvents ?? DEFAULT_MAX_RECENT_EVENTS;
    await mkdir(paths.screenRoot, { recursive: true });
    const existing = await readJsonIfExists(paths.currentScreenPath);
    if (existing) {
        await copyFile(paths.currentScreenPath, paths.previousScreenPath).catch(() => undefined);
        await copyFile(paths.eventsPath, path.join(paths.screenRoot, "previous-events.jsonl")).catch(() => undefined);
    }
    let snapshot = existing
        ? {
            ...cloneSnapshot(existing),
            assistMode: createAssistMode({
                enabled: false,
                scope: existing.assistMode.scope ?? options.defaultScope ?? "current-window",
                targetLabel: existing.assistMode.targetLabel ?? options.defaultTargetLabel ?? null,
                captureMode: existing.assistMode.captureMode ?? options.defaultCaptureMode ?? DEFAULT_CAPTURE_MODE,
                sampleIntervalMs: existing.assistMode.sampleIntervalMs ?? options.defaultSampleIntervalMs ?? null,
                startedAt: null,
                stoppedAt: now().toISOString()
            }, now()),
            foregroundWindow: null,
            uiTree: emptyTree(existing.assistMode.scope ?? options.defaultScope ?? "current-window", existing.assistMode.targetLabel ?? options.defaultTargetLabel ?? null, now()),
            frame: emptyFrame(existing.assistMode.scope ?? options.defaultScope ?? "current-window", existing.assistMode.targetLabel ?? options.defaultTargetLabel ?? null, existing.assistMode.captureMode ?? options.defaultCaptureMode ?? DEFAULT_CAPTURE_MODE, now()),
            recentEvents: []
        }
        : emptySnapshot({
            scope: options.defaultScope ?? "current-window",
            targetLabel: options.defaultTargetLabel ?? null,
            captureMode: options.defaultCaptureMode ?? DEFAULT_CAPTURE_MODE,
            sampleIntervalMs: options.defaultSampleIntervalMs ?? null,
            startedAt: null,
            stoppedAt: now().toISOString()
        }, now());
    snapshot.summary = buildSummary(snapshot);
    snapshot.fingerprint = makeFingerprint(snapshot);
    await persistSnapshot(paths, snapshot);
    await writeFile(paths.eventsPath, "", "utf8");
    const refresh = async (reason = "manual") => {
        if (!snapshot.assistMode.enabled) {
            snapshot.summary = buildSummary(snapshot);
            snapshot.fingerprint = makeFingerprint(snapshot);
            await persistSnapshot(paths, snapshot);
            return snapshot;
        }
        snapshot = await captureOnce(source, snapshot, paths, options.sessionId, reason, now());
        snapshot.recentEvents = trimEvents(await readAwarenessEvents(paths.eventsPath), maxRecentEvents);
        snapshot.summary = buildSummary(snapshot);
        snapshot.fingerprint = makeFingerprint(snapshot);
        await persistSnapshot(paths, snapshot);
        return snapshot;
    };
    let pollingTimer = null;
    const stopPolling = () => {
        if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    };
    const startPolling = () => {
        if (pollingTimer || snapshot.assistMode.captureMode !== "session") {
            return;
        }
        const interval = Math.max(250, snapshot.assistMode.sampleIntervalMs ?? options.defaultSampleIntervalMs ?? DEFAULT_SAMPLE_INTERVAL_MS);
        pollingTimer = setInterval(() => {
            void refresh("session-sample").catch(() => undefined);
        }, interval);
    };
    const startAssist = async (assistOptions) => {
        const currentNow = now();
        const nextAssistMode = createAssistMode({
            enabled: true,
            scope: assistOptions?.scope ?? snapshot.assistMode.scope ?? options.defaultScope ?? "current-window",
            targetLabel: assistOptions?.targetLabel ?? snapshot.assistMode.targetLabel ?? options.defaultTargetLabel ?? null,
            captureMode: assistOptions?.captureMode ?? snapshot.assistMode.captureMode ?? options.defaultCaptureMode ?? DEFAULT_CAPTURE_MODE,
            sampleIntervalMs: assistOptions?.sampleIntervalMs ?? snapshot.assistMode.sampleIntervalMs ?? options.defaultSampleIntervalMs ?? null,
            startedAt: currentNow.toISOString(),
            stoppedAt: null
        }, currentNow);
        snapshot.assistMode = nextAssistMode;
        snapshot.frame = emptyFrame(nextAssistMode.scope, nextAssistMode.targetLabel, nextAssistMode.captureMode, currentNow);
        snapshot.summary = buildSummary(snapshot);
        snapshot.fingerprint = makeFingerprint(snapshot);
        await persistSnapshot(paths, snapshot);
        const persisted = await appendEvents(paths.eventsPath, [
            {
                type: "assist_started",
                source: "awareness/screen",
                sessionId: options.sessionId,
                evidenceRefs: [createEvidenceRef(paths.currentScreenPath, "screen", "screen-snapshot")],
                affectedAreas: ["screen", "assist"],
                confidence: 1,
                message: "assist mode enabled",
                details: {
                    scope: nextAssistMode.scope,
                    targetLabel: nextAssistMode.targetLabel,
                    captureMode: nextAssistMode.captureMode,
                    sampleIntervalMs: nextAssistMode.sampleIntervalMs
                }
            }
        ]);
        snapshot.recentEvents = trimEvents([...snapshot.recentEvents, ...persisted], maxRecentEvents);
        snapshot = await captureOnce(source, snapshot, paths, options.sessionId, "assist-started", currentNow);
        snapshot.recentEvents = trimEvents(await readAwarenessEvents(paths.eventsPath), maxRecentEvents);
        snapshot.summary = buildSummary(snapshot);
        snapshot.fingerprint = makeFingerprint(snapshot);
        await persistSnapshot(paths, snapshot);
        startPolling();
        return snapshot;
    };
    const stopAssist = async (reason = "assist-disabled") => {
        stopPolling();
        const currentNow = now();
        snapshot.assistMode = createAssistMode({
            enabled: false,
            scope: snapshot.assistMode.scope,
            targetLabel: snapshot.assistMode.targetLabel,
            captureMode: snapshot.assistMode.captureMode,
            sampleIntervalMs: snapshot.assistMode.sampleIntervalMs,
            startedAt: snapshot.assistMode.startedAt,
            stoppedAt: currentNow.toISOString()
        }, currentNow);
        snapshot.foregroundWindow = null;
        snapshot.uiTree = emptyTree(snapshot.assistMode.scope, snapshot.assistMode.targetLabel, currentNow);
        snapshot.frame = emptyFrame(snapshot.assistMode.scope, snapshot.assistMode.targetLabel, snapshot.assistMode.captureMode, currentNow);
        const persisted = await appendEvents(paths.eventsPath, [
            {
                type: "assist_stopped",
                source: "awareness/screen",
                sessionId: options.sessionId,
                evidenceRefs: [createEvidenceRef(paths.currentScreenPath, "screen", "screen-snapshot")],
                affectedAreas: ["screen", "assist"],
                confidence: 1,
                message: reason,
                details: {
                    reason
                }
            }
        ]);
        snapshot.recentEvents = trimEvents([...snapshot.recentEvents, ...persisted], maxRecentEvents);
        snapshot.summary = buildSummary(snapshot);
        snapshot.fingerprint = makeFingerprint(snapshot);
        await persistSnapshot(paths, snapshot);
        return snapshot;
    };
    return {
        paths,
        get snapshot() {
            return snapshot;
        },
        get status() {
            return buildStatus(snapshot);
        },
        refresh,
        startAssist,
        stopAssist,
        async close() {
            stopPolling();
            return Promise.resolve();
        }
    };
};
export const buildScreenAwarenessContextSection = (snapshot, latestUserMessage, awarenessMode = "observe") => {
    if (!snapshot || (!snapshot.assistMode.enabled && awarenessMode !== "debug")) {
        return null;
    }
    if (!isScreenRelevant(latestUserMessage, awarenessMode, snapshot.assistMode.enabled)) {
        return null;
    }
    const windowLabel = formatWindowSummary(snapshot.foregroundWindow) ?? "no foreground window";
    const likelyControl = snapshot.summary.highlights.controls.find((entry) => /(next|continue|ok|save|apply|submit|done|allow|confirm)/i.test(entry)) ??
        snapshot.summary.highlights.controls[0] ??
        "none";
    return [
        `Screen awareness: ${snapshot.summary.summary}`,
        `Scope: ${describeScope(snapshot.assistMode.scope)}`,
        `Foreground window: ${windowLabel}`,
        `Visible controls: ${compactJoin(snapshot.summary.highlights.controls) || "none"}`,
        `Likely next control: ${likelyControl}`,
        `Recent screen events: ${compactJoin(snapshot.summary.recentEvents.map((event) => `${event.type}${event.message ? `: ${event.message}` : ""}`)) || "none"}`
    ].join("\n");
};
export { createFixtureScreenCaptureSource } from "./windows";
export { createWindowsScreenCaptureSource } from "./windows";
