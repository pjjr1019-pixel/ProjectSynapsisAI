import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
export function ChatControls(props) {
    const feedbackClassName = props.healthCheckState === "success"
        ? "text-emerald-300"
        : props.healthCheckState === "failure"
            ? "text-rose-300"
            : "text-amber-300";
    return (_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Chat Controls" }), _jsx(Button, { className: "w-full py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onRunHealthCheck(), children: props.healthCheckState === "running" ? "Running Health Check..." : "Run Health Check" }), _jsx("p", { "aria-live": "polite", className: `text-[9px] ${props.healthCheckMessage ? feedbackClassName : "text-slate-500"}`, children: props.healthCheckMessage ?? "Health check updates appear here." }), _jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onNewConversation(), children: "New Conversation" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onClearChat(), children: "Clear Chat" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onRegenerate(), children: "Regenerate Reply" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onRefreshMemory(), children: "Refresh Memory" }), _jsx(Button, { className: "col-span-2 py-1 text-[10px]", variant: "ghost", disabled: props.loading, onClick: () => void props.onCopyResponse(), children: "Copy Response" })] })] }));
}
