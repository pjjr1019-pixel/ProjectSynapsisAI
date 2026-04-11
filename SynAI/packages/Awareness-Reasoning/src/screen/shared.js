import { createFreshnessMetadata } from "../context";
export const SCREEN_FRESHNESS_WINDOW_MS = 5 * 60 * 1000;
const SCREEN_CONTEXT_KEYWORDS = [
    "screen",
    "window",
    "foreground",
    "app",
    "application",
    "button",
    "menu",
    "tab",
    "click",
    "hover",
    "cursor",
    "focused",
    "what am i looking at",
    "what is this window",
    "where should i click",
    "where is the button",
    "active tab",
    "what changed on screen"
];
const interactiveControlTokens = [
    "button",
    "menu item",
    "tab item",
    "tab",
    "checkbox",
    "radio button",
    "toggle",
    "switch",
    "link",
    "hyperlink",
    "combo box",
    "list item",
    "tree item",
    "item"
];
const sensitiveTokens = [
    "password",
    "passcode",
    "pin",
    "secret",
    "token",
    "credential",
    "login",
    "sign in",
    "auth",
    "verification code",
    "one-time passcode",
    "otp"
];
export const cloneSnapshot = (value) => JSON.parse(JSON.stringify(value));
export const buildFreshness = (capturedAt, now = new Date()) => createFreshnessMetadata(capturedAt, capturedAt, now);
export const normalizeText = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const compactJoin = (values, limit = 6) => values
    .filter((value) => Boolean(value))
    .slice(0, limit)
    .join(", ");
export const describeScope = (scope) => {
    switch (scope) {
        case "current-window":
            return "current window";
        case "selected-app":
            return "selected app";
        case "chosen-display":
            return "chosen display";
        default:
            return "none";
    }
};
export const describeCaptureMode = (captureMode) => captureMode === "session" ? "session sampling" : "on-demand";
export const describeBounds = (bounds) => bounds ? `${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}` : null;
export const queryIncludes = (query, keywords) => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
        return false;
    }
    return keywords.some((keyword) => normalizedQuery.includes(normalizeText(keyword)));
};
export const isScreenRelevant = (query, awarenessMode, assistEnabled) => awarenessMode === "debug" ||
    (assistEnabled &&
        queryIncludes(query, SCREEN_CONTEXT_KEYWORDS)) ||
    (assistEnabled && normalizedQueryHasWindowIntent(query));
const normalizedQueryHasWindowIntent = (query) => queryIncludes(query, [
    "what window",
    "what app",
    "what am i looking at",
    "active window",
    "current window",
    "foreground window",
    "what tab",
    "which button",
    "where next",
    "where should i click"
]);
export const isInteractiveControl = (controlType) => {
    if (!controlType) {
        return false;
    }
    const normalized = normalizeText(controlType);
    return interactiveControlTokens.some((token) => normalized.includes(token));
};
export const isSensitiveScreenValue = (value) => {
    if (!value) {
        return false;
    }
    const normalized = normalizeText(value);
    return sensitiveTokens.some((token) => normalized.includes(normalizeText(token)));
};
export const isProtectedScreenElement = (element) => element.isPassword ||
    isSensitiveScreenValue(element.name) ||
    isSensitiveScreenValue(element.value) ||
    isSensitiveScreenValue(element.controlType) ||
    isSensitiveScreenValue(element.localizedControlType);
export const formatWindowSummary = (window) => {
    if (!window) {
        return null;
    }
    const parts = [
        window.title ?? window.processName ?? "window",
        window.processName ? `(${window.processName})` : null,
        describeBounds(window.bounds)
    ].filter(Boolean);
    return parts.join(" | ");
};
const pushUnique = (values, candidate) => {
    if (!values.includes(candidate)) {
        values.push(candidate);
    }
};
export const collectUiHighlights = (node, options) => {
    const limit = options?.limit ?? 6;
    const highlights = [];
    const walk = (current) => {
        if (!current || highlights.length >= limit) {
            return;
        }
        if (current.name) {
            const controlType = current.localizedControlType ?? current.controlType;
            const summary = controlType
                ? `${current.name}${isInteractiveControl(controlType) ? ` (${controlType})` : ""}`
                : current.name;
            if (options?.includeContainers || isInteractiveControl(controlType) || current.focused || current.selected) {
                pushUnique(highlights, summary);
            }
        }
        for (const child of current.children) {
            walk(child);
            if (highlights.length >= limit) {
                return;
            }
        }
    };
    walk(node);
    return highlights;
};
export const countUiNodes = (node) => {
    if (!node) {
        return 0;
    }
    return 1 + node.children.reduce((total, child) => total + countUiNodes(child), 0);
};
export const countInteractiveUiNodes = (node) => {
    if (!node) {
        return 0;
    }
    const selfCount = isInteractiveControl(node.localizedControlType ?? node.controlType) ? 1 : 0;
    return selfCount + node.children.reduce((total, child) => total + countInteractiveUiNodes(child), 0);
};
export const findFocusedUiElement = (node) => {
    if (!node) {
        return null;
    }
    if (node.focused) {
        return node;
    }
    for (const child of node.children) {
        const focused = findFocusedUiElement(child);
        if (focused) {
            return focused;
        }
    }
    return null;
};
export const findFirstInteractiveElement = (node) => {
    if (!node) {
        return null;
    }
    if (isInteractiveControl(node.localizedControlType ?? node.controlType)) {
        return node;
    }
    for (const child of node.children) {
        const interactive = findFirstInteractiveElement(child);
        if (interactive) {
            return interactive;
        }
    }
    return null;
};
export const summarizeEvent = (event) => `${event.type}${event.message ? `: ${event.message}` : ""}`;
export const summarizeRecentEvents = (events, limit = 5) => [...events]
    .slice(-limit)
    .map((event) => summarizeEvent(event));
