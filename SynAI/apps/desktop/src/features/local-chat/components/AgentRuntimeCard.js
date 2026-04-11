import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
import { formatDateTime } from "../../../shared/utils/time";
const emptyMetadata = "";
const parseMetadataJson = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { metadata: null, error: null };
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { metadata: null, error: "Metadata JSON must be an object." };
        }
        return { metadata: parsed, error: null };
    }
    catch {
        return { metadata: null, error: "Metadata JSON is invalid." };
    }
};
const runtimeStatusTone = (status) => {
    if (status === "completed" || status === "executed" || status === "success") {
        return "good";
    }
    if (status === "running" || status === "queued" || status === "simulated") {
        return "neutral";
    }
    if (status === "blocked" || status === "escalated" || status === "cancelled") {
        return "warn";
    }
    return "bad";
};
const verificationTone = (report) => {
    if (!report) {
        return "neutral";
    }
    return report.status === "passed" ? "good" : report.status === "skipped" ? "neutral" : "warn";
};
const policyTone = (decision) => {
    if (!decision) {
        return "neutral";
    }
    if (decision.type === "allow") {
        return "good";
    }
    if (decision.type === "escalate") {
        return "warn";
    }
    return "bad";
};
const uniqueStepList = (description, title) => {
    const entries = description
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    return entries.length > 0 ? entries : [title];
};
const buildRuntimeTask = (title, description, metadata) => {
    const now = new Date().toISOString();
    const trimmedTitle = title.trim() || "Untitled runtime task";
    const trimmedDescription = description.trim();
    return {
        id: `runtime-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
        status: "pending",
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        steps: uniqueStepList(trimmedDescription, trimmedTitle),
        metadata: metadata ?? undefined
    };
};
const summarizeJob = (job) => `${job.status}${job.activeStepId ? ` | ${job.activeStepId}` : ""}${job.completedStepIds.length ? ` | ${job.completedStepIds.length} done` : ""}${job.resumeCount ? ` | resumed ${job.resumeCount}x` : ""}`;
const summarizeAuditEvents = (auditTrail) => {
    if (auditTrail.length === 0) {
        return "No audit events yet.";
    }
    const tail = auditTrail.slice(-3);
    return `${auditTrail.length} events | ${tail
        .map((event) => `${event.stage}:${event.event}`)
        .join(" | ")}`;
};
export function AgentRuntimeCard() {
    const [title, setTitle] = useState("Inspect current runtime state");
    const [description, setDescription] = useState("Review recent jobs and confirm the latest checkpoint.");
    const [metadataJson, setMetadataJson] = useState(emptyMetadata);
    const [busy, setBusy] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [selectedInspection, setSelectedInspection] = useState(null);
    const [runtimeResult, setRuntimeResult] = useState(null);
    const [liveProgress, setLiveProgress] = useState(null);
    const parsedMetadata = useMemo(() => parseMetadataJson(metadataJson), [metadataJson]);
    const snapshot = selectedInspection ?? runtimeResult;
    const snapshotResult = selectedInspection?.result ?? runtimeResult?.result ?? null;
    const snapshotPolicyDecision = selectedInspection?.policyDecision ?? runtimeResult?.policyDecision ?? null;
    const snapshotVerification = selectedInspection?.verification ?? runtimeResult?.verification ?? null;
    const snapshotPlannedSteps = selectedInspection?.plannedSteps ?? runtimeResult?.plannedSteps ?? [];
    const snapshotCheckpoint = selectedInspection?.latestCheckpoint ?? runtimeResult?.checkpoint ?? null;
    const snapshotContinuation = snapshotCheckpoint?.continuation ?? snapshotResult?.continuation ?? null;
    const snapshotAuditTrail = selectedInspection?.auditTrail ?? runtimeResult?.auditTrail ?? [];
    const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
    const stepCount = snapshotPlannedSteps.length;
    const refreshJobs = async () => {
        if (!window.synai?.listAgentRuntimeJobs) {
            return;
        }
        const nextJobs = await window.synai.listAgentRuntimeJobs();
        const sortedJobs = [...nextJobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        setJobs(sortedJobs);
        setSelectedJobId((current) => current ?? sortedJobs[0]?.id ?? null);
    };
    const inspectJob = async (jobId) => {
        if (!window.synai?.inspectAgentRuntimeJob) {
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const inspection = await window.synai.inspectAgentRuntimeJob(jobId);
            setSelectedJobId(jobId);
            setSelectedInspection(inspection);
            if (!inspection) {
                setStatusMessage("No inspection payload was returned for that job.");
            }
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to inspect the selected job.");
        }
        finally {
            setBusy(false);
        }
    };
    const runTask = async () => {
        if (parsedMetadata.error) {
            setStatusMessage(parsedMetadata.error);
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const task = buildRuntimeTask(title, description, parsedMetadata.metadata);
            const result = await window.synai.runAgentRuntimeTask(task);
            setRuntimeResult(result);
            setSelectedInspection(null);
            setSelectedJobId(result.job.id);
            setStatusMessage(result.result.status === "success" ? "Runtime task completed." : result.result.summary ?? result.job.status);
            await refreshJobs();
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to run the runtime task.");
        }
        finally {
            setBusy(false);
        }
    };
    const resumeJob = async () => {
        if (!selectedJobId) {
            setStatusMessage("Select a job first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const resumed = await window.synai.resumeAgentRuntimeJob(selectedJobId);
            if (resumed) {
                setRuntimeResult(resumed);
                setSelectedInspection(null);
                setSelectedJobId(resumed.job.id);
                setStatusMessage(`Job ${resumed.job.status}.`);
            }
            else {
                setStatusMessage("No runtime result was returned for that resume request.");
            }
            await refreshJobs();
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to resume the selected job.");
        }
        finally {
            setBusy(false);
        }
    };
    const cancelJob = async () => {
        if (!selectedJobId) {
            setStatusMessage("Select a job first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const inspection = await window.synai.cancelAgentRuntimeJob(selectedJobId);
            setSelectedInspection(inspection);
            if (inspection) {
                setSelectedJobId(inspection.job.id);
                setStatusMessage(`Job ${inspection.job.status}.`);
            }
            await refreshJobs();
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to cancel the selected job.");
        }
        finally {
            setBusy(false);
        }
    };
    const recoverJob = async () => {
        if (!selectedJobId) {
            setStatusMessage("Select a job first.");
            return;
        }
        setBusy(true);
        setStatusMessage(null);
        try {
            const inspection = await window.synai.recoverAgentRuntimeJob(selectedJobId);
            setSelectedInspection(inspection);
            if (inspection) {
                setSelectedJobId(inspection.job.id);
                setStatusMessage(`Job ${inspection.job.status}.`);
            }
            await refreshJobs();
        }
        catch (error) {
            setStatusMessage(error instanceof Error ? error.message : "Unable to recover the selected job.");
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        void refreshJobs();
        if (!window.synai?.subscribeAgentRuntimeProgress) {
            return;
        }
        const unsubscribe = window.synai.subscribeAgentRuntimeProgress((event) => {
            setLiveProgress(event);
        });
        return unsubscribe;
    }, []);
    return (_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Agent Runtime" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Compact operator view for jobs, checkpoints, and verification." })] }), _jsx(Badge, { tone: runtimeStatusTone(snapshot?.job.status ?? liveProgress?.status ?? "idle"), children: snapshot?.job.status ?? liveProgress?.status ?? "idle" })] }), _jsxs("div", { className: "grid gap-2", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Title" }), _jsx(Input, { value: title, className: "py-1 text-[10px]", onChange: (event) => setTitle(event.target.value), placeholder: "Runtime job title" })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Description / step outline" }), _jsx(Textarea, { rows: 3, value: description, className: "min-h-[64px] py-1.5 text-[10px]", placeholder: "Use one line per step if you want a multi-step outline.", onChange: (event) => setDescription(event.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-[9px] text-slate-400", children: "Metadata JSON" }), _jsx(Textarea, { rows: 2, value: metadataJson, className: "min-h-[52px] py-1.5 font-mono text-[9px]", placeholder: '{"source":"tools-panel","priority":"operator"}', onChange: (event) => setMetadataJson(event.target.value) }), parsedMetadata.error ? _jsx("span", { className: "text-[9px] text-rose-300", children: parsedMetadata.error }) : null] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy, onClick: () => void runTask(), children: "Run Runtime Task" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy, onClick: () => void refreshJobs(), children: "Refresh Jobs" })] }), statusMessage ? _jsx("p", { className: "text-[9px] text-cyan-200", children: statusMessage }) : null, liveProgress ? (_jsxs("p", { className: "rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[9px] text-cyan-100", children: ["Progress: ", liveProgress.summary, " | checkpoint ", liveProgress.checkpointId ?? "n/a"] })) : null, _jsxs("div", { className: "space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Recent Jobs" }), _jsx("p", { className: "text-slate-400", children: jobs.length ? `${jobs.length} cached jobs` : "No jobs loaded yet." })] }), _jsxs(Badge, { tone: "neutral", children: [stepCount, " planned steps"] })] }), jobs.length > 0 ? (_jsx("div", { className: "space-y-1", children: jobs.slice(0, 4).map((job) => (_jsxs("button", { type: "button", className: `w-full rounded border px-2 py-1 text-left transition ${selectedJobId === job.id
                                ? "border-cyan-400/50 bg-cyan-500/10"
                                : "border-slate-800 bg-slate-950/50 hover:bg-slate-800/70"}`, onClick: () => void inspectJob(job.id), children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-mono text-[8px] text-cyan-200", children: job.id }), _jsx(Badge, { tone: runtimeStatusTone(job.status), children: job.status })] }), _jsx("p", { className: "mt-0.5 text-slate-400", children: summarizeJob(job) }), _jsxs("p", { className: "mt-0.5 text-[8px] text-slate-500", children: [formatDateTime(job.createdAt), " | task ", job.taskId] })] }, job.id))) })) : (_jsx("p", { className: "text-slate-400", children: "Recent jobs will appear here after the first runtime task." })), selectedJob ? (_jsxs("p", { className: "font-mono text-[8px] text-slate-500", children: ["Selected job ", selectedJob.id] })) : null] }), snapshot ? (_jsxs("div", { className: "space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-100", children: "Last Snapshot" }), _jsx("p", { className: "text-slate-400", children: snapshotResult?.summary ?? snapshot.job.status })] }), _jsx(Badge, { tone: runtimeStatusTone(snapshotResult?.status ?? snapshot.job.status), children: snapshotResult?.status ?? snapshot.job.status })] }), _jsxs("div", { className: "grid gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Policy Decision" }), _jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [_jsx(Badge, { tone: policyTone(snapshotPolicyDecision), children: snapshotPolicyDecision?.type ?? "unknown" }), _jsx(Badge, { tone: snapshotPolicyDecision?.approvalRequired ? "warn" : "good", children: snapshotPolicyDecision?.approvalRequired ? "approval required" : "no approval required" })] }), _jsx("p", { className: "mt-1 text-slate-300", children: snapshotPolicyDecision?.reason ?? "No policy decision returned." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Planned Steps" }), _jsx("div", { className: "mt-1 space-y-1", children: snapshotPlannedSteps.slice(0, 4).map((step) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-900/70 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-medium text-slate-100", children: step.name }), _jsx(Badge, { tone: runtimeStatusTone(step.status), children: step.status })] }), _jsx("p", { className: "text-slate-400", children: step.skill })] }, step.id))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Verification" }), _jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [_jsx(Badge, { tone: verificationTone(snapshotVerification), children: snapshotVerification?.status ?? "unknown" }), _jsxs(Badge, { tone: (snapshotVerification?.issues.length ?? 0) > 0 ? "warn" : "good", children: [snapshotVerification?.issues.length ?? 0, " issues"] })] }), _jsx("p", { className: "mt-1 text-slate-300", children: snapshotVerification?.summary ?? "Verification finished." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Checkpoint Summary" }), _jsxs("p", { className: "mt-1 text-slate-300", children: [snapshotCheckpoint?.id ?? "No checkpoint", " | ", snapshotCheckpoint?.phase ?? "phase n/a", " |", " ", snapshotCheckpoint?.completedStepIds.length ?? 0, " complete"] }), _jsx("p", { className: "mt-0.5 text-slate-400", children: snapshotCheckpoint?.summary ?? "No checkpoint summary provided." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Continuation" }), _jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [_jsx(Badge, { tone: snapshotContinuation?.mode === "exact" ? "good" : snapshotContinuation ? "warn" : "neutral", children: snapshotContinuation?.mode ?? "unknown" }), _jsx(Badge, { tone: snapshotContinuation?.resumable ? "good" : "neutral", children: snapshotContinuation?.resumable ? "resumable" : "reconstruction only" })] }), _jsx("p", { className: "mt-1 text-slate-300", children: snapshotContinuation?.limitation ??
                                            "Checkpoint state is recoverable, but terminal jobs are reconstructed rather than replayed." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-slate-400", children: "Audit Trail" }), _jsx("p", { className: "mt-1 text-slate-300", children: summarizeAuditEvents(snapshotAuditTrail) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !selectedJobId, onClick: () => void resumeJob(), children: "Resume Selected" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: busy || !selectedJobId, onClick: () => void cancelJob(), children: "Cancel Selected" }), _jsx(Button, { className: "col-span-2 py-1 text-[10px]", variant: "ghost", disabled: busy || !selectedJobId, onClick: () => void recoverJob(), children: "Recover Selected" })] })] })) : (_jsx("p", { className: "text-[9px] text-slate-500", children: "Run a task or inspect a cached job to see the runtime snapshot." }))] }));
}
