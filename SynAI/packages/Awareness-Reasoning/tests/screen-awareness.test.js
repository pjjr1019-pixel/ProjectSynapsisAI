import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../src/memory/index";
import { createAwarenessApiServer } from "../src/api";
import { buildScreenAwarenessContextSection, initializeScreenAwareness } from "../src/screen";
import { createFixtureScreenCaptureSource } from "../src/screen/windows";
const fixedNow = () => new Date("2026-04-08T01:00:00.000Z");
const fixedIso = () => fixedNow().toISOString();
const buildFreshness = (capturedAt) => ({
    capturedAt,
    generatedAt: capturedAt,
    observedAt: capturedAt,
    ageMs: 0,
    staleAfterMs: 5 * 60 * 1000,
    isFresh: true
});
const buildUiElement = (id, overrides = {}) => ({
    id,
    automationId: null,
    controlType: "Pane",
    localizedControlType: "pane",
    name: null,
    value: null,
    className: null,
    helpText: null,
    bounds: null,
    enabled: true,
    focused: false,
    selected: false,
    offscreen: false,
    visible: true,
    isPassword: false,
    privacyScope: "user-visible local content",
    ...overrides,
    children: overrides.children ?? []
});
const buildScreenFixture = () => {
    const capturedAt = fixedIso();
    const freshness = buildFreshness(capturedAt);
    const saveButton = buildUiElement("save-button", {
        controlType: "Button",
        localizedControlType: "Button",
        name: "Save Changes",
        bounds: { x: 160, y: 120, width: 120, height: 32 }
    });
    const nextButton = buildUiElement("next-button", {
        controlType: "Button",
        localizedControlType: "Button",
        name: "Open Settings",
        bounds: { x: 20, y: 120, width: 120, height: 32 }
    });
    const passwordField = buildUiElement("password-field", {
        controlType: "Edit",
        localizedControlType: "edit",
        name: "Password",
        value: "s3cr3t",
        helpText: "enter current password",
        isPassword: true,
        privacyScope: "protected/system-sensitive surfaces",
        bounds: { x: 20, y: 180, width: 260, height: 32 }
    });
    const root = buildUiElement("root-pane", {
        controlType: "Pane",
        localizedControlType: "pane",
        name: "Settings",
        bounds: { x: 0, y: 0, width: 640, height: 400 },
        children: [nextButton, saveButton, passwordField]
    });
    return {
        foregroundWindow: {
            capturedAt,
            freshness,
            windowHandle: "0x1234",
            title: "Settings - Bluetooth",
            processId: 4242,
            processName: "SystemSettings",
            executablePath: "C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe",
            className: "ApplicationFrameWindow",
            bounds: { x: 0, y: 0, width: 640, height: 400 },
            isForeground: true,
            isFocused: true,
            zOrder: 1
        },
        uiTree: {
            capturedAt,
            freshness,
            scope: null,
            targetLabel: null,
            rootWindowHandle: "0x1234",
            rootWindowTitle: "Settings - Bluetooth",
            cursorPosition: { x: 56, y: 132 },
            elementUnderCursor: nextButton,
            focusedElement: saveButton,
            root,
            totalCount: 4,
            isTruncated: false,
            redactedCount: 1
        }
    };
};
const withWorkspace = async (fn) => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "synai-screen-awareness-"));
    try {
        return await fn(workspaceRoot);
    }
    finally {
        await rm(workspaceRoot, { recursive: true, force: true });
    }
};
describe("screen awareness", () => {
    it("keeps Assist Mode explicit, visible, and free of raw secrets in context", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const fixture = buildScreenFixture();
            const state = await initializeScreenAwareness({
                runtimeRoot: path.join(workspaceRoot, ".runtime", "awareness"),
                sessionId: "screen-session",
                source: createFixtureScreenCaptureSource(fixture),
                now: fixedNow
            });
            expect(state.status.visibleIndicator).toBe(false);
            expect(state.snapshot.recentEvents).toHaveLength(0);
            const idleRefresh = await state.refresh("idle");
            expect(idleRefresh.recentEvents).toHaveLength(0);
            const active = await state.startAssist({
                scope: "current-window",
                targetLabel: "Settings",
                captureMode: "on-demand"
            });
            expect(state.status.visibleIndicator).toBe(true);
            expect(active.assistMode.enabled).toBe(true);
            expect(active.foregroundWindow?.title).toBe("Settings - Bluetooth");
            expect(active.foregroundWindow?.processName).toBe("SystemSettings");
            expect(active.uiTree?.root?.children.map((child) => child.name)).toEqual(expect.arrayContaining(["Open Settings", "Save Changes", "Password"]));
            expect(active.uiTree?.redactedCount).toBe(1);
            expect(active.summary.highlights.controls).toEqual(expect.arrayContaining(["Open Settings (Button)", "Save Changes (Button)"]));
            const eventTypes = active.recentEvents.map((event) => event.type);
            expect(eventTypes).toEqual(expect.arrayContaining([
                "assist_started",
                "active_window_changed",
                "ui_tree_refreshed",
                "screen_frame_captured",
                "click_observed",
                "hover_target_changed",
                "protected_input_blocked"
            ]));
            const contextSection = buildScreenAwarenessContextSection(active, "what button should I click next?", "contextual");
            expect(contextSection).not.toBeNull();
            expect(contextSection ?? "").toContain("Screen awareness:");
            expect(contextSection ?? "").toContain("Likely next control:");
            expect(contextSection ?? "").not.toContain("s3cr3t");
            const stopped = await state.stopAssist("user-disabled");
            expect(state.status.visibleIndicator).toBe(false);
            expect(stopped.assistMode.enabled).toBe(false);
            expect(stopped.recentEvents.map((event) => event.type)).toContain("assist_stopped");
        });
    });
    it("routes on-screen questions into a compact context section only when relevant", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const fixture = buildScreenFixture();
            const state = await initializeScreenAwareness({
                runtimeRoot: path.join(workspaceRoot, ".runtime", "awareness"),
                sessionId: "screen-context",
                source: createFixtureScreenCaptureSource(fixture),
                now: fixedNow
            });
            const active = await state.startAssist({
                scope: "current-window",
                targetLabel: "Settings",
                captureMode: "on-demand"
            });
            const relevant = assembleContext({
                systemInstruction: "system",
                summaryText: "summary",
                allMessages: [
                    {
                        id: "msg-1",
                        conversationId: "conversation-1",
                        role: "user",
                        content: "where should I click next?",
                        createdAt: fixedIso()
                    }
                ],
                stableMemories: [],
                retrievedMemories: [],
                webSearch: {
                    status: "off",
                    query: "",
                    results: []
                },
                screenAwareness: active
            });
            expect(relevant.preview.screenAwareness).not.toBeNull();
            expect(relevant.promptMessages[0].content).toContain("Screen awareness:");
            expect(relevant.promptMessages[0].content).toContain("Likely next control:");
            expect(relevant.promptMessages[0].content).not.toContain("s3cr3t");
            expect(relevant.promptMessages[0].content.length).toBeLessThan(1400);
            const irrelevant = assembleContext({
                systemInstruction: "system",
                summaryText: "summary",
                allMessages: [
                    {
                        id: "msg-2",
                        conversationId: "conversation-1",
                        role: "user",
                        content: "tell me a joke",
                        createdAt: fixedIso()
                    }
                ],
                stableMemories: [],
                retrievedMemories: [],
                webSearch: {
                    status: "off",
                    query: "",
                    results: []
                },
                screenAwareness: active
            });
            expect(irrelevant.preview.screenAwareness).toBeNull();
            expect(irrelevant.promptMessages[0].content).not.toContain("Screen awareness:");
        });
    });
    it("serves the safe screen-awareness endpoints on localhost", async () => {
        await withWorkspace(async (workspaceRoot) => {
            const fixture = buildScreenFixture();
            const state = await initializeScreenAwareness({
                runtimeRoot: path.join(workspaceRoot, ".runtime", "awareness"),
                sessionId: "screen-api",
                source: createFixtureScreenCaptureSource(fixture),
                now: fixedNow
            });
            const engine = {
                getStatus: () => ({}),
                getDigest: () => ({}),
                getScreenStatus: () => state.status,
                get screenAwareness() {
                    return state.snapshot;
                },
                startAssistMode: (options) => state.startAssist(options),
                stopAssistMode: (reason) => state.stopAssist(reason),
                refresh: async () => ({}),
                refreshFiles: async () => state.snapshot,
                markDigestDelivered: async () => null,
                appendEvent: async () => null,
                close: async () => undefined
            };
            const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });
            try {
                const statusResponse = await fetch(`${api.baseUrl}/api/awareness/screen/status`);
                expect(statusResponse.status).toBe(200);
                const status = (await statusResponse.json());
                expect(status.visibleIndicator).toBe(false);
                expect(status.summary.toLowerCase()).toContain("assist off");
                const startResponse = await fetch(`${api.baseUrl}/api/awareness/screen/start-assist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        scope: "current-window",
                        targetLabel: "Settings",
                        captureMode: "on-demand"
                    })
                });
                expect(startResponse.status).toBe(200);
                const started = (await startResponse.json());
                expect(started.visibleIndicator).toBe(true);
                expect(started.foregroundWindowTitle).toBe("Settings - Bluetooth");
                const foregroundResponse = await fetch(`${api.baseUrl}/api/awareness/screen/foreground-window`);
                expect(foregroundResponse.status).toBe(200);
                const foreground = (await foregroundResponse.json());
                expect(foreground.title).toBe("Settings - Bluetooth");
                expect(foreground.processName).toBe("SystemSettings");
                const treeResponse = await fetch(`${api.baseUrl}/api/awareness/screen/ui-tree`);
                expect(treeResponse.status).toBe(200);
                const tree = (await treeResponse.json());
                expect(tree.rootWindowTitle).toBe("Settings - Bluetooth");
                expect(tree.redactedCount).toBe(1);
                const eventsResponse = await fetch(`${api.baseUrl}/api/awareness/screen/last-events`);
                expect(eventsResponse.status).toBe(200);
                const events = (await eventsResponse.json());
                expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["assist_started", "screen_frame_captured"]));
                const stopResponse = await fetch(`${api.baseUrl}/api/awareness/screen/stop-assist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        reason: "user-disabled"
                    })
                });
                expect(stopResponse.status).toBe(200);
                const stopped = (await stopResponse.json());
                expect(stopped.visibleIndicator).toBe(false);
                expect(stopped.summary.toLowerCase()).toContain("assist off");
            }
            finally {
                await api.close();
            }
        });
    });
});