export const buildCounts = (snapshot) => ({
    windows: snapshot.foregroundWindow ? 1 : 0,
    uiElements: countUiNodes(snapshot.uiTree?.root),
    events: snapshot.recentEvents.length,
    protectedInputs: snapshot.recentEvents.filter((event) => event.type === "protected_input_blocked").length,
    hoverTargets: snapshot.recentEvents.filter((event) => event.type === "hover_target_changed").length,
    clickTargets: snapshot.recentEvents.filter((event) => event.type === "click_observed").length
});
export const buildHighlights = (snapshot) => {
    const recentEvents = snapshot.recentEvents.slice(-5);
    const hovered = recentEvents
        .filter((event) => event.type === "hover_target_changed")
        .map((event) => event.message ?? event.details?.["targetLabel"]?.toString() ?? null)
        .filter((value) => Boolean(value));
    const clicks = recentEvents
        .filter((event) => event.type === "click_observed")
        .map((event) => event.message ?? event.details?.["targetLabel"]?.toString() ?? null)
        .filter((value) => Boolean(value));
    const blocked = recentEvents
        .filter((event) => event.type === "protected_input_blocked")
        .map((event) => event.message ?? event.details?.["targetLabel"]?.toString() ?? null)
        .filter((value) => Boolean(value));
    return {
        activeWindow: formatWindowSummary(snapshot.foregroundWindow)
            ? [formatWindowSummary(snapshot.foregroundWindow)]
            : [],
        controls: collectUiHighlights(snapshot.uiTree?.root, { limit: 6 }),
        hoverTargets: hovered.slice(0, 6),
        clickTargets: clicks.slice(0, 6),
        blockedInputs: blocked.slice(0, 6)
    };
};
export const buildScreenSummaryText = (input) => {
    const scopeLabel = describeScope(input.assistMode.scope);
    const targetLabel = input.assistMode.targetLabel ? `target ${input.assistMode.targetLabel}` : "unscoped";
    const windowLabel = formatWindowSummary(input.foregroundWindow) ?? "no foreground window";
    const uiCount = countUiNodes(input.uiTree?.root);
    const blockedCount = input.recentEvents.filter((event) => event.type === "protected_input_blocked").length;
    const modeLabel = input.assistMode.enabled ? "assist on" : "assist off";
    return [modeLabel, scopeLabel, targetLabel, windowLabel, `${uiCount} ui nodes`, `${blockedCount} blocked`].join(" | ");
};
export const buildScreenDiffSummary = (input) => {
    const previous = input.previous;
    if (!previous) {
        return null;
    }
    const previousWindow = formatWindowSummary(previous.foregroundWindow);
    const currentWindow = formatWindowSummary(input.current.foregroundWindow);
    const previousFocused = findFocusedUiElement(previous.uiTree?.root);
    const currentFocused = findFocusedUiElement(input.current.uiTree?.root);
    const previousHover = previous.uiTree?.elementUnderCursor ?? null;
    const currentHover = input.current.uiTree?.elementUnderCursor ?? null;
    const previousHighlights = collectUiHighlights(previous.uiTree?.root, { limit: 8, includeContainers: true });
    const currentHighlights = collectUiHighlights(input.current.uiTree?.root, { limit: 8, includeContainers: true });
    const previousSet = new Set(previousHighlights);
    const currentSet = new Set(currentHighlights);
    const addedHighlights = currentHighlights.filter((entry) => !previousSet.has(entry)).slice(0, 4);
    const removedHighlights = previousHighlights.filter((entry) => !currentSet.has(entry)).slice(0, 4);
    const controlCountDelta = countUiNodes(input.current.uiTree?.root) - countUiNodes(previous.uiTree?.root);
    const activeWindowChanged = previousWindow !== currentWindow;
    const focusedElementChanged = (previousFocused?.name ?? previousFocused?.controlType ?? null) !==
        (currentFocused?.name ?? currentFocused?.controlType ?? null);
    const hoveredElementChanged = (previousHover?.name ?? previousHover?.controlType ?? null) !==
        (currentHover?.name ?? currentHover?.controlType ?? null);
    const changed = activeWindowChanged ||
        focusedElementChanged ||
        hoveredElementChanged ||
        controlCountDelta !== 0 ||
        addedHighlights.length > 0 ||
        removedHighlights.length > 0;
    return {
        capturedAt: input.current.capturedAt,
        changed,
        summary: changed
            ? [
                activeWindowChanged ? `window changed to ${currentWindow ?? "unknown window"}` : null,
                focusedElementChanged ? `focus moved to ${currentFocused?.name ?? currentFocused?.controlType ?? "a new control"}` : null,
                hoveredElementChanged ? `hover moved to ${currentHover?.name ?? currentHover?.controlType ?? "a new control"}` : null,
                controlCountDelta !== 0 ? `control count delta ${controlCountDelta > 0 ? "+" : ""}${controlCountDelta}` : null
            ]
                .filter((value) => Boolean(value))
                .join(" | ")
            : "No meaningful on-screen diff detected.",
        activeWindowChanged,
        focusedElementChanged,
        hoveredElementChanged,
        controlCountDelta,
        addedHighlights,
        removedHighlights
    };
};
