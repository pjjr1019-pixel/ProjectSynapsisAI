import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { buildWindowsActionPreview, listWindowsActionDefinitions, suggestWindowsActionFromPrompt } from "@governance-execution/execution/windows-action-catalog";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
const catalog = listWindowsActionDefinitions();
const formatActionLabel = (action) => `${action.title} | ${action.riskClass}${action.approvalRequired ? " | approval" : ""}`;
const parseArgs = (value) => value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
const parsePathList = (value) => value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
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
const emptyToken = "";
export function DesktopActionsCard() {
    const [selectedActionId, setSelectedActionId] = useState(catalog[0]?.id ?? "");
    const selectedAction = useMemo(() => catalog.find((action) => action.id === selectedActionId) ?? catalog[0] ?? null, [selectedActionId]);
    const [goalPrompt, setGoalPrompt] = useState("");
    const [target, setTarget] = useState(selectedAction?.defaultTarget ?? "");
    const [destinationTarget, setDestinationTarget] = useState("");
    const [argsText, setArgsText] = useState("");
    const [contentText, setContentText] = useState("");
    const [allowedRootsText, setAllowedRootsText] = useState("");
    const [approvedBy, setApprovedBy] = useState("qa-operator");
    const [approvalTokenJson, setApprovalTokenJson] = useState(emptyToken);
    const [dryRun, setDryRun] = useState(true);
    const [forceTermination, setForceTermination] = useState(false);
    const [busy, setBusy] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [rollbackResult, setRollbackResult] = useState(null);
    useEffect(() => {
        if (!selectedAction) {
            return;
        }
        setTarget((current) => current || selectedAction.defaultTarget || "");
        setDestinationTarget("");
        setArgsText("");
        setContentText("");
        setAllowedRootsText("");
        setApprovalTokenJson(emptyToken);
        setStatusMessage(null);
    }, [selectedActionId, selectedAction]);
    const preview = useMemo(() => {
        if (!selectedAction) {
            return "";
        }
        return buildWindowsActionPreview(selectedAction, {
            target: target.trim() || selectedAction.defaultTarget || selectedAction.targetPlaceholder,
            destinationTarget: destinationTarget.trim() || null,
            args: parseArgs(argsText)
        });
    }, [argsText, destinationTarget, selectedAction, target]);
    const parsedApprovalToken = useMemo(() => parseApprovalTokenJson(approvalTokenJson), [approvalTokenJson]);
    const request = useMemo(() => {
        if (!selectedAction) {
            return null;
        }
        const normalizedTarget = target.trim() || selectedAction.defaultTarget || "";
        if (!normalizedTarget) {
            return null;
        }
        return {
            proposalId: selectedAction.id,
            kind: selectedAction.kind,
            scope: selectedAction.scope,
            targetKind: selectedAction.targetKind,
            target: normalizedTarget,
            destinationTarget: destinationTarget.trim() || null,
            args: parseArgs(argsText),
            workingDirectory: null,
            allowedRoots: parsePathList(allowedRootsText).length > 0 ? parsePathList(allowedRootsText) : null,
            riskClass: selectedAction.riskClass,
            destructive: selectedAction.riskClass === "high" || selectedAction.riskClass === "critical",
            dryRun,
            approvedBy: approvedBy.trim() || null,
            approvalToken: parsedApprovalToken.token,
            metadata: {
                content: contentText,
                force: forceTermination
            }
        };
    }, [
        approvedBy,
        argsText,
        contentText,
        destinationTarget,
        dryRun,
        forceTermination,
        allowedRootsText,
        parsedApprovalToken.token,
        selectedAction,
        target
    ]);
    const suggestFromPrompt = () => {
        const suggestion = suggestWindowsActionFromPrompt(goalPrompt);
        if (!suggestion) {
            setStatusMessage("No action match found for that prompt.");
            return;
        }
        setSelectedActionId(suggestion.id);
        setTarget(suggestion.defaultTarget ?? "");
        setStatusMessage(`Suggested ${suggestion.title}.`);
    };
    const issueApproval = async () => {
        if (!request) {
            setStatusMessage("Fill in the action target first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const token = await window.synai.issueDesktopActionApproval(request, approvedBy.trim() || "qa-operator");
            setApprovalTokenJson(`${JSON.stringify(token, null, 2)}`);
            setStatusMessage(`Approval token issued for ${request.proposalId}.`);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to issue approval token.");
        }
        finally {
            setBusy(false);
        }
    };
    const executeAction = async () => {
        if (!request) {
            setStatusMessage("Fill in the action target first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const result = await window.synai.executeDesktopAction(request);
            setLastResult(result);
            setRollbackResult(null);
            setStatusMessage(result.status === "executed"
                ? "Action executed."
                : result.status === "simulated"
                    ? "Action simulated."
                    : result.summary);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to execute action.");
        }
        finally {
            setBusy(false);
        }
    };
    const rollbackLastAction = async () => {
        if (!lastResult?.commandId) {
            setStatusMessage("Run a live action first so I have something to roll back.");
            return;
        }
        if (!lastResult.rollback?.possible) {
            setStatusMessage(lastResult.rollback?.summary ?? "That action does not expose a rollback path.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const result = await window.synai.rollbackDesktopAction(lastResult.commandId, approvedBy.trim() || "qa-operator", dryRun);
            setRollbackResult(result);
            setStatusMessage(result.status === "executed"
                ? "Rollback executed."
                : result.status === "simulated"
                    ? "Rollback simulated."
                    : result.summary);
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to roll back the last action.");
        }
        finally {
            setBusy(false);
        }
    };
    const showDestination = selectedAction?.kind === "rename-item" || selectedAction?.kind === "move-item";
    const showArgs = selectedAction?.kind === "launch-program";
    const showContent = selectedAction?.kind === "create-file";
    const showForceToggle = selectedAction?.kind === "terminate-process";
    return (_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Desktop Actions" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Governed launch, open, file, and process actions." })] }), _jsx(Badge, { tone: dryRun ? "neutral" : "good", children: dryRun ? "Preview" : "Live" })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Goal or prompt" }), _jsx(Textarea, { rows: 2, value: goalPrompt, onChange: (event) => setGoalPrompt(event.target.value), className: "min-h-[56px] py-1.5 text-[10px]", placeholder: "Open Add or Remove Programs, launch Notepad, create a file..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !goalPrompt.trim(), onClick: () => void suggestFromPrompt(), children: "Suggest Action" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy, onClick: () => setDryRun((current) => !current), children: dryRun ? "Switch to Live" : "Switch to Preview" })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Action" }), _jsx("select", { className: "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100", value: selectedAction?.id ?? "", onChange: (event) => setSelectedActionId(event.target.value), children: catalog.map((action) => (_jsx("option", { value: action.id, children: formatActionLabel(action) }, action.id))) })] }), _jsxs("div", { className: "grid gap-2 text-[9px] text-slate-300", children: [selectedAction ? (_jsxs("div", { className: "rounded-md border border-slate-800 bg-slate-900/70 p-2", children: [_jsx("p", { className: "font-semibold text-slate-100", children: selectedAction.title }), _jsx("p", { className: "mt-1 text-slate-400", children: selectedAction.description }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-1", children: [_jsx(Badge, { tone: "neutral", children: selectedAction.scope }), _jsx(Badge, { tone: "neutral", children: selectedAction.targetKind }), _jsx(Badge, { tone: selectedAction.approvalRequired ? "warn" : "good", children: selectedAction.approvalRequired ? "Approval required" : "Low risk" })] }), _jsx("p", { className: "mt-2 font-mono text-[8px] text-cyan-200", children: preview }), selectedAction.preconditions.length > 0 ? (_jsxs("p", { className: "mt-2 text-slate-400", children: ["Preconditions: ", selectedAction.preconditions.join(" | ")] })) : null] })) : null, _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Target" }), _jsx(Input, { value: target, placeholder: selectedAction?.targetPlaceholder ?? "Target", className: "py-1 text-[10px]", onChange: (event) => setTarget(event.target.value) })] }), showDestination ? (_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Destination" }), _jsx(Input, { value: destinationTarget, placeholder: "New path or name", className: "py-1 text-[10px]", onChange: (event) => setDestinationTarget(event.target.value) })] })) : null, showArgs ? (_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Program args" }), _jsx(Textarea, { rows: 2, value: argsText, className: "min-h-[56px] py-1.5 text-[10px]", placeholder: "One arg per line or comma-separated", onChange: (event) => setArgsText(event.target.value) })] })) : null, showContent ? (_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "File content" }), _jsx(Textarea, { rows: 3, value: contentText, className: "min-h-[72px] py-1.5 text-[10px]", placeholder: "Optional content for the new file", onChange: (event) => setContentText(event.target.value) })] })) : null, _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Approved by" }), _jsx(Input, { value: approvedBy, placeholder: "qa-operator", className: "py-1 text-[10px]", onChange: (event) => setApprovedBy(event.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Allowed roots" }), _jsx(Textarea, { rows: 2, value: allowedRootsText, className: "min-h-[48px] py-1.5 text-[10px]", placeholder: "C:\\\\Users\\\\you\\\\Documents, C:\\\\Users\\\\you\\\\Desktop", onChange: (event) => setAllowedRootsText(event.target.value) })] }), showForceToggle ? (_jsxs("label", { className: "flex items-center gap-2 text-[9px] text-slate-400", children: [_jsx("input", { type: "checkbox", checked: forceTermination, onChange: (event) => setForceTermination(event.target.checked) }), "Force termination"] })) : null, _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Approval token" }), _jsx(Textarea, { rows: 4, value: approvalTokenJson, className: "min-h-[84px] py-1.5 font-mono text-[9px]", placeholder: "Issue a token for live execution", onChange: (event) => setApprovalTokenJson(event.target.value) }), parsedApprovalToken.error ? _jsx("span", { className: "text-[9px] text-rose-300", children: parsedApprovalToken.error }) : null] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !request, onClick: () => void issueApproval(), children: "Issue Approval" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !request, onClick: () => void executeAction(), children: dryRun ? "Run Preview" : "Run Live" })] }), statusMessage ? _jsx("p", { className: "text-[9px] text-cyan-200", children: statusMessage }) : null, lastResult ? (_jsxs("div", { className: "space-y-1 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Last result" }), _jsx(Badge, { tone: lastResult.status === "executed"
                                    ? "good"
                                    : lastResult.status === "simulated"
                                        ? "neutral"
                                        : lastResult.status === "denied"
                                            ? "bad"
                                            : "warn", children: lastResult.status })] }), _jsx("p", { children: lastResult.summary }), _jsxs("p", { className: "font-mono text-[8px] text-cyan-200", children: ["Preview: ", lastResult.preview] }), lastResult.commandId ? _jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: ["Command: ", lastResult.commandId] }) : null, lastResult.commandHash ? _jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: ["Hash: ", lastResult.commandHash] }) : null, lastResult.verification ? (_jsxs("p", { className: lastResult.verification.passed ? "text-emerald-300" : "text-amber-200", children: ["Verification: ", lastResult.verification.summary] })) : null, lastResult.rollback ? (_jsxs("p", { className: "text-[8px] text-slate-400", children: ["Rollback: ", lastResult.rollback.summary] })) : null, _jsx("div", { className: "flex gap-2 pt-1", children: _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !lastResult?.commandId || !lastResult.rollback?.possible, onClick: () => void rollbackLastAction(), children: "Rollback Last" }) })] })) : null, rollbackResult ? (_jsxs("div", { className: "space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Rollback Result" }), _jsx(Badge, { tone: rollbackResult.status === "executed" ? "good" : rollbackResult.status === "simulated" ? "neutral" : "warn", children: rollbackResult.status })] }), _jsx("p", { children: rollbackResult.summary }), _jsxs("p", { className: "font-mono text-[8px] text-cyan-200", children: ["Preview: ", rollbackResult.preview] }), rollbackResult.commandId ? _jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: ["Command: ", rollbackResult.commandId] }) : null, rollbackResult.verification ? (_jsxs("p", { className: rollbackResult.verification.passed ? "text-emerald-300" : "text-amber-200", children: ["Verification: ", rollbackResult.verification.summary] })) : null, rollbackResult.rollback ? (_jsxs("p", { className: "text-[8px] text-slate-400", children: ["Rollback: ", rollbackResult.rollback.summary] })) : null] })) : null] }));
}
