import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
const emptyToken = "";
const formatStepStatusTone = (status) => {
    if (status === "executed") {
        return "good";
    }
    if (status === "denied") {
        return "bad";
    }
    if (status === "blocked" || status === "failed") {
        return "warn";
    }
    return "neutral";
};
const parseApprovalTokenJson = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { token: null, error: null };
    }
    try {
        return { token: JSON.parse(trimmed), error: null };
    }
    catch {
        return { token: null, error: "Approval token JSON is invalid." };
    }
};
const formatArtifactLabel = (pathValue) => pathValue.split(/[/\\]/).pop() ?? pathValue;
export function WorkflowOrchestrationCard() {
    const [prompt, setPrompt] = useState("");
    const [approvedBy, setApprovedBy] = useState("qa-operator");
    const [approvalTokenJson, setApprovalTokenJson] = useState(emptyToken);
    const [dryRun, setDryRun] = useState(true);
    const [busy, setBusy] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [plan, setPlan] = useState(null);
    const [progress, setProgress] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    useEffect(() => {
        const unsubscribe = window.synai.subscribeWorkflowProgress((event) => {
            setProgress(event);
            setPlan(event.plan);
        });
        return unsubscribe;
    }, []);
    const parsedApprovalToken = useMemo(() => parseApprovalTokenJson(approvalTokenJson), [approvalTokenJson]);
    const suggestionSummary = plan?.clarificationNeeded.length
        ? plan.clarificationNeeded.join(" ")
        : plan?.summary ?? "No workflow has been suggested yet.";
    const suggestPlan = async () => {
        if (!prompt.trim()) {
            setStatusMessage("Enter a goal first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const nextPlan = await window.synai.suggestWorkflow(prompt.trim());
            if (!nextPlan) {
                setStatusMessage("No workflow plan could be built for that request.");
                return;
            }
            setPlan(nextPlan);
            setApprovalTokenJson(emptyToken);
            setStatusMessage(nextPlan.clarificationNeeded.length > 0 ? nextPlan.clarificationNeeded.join(" ") : `Suggested ${nextPlan.family}.`);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to suggest a workflow.");
        }
        finally {
            setBusy(false);
        }
    };
    const issueApproval = async () => {
        if (!plan) {
            setStatusMessage("Suggest a workflow first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const token = await window.synai.issueWorkflowApproval(plan, approvedBy.trim() || "qa-operator");
            setApprovalTokenJson(`${JSON.stringify(token, null, 2)}`);
            setStatusMessage(`Approval token issued for ${plan.family}.`);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to issue workflow approval.");
        }
        finally {
            setBusy(false);
        }
    };
    const executePlan = async () => {
        if (!plan && !prompt.trim()) {
            setStatusMessage("Enter a goal first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const result = await window.synai.executeWorkflow({
                prompt: prompt.trim(),
                plan,
                dryRun,
                approvedBy: approvedBy.trim() || null,
                approvalToken: parsedApprovalToken.token
            });
            setLastResult(result);
            setPlan(result.plan);
            setStatusMessage(result.status === "executed"
                ? "Workflow executed."
                : result.status === "simulated"
                    ? "Workflow simulated."
                    : result.status === "denied"
                        ? "Workflow denied."
                        : result.summary);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to execute workflow.");
        }
        finally {
            setBusy(false);
        }
    };
    const activeStep = progress?.currentStepId ?? plan?.steps[0]?.id ?? null;
    return (_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Workflow Orchestration" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Plan and execute multi-step Windows tasks with governed approvals." })] }), _jsx(Badge, { tone: dryRun ? "neutral" : "good", children: dryRun ? "Preview" : "Live" })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Goal or prompt" }), _jsx(Textarea, { rows: 3, value: prompt, onChange: (event) => setPrompt(event.target.value), className: "min-h-[72px] py-1.5 text-[10px]", placeholder: 'Research the current state of AI and save a report in Documents' })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !prompt.trim(), onClick: () => void suggestPlan(), children: "Suggest Plan" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy, onClick: () => setDryRun((current) => !current), children: dryRun ? "Switch to Live" : "Switch to Preview" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Approver" }), _jsx(Input, { value: approvedBy, className: "py-1 text-[10px]", onChange: (event) => setApprovedBy(event.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Token JSON" }), _jsx(Input, { value: approvalTokenJson, className: "py-1 text-[10px]", onChange: (event) => setApprovalTokenJson(event.target.value) })] })] }), parsedApprovalToken.error ? _jsx("p", { className: "text-[9px] text-rose-300", children: parsedApprovalToken.error }) : null, _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !plan, onClick: () => void issueApproval(), children: "Issue Approval" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !plan, onClick: () => void executePlan(), children: "Execute Plan" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy, onClick: () => setApprovalTokenJson(emptyToken), children: "Clear Token" })] }), _jsxs("div", { className: "space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Plan Preview" }), _jsx("p", { className: "text-slate-400", children: suggestionSummary })] }), _jsx(Badge, { tone: plan?.approvalRequired ? "warn" : "good", children: plan?.family ?? "idle" })] }), plan ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "font-mono text-[8px] text-cyan-200", children: plan.workflowHash.slice(0, 16) }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [plan.clarificationNeeded.length > 0 ? _jsx(Badge, { tone: "warn", children: "Clarification needed" }) : null, _jsx(Badge, { tone: plan.approvalRequired ? "warn" : "good", children: plan.approvalRequired ? "Approval required" : "No approval required" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-slate-400", children: "Steps" }), plan.steps.map((step) => (_jsxs("div", { className: `rounded-md border px-2 py-1 ${activeStep === step.id ? "border-cyan-400/50 bg-cyan-500/10" : "border-slate-800 bg-slate-950/50"}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-medium text-slate-100", children: step.title }), _jsx(Badge, { tone: formatStepStatusTone(progress?.stepResults.find((item) => item.id === step.id)?.status ?? "neutral"), children: progress?.stepResults.find((item) => item.id === step.id)?.status ?? step.kind })] }), _jsx("p", { className: "text-slate-400", children: step.summary })] }, step.id)))] })] })) : (_jsx("p", { className: "text-slate-400", children: "No workflow plan yet." }))] }), progress ? (_jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Progress" }), _jsx(Badge, { tone: formatStepStatusTone(progress.status), children: progress.status })] }), _jsx("p", { className: "mt-1 text-slate-400", children: progress.summary }), progress.artifactPaths.length > 0 ? (_jsxs("div", { className: "mt-1", children: [_jsx("p", { className: "text-slate-400", children: "Artifacts" }), progress.artifactPaths.map((artifactPath) => (_jsx("p", { className: "font-mono text-[8px] text-cyan-200", children: formatArtifactLabel(artifactPath) }, artifactPath)))] })) : null] })) : null, lastResult ? (_jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Last Result" }), _jsx(Badge, { tone: formatStepStatusTone(lastResult.status), children: lastResult.status })] }), _jsx("p", { className: "mt-1 text-slate-400", children: lastResult.summary }), lastResult.verification ? (_jsxs("p", { className: lastResult.verification.passed ? "mt-1 text-emerald-300" : "mt-1 text-amber-200", children: ["Verification: ", lastResult.verification.summary] })) : null, lastResult.reportSummary ? (_jsxs("div", { className: "mt-1 rounded border border-cyan-500/20 bg-cyan-500/5 p-1.5", children: [_jsx("p", { className: "text-slate-400", children: "Report summary" }), _jsx("p", { className: "mt-0.5 text-slate-200", children: lastResult.reportSummary })] })) : null, lastResult.reportMarkdown ? (_jsxs("details", { className: "mt-1 rounded border border-slate-800 bg-slate-950/50 p-1.5", children: [_jsx("summary", { className: "cursor-pointer text-slate-300", children: "Report preview" }), _jsx("pre", { className: "mt-1 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[8px] leading-snug text-slate-200", children: lastResult.reportMarkdown })] })) : null, lastResult.artifactPaths.length > 0 ? (_jsxs("div", { className: "mt-1", children: [_jsx("p", { className: "text-slate-400", children: "Saved files" }), lastResult.artifactPaths.map((artifactPath) => (_jsx("p", { className: "font-mono text-[8px] text-cyan-200", children: artifactPath }, artifactPath)))] })) : null, lastResult.compensation?.length ? (_jsxs("div", { className: "mt-1", children: [_jsx("p", { className: "text-slate-400", children: "Compensation" }), lastResult.compensation.map((entry, index) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsx("p", { className: "text-[8px] text-slate-300", children: entry.summary }), _jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: [entry.kind, " | ", entry.status] })] }, `${entry.id}-${index}`)))] })) : null, lastResult.rollback?.length ? (_jsxs("div", { className: "mt-1", children: [_jsx("p", { className: "text-slate-400", children: "Rollback" }), lastResult.rollback.map((rollback, index) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsx("p", { className: "text-[8px] text-slate-300", children: rollback.summary }), _jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: [rollback.kind, " | ", rollback.target] })] }, `${rollback.kind}-${rollback.target}-${index}`)))] })) : null] })) : null, statusMessage ? _jsx("p", { className: "text-[9px] text-emerald-300", children: statusMessage }) : null] }));
}
