import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { featureRegistry } from "../../feature-registry";
import { ChatSettings } from "./ChatSettings";
const queueTone = (status) => {
    if (status === "consumed" || status === "approved") {
        return "good";
    }
    if (status === "denied" || status === "blocked" || status === "revoked" || status === "expired") {
        return "bad";
    }
    if (status === "pending") {
        return "warn";
    }
    return "neutral";
};
const sourceTone = (source) => {
    if (!source.enabled) {
        return "neutral";
    }
    if (source.lastStatus === "failed") {
        return "warn";
    }
    return "good";
};
export function SettingsPanel({ settings, availableModels, onUpdateSettings }) {
    const [dashboard, setDashboard] = useState(null);
    const [approvalQueue, setApprovalQueue] = useState(null);
    const [auditEntries, setAuditEntries] = useState([]);
    const [knowledgeSources, setKnowledgeSources] = useState([]);
    const [dashboardError, setDashboardError] = useState(null);
    const [auditQuery, setAuditQuery] = useState("");
    const [auditError, setAuditError] = useState(null);
    const [knowledgeError, setKnowledgeError] = useState(null);
    const [busySourceId, setBusySourceId] = useState(null);
    const auditFilter = useMemo(() => auditQuery.trim(), [auditQuery]);
    const loadGovernanceData = async () => {
        try {
            const [dashboardSnapshot, queueSnapshot, sourcesSnapshot, auditSnapshot] = await Promise.all([
                window.synai.getGovernanceDashboard(),
                window.synai.getGovernanceApprovalQueue(),
                window.synai.listOfficialKnowledgeSources(),
                window.synai.queryGovernanceAudit(auditFilter.length > 0
                    ? {
                        commandNameIncludes: auditFilter,
                        summaryIncludes: auditFilter,
                        limit: 12
                    }
                    : { limit: 12 })
            ]);
            setDashboard(dashboardSnapshot);
            setApprovalQueue(queueSnapshot);
            setKnowledgeSources(sourcesSnapshot);
            setAuditEntries(auditSnapshot);
            setDashboardError(null);
            setAuditError(null);
            setKnowledgeError(null);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to load governance data.";
            setDashboardError(message);
            setAuditError(message);
            setKnowledgeError(message);
        }
    };
    useEffect(() => {
        let active = true;
        void (async () => {
            if (!active) {
                return;
            }
            await loadGovernanceData();
        })();
        return () => {
            active = false;
        };
    }, [auditFilter]);
    const refreshKnowledge = async () => {
        try {
            const sourcesSnapshot = await window.synai.listOfficialKnowledgeSources();
            setKnowledgeSources(sourcesSnapshot);
            setKnowledgeError(null);
        }
        catch (error) {
            setKnowledgeError(error instanceof Error ? error.message : "Unable to load knowledge sources.");
        }
    };
    const toggleSource = async (source) => {
        setBusySourceId(source.id);
        try {
            const updated = await window.synai.setOfficialKnowledgeSourceEnabled(source.id, !source.enabled);
            setDashboard((current) => current
                ? {
                    ...current,
                    officialKnowledge: updated
                }
                : current);
            await refreshKnowledge();
        }
        catch (error) {
            setKnowledgeError(error instanceof Error ? error.message : "Unable to update knowledge source.");
        }
        finally {
            setBusySourceId(null);
        }
    };
    const refreshSource = async (source) => {
        setBusySourceId(source.id);
        try {
            const updated = await window.synai.refreshOfficialKnowledgeSource(source.id);
            setDashboard((current) => current
                ? {
                    ...current,
                    officialKnowledge: updated
                }
                : current);
            await refreshKnowledge();
        }
        catch (error) {
            setKnowledgeError(error instanceof Error ? error.message : "Unable to refresh knowledge source.");
        }
        finally {
            setBusySourceId(null);
        }
    };
    return (_jsxs("section", { className: "flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60", children: [_jsxs("header", { className: "border-b border-slate-800 px-2.5 py-1.5", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-100", children: "Settings" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Model, search, reply style, and governed system state live here." })] }), _jsxs("div", { className: "grid gap-1.5 overflow-hidden p-2", children: [_jsx(ChatSettings, { settings: settings, availableModels: availableModels, onUpdateSettings: onUpdateSettings, hideTitle: true }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Feature Stages" }), _jsx("div", { className: "flex flex-wrap gap-1", children: featureRegistry.map((feature) => (_jsx(Badge, { tone: feature.status === "active" ? "good" : "neutral", children: feature.label }, feature.id))) })] }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Governance Snapshot" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { className: "px-2 py-1 text-[9px]", variant: "ghost", onClick: () => void loadGovernanceData(), children: "Refresh" }), _jsx(Badge, { tone: dashboard ? "good" : "neutral", children: dashboard ? "Loaded" : "Pending" })] })] }), dashboardError ? _jsx("p", { className: "text-[9px] text-rose-300", children: dashboardError }) : null, dashboard ? (_jsxs("div", { className: "space-y-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsxs(Badge, { tone: "neutral", children: ["Captured ", new Date(dashboard.capturedAt).toLocaleTimeString()] }), dashboard.capabilitySummary ? (_jsxs(Badge, { tone: dashboard.capabilitySummary.totals.failed > 0 ? "warn" : "good", children: ["Eval ", dashboard.capabilitySummary.totals.passed, "/", dashboard.capabilitySummary.totals.total] })) : null, _jsxs(Badge, { tone: dashboard.pendingApprovals.length > 0 ? "warn" : "good", children: ["Pending ", dashboard.pendingApprovals.length] }), _jsxs(Badge, { tone: approvalQueue?.totals.pending ? "warn" : "good", children: ["Queue ", approvalQueue?.totals.total ?? 0] }), _jsxs(Badge, { tone: dashboard.officialKnowledge?.ready ? "good" : "neutral", children: ["Knowledge ", dashboard.officialKnowledge?.documentCount ?? 0] })] }), dashboard.capabilitySummary ? (_jsxs("p", { children: ["Capability eval: ", dashboard.capabilitySummary.runId, " | Failed cards", " ", dashboard.capabilitySummary.latestFailedCardIds.length] })) : (_jsx("p", { children: "No capability eval snapshot found yet." })), dashboard.historyBacklog ? (_jsxs("p", { children: ["History backlog: ", dashboard.historyBacklog.conversationCount, " conversations,", " ", dashboard.historyBacklog.findingCount, " findings, ", dashboard.historyBacklog.draftCount, " drafts"] })) : (_jsx("p", { children: "No history backlog snapshot found yet." })), dashboard.pendingApprovals.length > 0 ? (_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-slate-400", children: "Pending approvals" }), dashboard.pendingApprovals.slice(0, 3).map((item) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("p", { className: "text-slate-200", children: [item.actionType ?? "unknown", " | ", item.decision] }), _jsx("p", { className: "text-slate-500", children: item.summary })] }, `${item.conversationId}-${item.requestId}`)))] })) : (_jsx("p", { children: "No pending approvals." })), dashboard.recentAuditEntries.length > 0 ? (_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-slate-400", children: "Recent audit entries" }), dashboard.recentAuditEntries.slice(0, 3).map((entry) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("p", { className: "text-slate-200", children: [entry.commandName, " | ", entry.status] }), _jsx("p", { className: "text-slate-500", children: entry.summary })] }, `${entry.source}-${entry.timestamp}-${entry.commandName}`)))] })) : (_jsx("p", { children: "No recent audit entries." }))] })) : (_jsx("p", { className: "text-[9px] text-slate-400", children: "Loading governance snapshot..." }))] }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Runtime Capability Registry" }), _jsxs(Badge, { tone: dashboard?.capabilityRegistry ? "good" : "neutral", children: [dashboard?.capabilityRegistry?.entries.length ?? 0, " entries"] })] }), dashboard?.capabilityRegistry ? (_jsxs("div", { className: "space-y-2 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsxs(Badge, { tone: "good", children: ["Active ", dashboard.capabilityRegistry.totals.active] }), _jsxs(Badge, { tone: "warn", children: ["Partial ", dashboard.capabilityRegistry.totals.partial] }), _jsxs(Badge, { tone: "neutral", children: ["Planned ", dashboard.capabilityRegistry.totals.planned] }), _jsxs(Badge, { tone: "bad", children: ["Blocked ", dashboard.capabilityRegistry.totals.blocked] }), _jsxs(Badge, { tone: dashboard.capabilityRegistry.plugins.length > 0 ? "good" : "neutral", children: ["Plugins ", dashboard.capabilityRegistry.plugins.length] })] }), dashboard.capabilityRegistry.plugins.length > 0 ? (_jsx("div", { className: "max-h-28 space-y-1 overflow-y-auto pr-1", children: dashboard.capabilityRegistry.plugins.slice(0, 4).map((plugin) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx(Badge, { tone: plugin.loaded ? "good" : plugin.manifest.enabled ? "warn" : "neutral", children: plugin.loaded ? "loaded" : plugin.manifest.enabled ? "pending" : "disabled" }), _jsx(Badge, { tone: plugin.manifest.approved ? "good" : "bad", children: plugin.manifest.approved ? "approved" : "approval needed" }), _jsx("span", { className: "text-slate-200", children: plugin.manifest.title })] }), _jsxs("p", { className: "text-slate-500", children: [plugin.manifest.id, " v", plugin.manifest.version, " | ", plugin.capabilities.length, " capabilities"] })] }, plugin.manifest.id))) })) : (_jsx("p", { className: "text-slate-400", children: "No runtime plugin manifests discovered yet." })), dashboard.capabilityRegistry.entries.length > 0 ? (_jsx("div", { className: "max-h-28 space-y-1 overflow-y-auto pr-1", children: dashboard.capabilityRegistry.entries.slice(0, 6).map((entry) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx(Badge, { tone: entry.status === "active"
                                                                ? "good"
                                                                : entry.status === "partial"
                                                                    ? "warn"
                                                                    : entry.status === "blocked"
                                                                        ? "bad"
                                                                        : "neutral", children: entry.kind }), _jsx("span", { className: "text-slate-200", children: entry.title })] }), _jsx("p", { className: "text-slate-500", children: entry.description })] }, entry.id))) })) : null] })) : (_jsx("p", { className: "text-[9px] text-slate-400", children: "Loading runtime capability registry..." }))] }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Approval Queue" }), _jsx(Badge, { tone: approvalQueue ? "good" : "neutral", children: approvalQueue ? "Loaded" : "Pending" })] }), approvalQueue ? (_jsxs("div", { className: "space-y-1 text-[9px] text-slate-300", children: [_jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsxs(Badge, { tone: "neutral", children: ["Total ", approvalQueue.totals.total] }), _jsxs(Badge, { tone: "warn", children: ["Pending ", approvalQueue.totals.pending] }), _jsxs(Badge, { tone: "good", children: ["Consumed ", approvalQueue.totals.consumed] }), _jsxs(Badge, { tone: "bad", children: ["Denied ", approvalQueue.totals.denied] }), _jsxs(Badge, { tone: "warn", children: ["Blocked ", approvalQueue.totals.blocked] }), _jsxs(Badge, { tone: "neutral", children: ["Revoked ", approvalQueue.totals.revoked] }), _jsxs(Badge, { tone: "neutral", children: ["Expired ", approvalQueue.totals.expired] })] }), approvalQueue.records.length > 0 ? (_jsx("div", { className: "max-h-36 space-y-1 overflow-y-auto pr-1", children: approvalQueue.records.slice(0, 6).map((record) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx(Badge, { tone: queueTone(record.status), children: record.status }), _jsx("span", { className: "text-slate-200", children: record.commandName })] }), _jsx("p", { className: "text-slate-500", children: record.summary }), _jsxs("p", { className: "text-slate-600", children: [record.approvedBy ?? "unapproved", " | ", new Date(record.updatedAt).toLocaleTimeString()] })] }, record.id))) })) : (_jsx("p", { className: "text-slate-400", children: "No approval queue records yet." }))] })) : (_jsx("p", { className: "text-[9px] text-slate-400", children: "Loading approval queue..." }))] }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Audit Explorer" }), _jsxs(Badge, { tone: auditEntries.length > 0 ? "good" : "neutral", children: [auditEntries.length, " entries"] })] }), auditError ? _jsx("p", { className: "text-[9px] text-rose-300", children: auditError }) : null, _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Input, { value: auditQuery, className: "py-1 text-[10px]", placeholder: "Filter by command or summary", onChange: (event) => setAuditQuery(event.target.value) }), _jsx(Button, { className: "px-2 py-1 text-[9px]", variant: "ghost", onClick: () => void loadGovernanceData(), children: "Search" })] }), auditEntries.length > 0 ? (_jsx("div", { className: "max-h-36 space-y-1 overflow-y-auto pr-1 text-[9px] text-slate-300", children: auditEntries.map((entry) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx(Badge, { tone: "neutral", children: entry.source }), _jsx(Badge, { tone: entry.status === "failed" ? "warn" : "good", children: entry.status }), _jsx("span", { className: "text-slate-200", children: entry.commandName })] }), _jsx("p", { className: "text-slate-500", children: entry.summary })] }, `${entry.source}-${entry.timestamp}-${entry.commandName}`))) })) : (_jsx("p", { className: "text-[9px] text-slate-400", children: "No audit entries matched the current filter." }))] }), _jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-[10px] font-semibold text-slate-100", children: "Official Knowledge" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { className: "px-2 py-1 text-[9px]", variant: "ghost", onClick: () => void refreshKnowledge(), children: "Reload" }), _jsxs(Badge, { tone: knowledgeSources.some((source) => source.enabled) ? "good" : "neutral", children: [knowledgeSources.filter((source) => source.enabled).length, "/", knowledgeSources.length] })] })] }), knowledgeError ? _jsx("p", { className: "text-[9px] text-rose-300", children: knowledgeError }) : null, dashboard?.officialKnowledge ? (_jsxs("div", { className: "flex flex-wrap gap-1 text-[9px] text-slate-300", children: [_jsx(Badge, { tone: dashboard.officialKnowledge.ready ? "good" : "neutral", children: dashboard.officialKnowledge.ready ? "Ready" : "Empty" }), _jsx(Badge, { tone: dashboard.officialKnowledge.mirrorFresh ? "good" : "warn", children: dashboard.officialKnowledge.mirrorFresh ? "Fresh" : "Stale" }), _jsxs(Badge, { tone: "neutral", children: ["Docs ", dashboard.officialKnowledge.documentCount] }), _jsxs(Badge, { tone: "neutral", children: ["Sources ", dashboard.officialKnowledge.sourceCount] })] })) : null, knowledgeSources.length > 0 ? (_jsx("div", { className: "max-h-44 space-y-1 overflow-y-auto pr-1 text-[9px] text-slate-300", children: knowledgeSources.map((source) => (_jsxs("div", { className: "rounded border border-slate-800 bg-slate-950/50 p-1", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [_jsx(Badge, { tone: sourceTone(source), children: source.enabled ? "enabled" : "disabled" }), _jsx("span", { className: "text-slate-100", children: source.title })] }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsx(Button, { className: "px-2 py-1 text-[9px]", variant: "ghost", disabled: busySourceId === source.id, onClick: () => void toggleSource(source), children: source.enabled ? "Disable" : "Enable" }), _jsx(Button, { className: "px-2 py-1 text-[9px]", variant: "ghost", disabled: busySourceId === source.id || !source.enabled, onClick: () => void refreshSource(source), children: "Refresh" })] })] }), _jsxs("p", { className: "text-slate-500", children: [source.domain, " | ", source.lastStatus] }), _jsxs("p", { className: "text-slate-500", children: ["Docs ", source.documentCount, source.lastFetchedAt ? ` | Updated ${new Date(source.lastFetchedAt).toLocaleTimeString()}` : "", source.error ? ` | ${source.error}` : ""] })] }, source.id))) })) : (_jsx("p", { className: "text-[9px] text-slate-400", children: "No official knowledge sources are loaded yet." }))] })] })] }));
}
