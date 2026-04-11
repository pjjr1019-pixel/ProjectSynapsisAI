import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "../../../shared/components/Button";
import { Textarea } from "../../../shared/components/Textarea";
const DEFAULT_INPUT_SETTINGS = {
    advancedRagEnabled: true,
    defaultWebSearch: false,
    webInRagEnabled: true,
    liveTraceVisible: false
};
const nextToggleMode = (mode) => mode === "inherit" ? "on" : mode === "on" ? "off" : "inherit";
const formatToggle = (label, mode, inheritedEnabled) => {
    if (mode === "inherit") {
        return `${label}: ${inheritedEnabled ? "Default On" : "Default Off"}`;
    }
    return `${label}: ${mode === "on" ? "On" : "Off"}`;
};
export function ChatInputBar({ onSend, disabled, settings = DEFAULT_INPUT_SETTINGS }) {
    const [text, setText] = useState("");
    const [ragMode, setRagMode] = useState("inherit");
    const [webMode, setWebMode] = useState("inherit");
    const [traceMode, setTraceMode] = useState("inherit");
    const submit = async () => {
        const trimmed = text.trim();
        if (!trimmed) {
            return;
        }
        setText("");
        await onSend(trimmed, {
            ragMode,
            webMode,
            traceMode
        });
        setRagMode("inherit");
        setWebMode("inherit");
        setTraceMode("inherit");
    };
    return (_jsxs("div", { className: "border-t border-slate-800 bg-slate-950/85 p-1.5", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsx(Textarea, { value: text, rows: 2, disabled: disabled, placeholder: "Message local model...", onChange: (event) => setText(event.target.value), onKeyDown: async (event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                await submit();
                            }
                        } }), _jsx(Button, { className: "px-3 py-2 text-xs", disabled: disabled || !text.trim(), onClick: () => void submit(), children: "Send" })] }), _jsxs("div", { className: "mt-1 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", disabled: disabled, onClick: () => setRagMode((current) => nextToggleMode(current)), children: formatToggle("RAG", ragMode, settings.advancedRagEnabled) }), _jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", disabled: disabled, onClick: () => setWebMode((current) => nextToggleMode(current)), children: formatToggle("Web", webMode, settings.defaultWebSearch && settings.webInRagEnabled) }), _jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", disabled: disabled, onClick: () => setTraceMode((current) => nextToggleMode(current)), children: formatToggle("Trace", traceMode, settings.liveTraceVisible) })] }), _jsx("p", { className: "text-[10px] text-slate-500", children: "Press Enter to send. Shift+Enter for newline." })] })] }));
}
