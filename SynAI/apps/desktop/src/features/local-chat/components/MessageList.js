import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageItem } from "./MessageItem";
import { Button } from "../../../shared/components/Button";
import { cn } from "../../../shared/utils/cn";
const BOTTOM_THRESHOLD_PX = 80;
const ESTIMATED_MESSAGE_HEIGHT_PX = 120;
/**
 * Pre-compute the timestamp of the preceding user message for each assistant
 * message in a single O(N) pass — avoids the previous O(N²) slice+reverse+find.
 */
const buildPreviousUserAtMap = (messages) => {
    const map = new Map();
    let lastUserAt = null;
    for (const message of messages) {
        if (message.role === "user") {
            lastUserAt = message.createdAt;
        }
        else if (message.role === "assistant") {
            map.set(message.id, lastUserAt);
        }
    }
    return map;
};
export function MessageList({ messages, loading, pendingAssistantId, pendingReasoningTrace, className }) {
    const containerRef = useRef(null);
    const [autoFollow, setAutoFollow] = useState(true);
    const isJsdom = typeof window !== "undefined" &&
        typeof window.navigator !== "undefined" &&
        /jsdom/i.test(window.navigator.userAgent);
    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => ESTIMATED_MESSAGE_HEIGHT_PX,
        overscan: 4
    });
    // O(N) once per messages change — not per render of each visible row
    const previousUserAtMap = useMemo(() => buildPreviousUserAtMap(messages), [messages]);
    const scrollToBottom = useCallback((behavior = "smooth") => {
        const container = containerRef.current;
        if (messages.length === 0) {
            return;
        }
        if (isJsdom && container) {
            container.scrollTop = container.scrollHeight;
            return;
        }
        virtualizer.scrollToIndex(messages.length - 1, { behavior });
    }, [isJsdom, messages.length, virtualizer]);
    useEffect(() => {
        if (autoFollow) {
            scrollToBottom(messages.length > 1 || loading ? "smooth" : "auto");
        }
    }, [autoFollow, loading, messages.length, scrollToBottom]);
    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setAutoFollow(distanceFromBottom <= BOTTOM_THRESHOLD_PX);
    };
    if (messages.length === 0) {
        return (_jsx("div", { className: cn("flex h-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400", className), children: "No messages yet. Start the conversation." }));
    }
    const virtualItems = virtualizer.getVirtualItems();
    const renderAllMessages = isJsdom && virtualItems.length === 0;
    return (_jsxs("div", { className: cn("relative min-h-0 h-full", className), children: [_jsxs("div", { ref: containerRef, role: "log", "aria-label": "Conversation feed", "aria-live": "polite", "aria-relevant": "additions text", className: "h-full overflow-y-auto pr-1", onScroll: handleScroll, children: [renderAllMessages ? (_jsx("div", { className: "space-y-2", children: messages.map((message) => {
                            const previousUserAt = message.role === "assistant"
                                ? (previousUserAtMap.get(message.id) ?? null)
                                : null;
                            return (_jsx("div", { className: "pb-2", children: _jsx(MessageItem, { message: message, previousUserAt: previousUserAt, liveTrace: message.id === pendingAssistantId ? pendingReasoningTrace : null }) }, message.id));
                        }) })) : (_jsx("div", { style: { height: `${virtualizer.getTotalSize()}px`, position: "relative" }, children: virtualItems.map((virtualRow) => {
                            const message = messages[virtualRow.index];
                            const previousUserAt = message.role === "assistant"
                                ? (previousUserAtMap.get(message.id) ?? null)
                                : null;
                            return (_jsx("div", { "data-index": virtualRow.index, ref: virtualizer.measureElement, style: {
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: "8px"
                                }, children: _jsx(MessageItem, { message: message, previousUserAt: previousUserAt, liveTrace: message.id === pendingAssistantId ? pendingReasoningTrace : null }) }, virtualRow.key));
                        }) })), loading && pendingReasoningTrace === null ? (_jsx("div", { className: "px-1 py-1 text-[11px] text-cyan-300", children: "Model is thinking..." })) : null] }), !autoFollow ? (_jsx(Button, { className: "absolute bottom-2 right-2 px-2 py-1 text-[10px] shadow-lg shadow-slate-950/60", variant: "ghost", onClick: () => {
                    setAutoFollow(true);
                    scrollToBottom();
                }, children: "Jump to latest" })) : null] }));
}
