import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
import { PROMPT_EVAL_STORAGE_KEY, buildPromptEvaluationRequest, buildPromptEvaluationCases, clonePromptEvaluationDraft, defaultPromptEvaluationDraft, getPromptEvaluationSuiteConfig, hydratePromptEvaluationDraft, promptEvaluationPresets, promptEvaluationFields } from "../utils/promptEvaluation";
const loadDraft = () => {
    if (typeof window === "undefined") {
        return defaultPromptEvaluationDraft;
    }
    try {
        const raw = window.localStorage.getItem(PROMPT_EVAL_STORAGE_KEY);
        if (!raw) {
            return defaultPromptEvaluationDraft;
        }
        return hydratePromptEvaluationDraft(JSON.parse(raw));
    }
    catch {
        return defaultPromptEvaluationDraft;
    }
};
export function PromptEvaluationCard(props) {
    const [draft, setDraft] = useState(loadDraft);
    const cases = buildPromptEvaluationCases(draft);
    const suiteConfig = getPromptEvaluationSuiteConfig(draft.suiteMode);
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        window.localStorage.setItem(PROMPT_EVAL_STORAGE_KEY, JSON.stringify(draft));
    }, [draft]);
    const updateField = (field, value) => {
        setDraft((current) => ({
            ...current,
            [field]: value
        }));
    };
    const handleRun = async () => {
        if (cases.length === 0) {
            return;
        }
        await props.onRun(buildPromptEvaluationRequest(draft, props.settings.selectedModel || undefined));
    };
    return (_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Prompt Eval" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Run a repeatable suite and save every reply to Markdown." })] }) }), _jsx("p", { className: "rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[9px] text-slate-400", children: "Choose a preset for the current build. Chat Suite asks grounded product questions from the repo. Windows Suite uses Windows and machine-awareness questions the app already routes more cleanly." }), _jsx("p", { className: "rounded-md border border-cyan-950 bg-cyan-950/30 px-2 py-1.5 text-[9px] text-cyan-100", children: suiteConfig.note }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: promptEvaluationPresets.map((preset) => (_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: props.running, onClick: () => setDraft(clonePromptEvaluationDraft(preset.draft)), children: preset.label }, preset.id))) }), _jsxs("div", { className: "grid gap-2", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Suite name" }), _jsx(Input, { value: draft.suiteName, placeholder: "SynAI grounded product eval", className: "py-1 text-[10px]", onChange: (event) => updateField("suiteName", event.target.value) })] }), promptEvaluationFields.map((field) => (_jsxs("label", { className: "grid gap-1", children: [_jsxs("span", { className: "text-[9px] text-slate-400", children: [field.label, " prompt", " | ", field.description] }), _jsx(Textarea, { rows: 3, value: draft[field.key], className: "min-h-[72px] py-1.5 text-[10px]", onChange: (event) => updateField(field.key, event.target.value) })] }, field.key)))] }), _jsxs("p", { className: "text-[9px] text-slate-400", children: ["Using model ", props.settings.selectedModel || "default", " | suite ", draft.suiteMode, " | mode", " ", suiteConfig.responseMode, " | awareness ", suiteConfig.awarenessAnswerMode, " | web", " ", suiteConfig.useWebSearch ? "on" : "off", " | workspace", " ", suiteConfig.ragOptions.workspaceIndexingEnabled ? "on" : "off"] }), _jsx(Button, { className: "w-full py-1 text-[10px]", variant: "ghost", disabled: props.running || cases.length === 0, onClick: () => void handleRun(), children: props.running ? "Running Prompt Eval..." : `Run ${cases.length}-Prompt Eval` }), props.error ? _jsx("p", { className: "text-[9px] text-rose-300", children: props.error }) : null, props.result ? (_jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300", children: [_jsxs("p", { children: ["Last run: ", props.result.summary.successCount, "/", props.result.summary.total, " prompts succeeded."] }), _jsxs("p", { className: "mt-1", children: ["Quality: ", props.result.summary.qualityPassCount, " passed |", " ", props.result.summary.qualityNeedsReviewCount, " need review."] }), _jsx("p", { className: "mt-1 break-all font-mono text-[8px] text-cyan-200", children: props.result.reportPath })] })) : (_jsxs("p", { className: "text-[9px] text-slate-500", children: ["Reports are written to ", _jsx("span", { className: "font-mono", children: ".runtime/prompt-evals" }), "."] }))] }));
}
