import { useEffect, useMemo, useState } from "react";
import type {
  GovernanceApprovalQueueSnapshot,
  GovernanceAuditEntry,
  GovernanceDashboardSnapshot,
  OfficialKnowledgeSourceStatus
} from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { featureRegistry } from "../../feature-registry";
import type { ChatSettingsState } from "../types/localChat.types";
import { ChatSettings } from "./ChatSettings";

interface SettingsPanelProps {
  settings: ChatSettingsState;
  availableModels: string[];
  onUpdateSettings: (patch: Partial<ChatSettingsState>) => Promise<void>;
}

const queueTone = (status: string): "good" | "neutral" | "warn" | "bad" => {
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

const sourceTone = (source: OfficialKnowledgeSourceStatus): "good" | "neutral" | "warn" => {
  if (!source.enabled) {
    return "neutral";
  }
  if (source.lastStatus === "failed") {
    return "warn";
  }
  return "good";
};

export function SettingsPanel({ settings, availableModels, onUpdateSettings }: SettingsPanelProps) {
  const [dashboard, setDashboard] = useState<GovernanceDashboardSnapshot | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<GovernanceApprovalQueueSnapshot | null>(null);
  const [auditEntries, setAuditEntries] = useState<GovernanceAuditEntry[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<OfficialKnowledgeSourceStatus[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditError, setAuditError] = useState<string | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);

  const auditFilter = useMemo(() => auditQuery.trim(), [auditQuery]);

  const loadGovernanceData = async (): Promise<void> => {
    try {
      const [dashboardSnapshot, queueSnapshot, sourcesSnapshot, auditSnapshot] = await Promise.all([
        window.synai.getGovernanceDashboard(),
        window.synai.getGovernanceApprovalQueue(),
        window.synai.listOfficialKnowledgeSources(),
        window.synai.queryGovernanceAudit(
          auditFilter.length > 0
            ? {
                commandNameIncludes: auditFilter,
                summaryIncludes: auditFilter,
                limit: 12
              }
            : { limit: 12 }
        )
      ]);
      setDashboard(dashboardSnapshot);
      setApprovalQueue(queueSnapshot);
      setKnowledgeSources(sourcesSnapshot);
      setAuditEntries(auditSnapshot);
      setDashboardError(null);
      setAuditError(null);
      setKnowledgeError(null);
    } catch (error) {
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

  const refreshKnowledge = async (): Promise<void> => {
    try {
      const sourcesSnapshot = await window.synai.listOfficialKnowledgeSources();
      setKnowledgeSources(sourcesSnapshot);
      setKnowledgeError(null);
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : "Unable to load knowledge sources.");
    }
  };

  const toggleSource = async (source: OfficialKnowledgeSourceStatus): Promise<void> => {
    setBusySourceId(source.id);
    try {
      const updated = await window.synai.setOfficialKnowledgeSourceEnabled(source.id, !source.enabled);
      setDashboard((current) =>
        current
          ? {
              ...current,
              officialKnowledge: updated
            }
          : current
      );
      await refreshKnowledge();
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : "Unable to update knowledge source.");
    } finally {
      setBusySourceId(null);
    }
  };

  const refreshSource = async (source: OfficialKnowledgeSourceStatus): Promise<void> => {
    setBusySourceId(source.id);
    try {
      const updated = await window.synai.refreshOfficialKnowledgeSource(source.id);
      setDashboard((current) =>
        current
          ? {
              ...current,
              officialKnowledge: updated
            }
          : current
      );
      await refreshKnowledge();
    } catch (error) {
      setKnowledgeError(error instanceof Error ? error.message : "Unable to refresh knowledge source.");
    } finally {
      setBusySourceId(null);
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <header className="border-b border-slate-800 px-2.5 py-1.5">
        <h2 className="text-sm font-semibold text-slate-100">Settings</h2>
        <p className="text-[9px] text-slate-400">Model, search, reply style, and governed system state live here.</p>
      </header>

      <div className="grid gap-1.5 overflow-hidden p-2">
        <ChatSettings
          settings={settings}
          availableModels={availableModels}
          onUpdateSettings={onUpdateSettings}
          hideTitle
        />

        <Card className="space-y-2 p-1.5">
          <h3 className="text-[10px] font-semibold text-slate-100">Feature Stages</h3>
          <div className="flex flex-wrap gap-1">
            {featureRegistry.map((feature) => (
              <Badge key={feature.id} tone={feature.status === "active" ? "good" : "neutral"}>
                {feature.label}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="space-y-2 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-slate-100">Governance Snapshot</h3>
            <div className="flex items-center gap-1">
              <Button className="px-2 py-1 text-[9px]" variant="ghost" onClick={() => void loadGovernanceData()}>
                Refresh
              </Button>
              <Badge tone={dashboard ? "good" : "neutral"}>{dashboard ? "Loaded" : "Pending"}</Badge>
            </div>
          </div>
          {dashboardError ? <p className="text-[9px] text-rose-300">{dashboardError}</p> : null}
          {dashboard ? (
            <div className="space-y-2 text-[9px] text-slate-300">
              <div className="flex flex-wrap gap-1">
                <Badge tone="neutral">Captured {new Date(dashboard.capturedAt).toLocaleTimeString()}</Badge>
                {dashboard.capabilitySummary ? (
                  <Badge tone={dashboard.capabilitySummary.totals.failed > 0 ? "warn" : "good"}>
                    Eval {dashboard.capabilitySummary.totals.passed}/{dashboard.capabilitySummary.totals.total}
                  </Badge>
                ) : null}
                <Badge tone={dashboard.pendingApprovals.length > 0 ? "warn" : "good"}>
                  Pending {dashboard.pendingApprovals.length}
                </Badge>
                <Badge tone={approvalQueue?.totals.pending ? "warn" : "good"}>
                  Queue {approvalQueue?.totals.total ?? 0}
                </Badge>
                <Badge tone={dashboard.officialKnowledge?.ready ? "good" : "neutral"}>
                  Knowledge {dashboard.officialKnowledge?.documentCount ?? 0}
                </Badge>
              </div>

              {dashboard.capabilitySummary ? (
                <p>
                  Capability eval: {dashboard.capabilitySummary.runId} | Failed cards{" "}
                  {dashboard.capabilitySummary.latestFailedCardIds.length}
                </p>
              ) : (
                <p>No capability eval snapshot found yet.</p>
              )}

              {dashboard.historyBacklog ? (
                <p>
                  History backlog: {dashboard.historyBacklog.conversationCount} conversations,{" "}
                  {dashboard.historyBacklog.findingCount} findings, {dashboard.historyBacklog.draftCount} drafts
                </p>
              ) : (
                <p>No history backlog snapshot found yet.</p>
              )}

              {dashboard.pendingApprovals.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-slate-400">Pending approvals</p>
                  {dashboard.pendingApprovals.slice(0, 3).map((item) => (
                    <div
                      key={`${item.conversationId}-${item.requestId}`}
                      className="rounded border border-slate-800 bg-slate-950/50 p-1"
                    >
                      <p className="text-slate-200">
                        {item.actionType ?? "unknown"} | {item.decision}
                      </p>
                      <p className="text-slate-500">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No pending approvals.</p>
              )}

              {dashboard.recentAuditEntries.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-slate-400">Recent audit entries</p>
                  {dashboard.recentAuditEntries.slice(0, 3).map((entry) => (
                    <div
                      key={`${entry.source}-${entry.timestamp}-${entry.commandName}`}
                      className="rounded border border-slate-800 bg-slate-950/50 p-1"
                    >
                      <p className="text-slate-200">
                        {entry.commandName} | {entry.status}
                      </p>
                      <p className="text-slate-500">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No recent audit entries.</p>
              )}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400">Loading governance snapshot...</p>
          )}
        </Card>

        <Card className="space-y-2 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-slate-100">Runtime Capability Registry</h3>
            <Badge tone={dashboard?.capabilityRegistry ? "good" : "neutral"}>
              {dashboard?.capabilityRegistry?.entries.length ?? 0} entries
            </Badge>
          </div>
          {dashboard?.capabilityRegistry ? (
            <div className="space-y-2 text-[9px] text-slate-300">
              <div className="flex flex-wrap gap-1">
                <Badge tone="good">Active {dashboard.capabilityRegistry.totals.active}</Badge>
                <Badge tone="warn">Partial {dashboard.capabilityRegistry.totals.partial}</Badge>
                <Badge tone="neutral">Planned {dashboard.capabilityRegistry.totals.planned}</Badge>
                <Badge tone="bad">Blocked {dashboard.capabilityRegistry.totals.blocked}</Badge>
                <Badge tone={dashboard.capabilityRegistry.plugins.length > 0 ? "good" : "neutral"}>
                  Plugins {dashboard.capabilityRegistry.plugins.length}
                </Badge>
              </div>
              {dashboard.capabilityRegistry.plugins.length > 0 ? (
                <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                  {dashboard.capabilityRegistry.plugins.slice(0, 4).map((plugin) => (
                    <div key={plugin.manifest.id} className="rounded border border-slate-800 bg-slate-950/50 p-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge tone={plugin.loaded ? "good" : plugin.manifest.enabled ? "warn" : "neutral"}>
                          {plugin.loaded ? "loaded" : plugin.manifest.enabled ? "pending" : "disabled"}
                        </Badge>
                        <Badge tone={plugin.manifest.approved ? "good" : "bad"}>
                          {plugin.manifest.approved ? "approved" : "approval needed"}
                        </Badge>
                        <span className="text-slate-200">{plugin.manifest.title}</span>
                      </div>
                      <p className="text-slate-500">
                        {plugin.manifest.id} v{plugin.manifest.version} | {plugin.capabilities.length} capabilities
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No runtime plugin manifests discovered yet.</p>
              )}
              {dashboard.capabilityRegistry.entries.length > 0 ? (
                <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                  {dashboard.capabilityRegistry.entries.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="rounded border border-slate-800 bg-slate-950/50 p-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge
                          tone={
                            entry.status === "active"
                              ? "good"
                              : entry.status === "partial"
                                ? "warn"
                                : entry.status === "blocked"
                                  ? "bad"
                                  : "neutral"
                          }
                        >
                          {entry.kind}
                        </Badge>
                        <span className="text-slate-200">{entry.title}</span>
                      </div>
                      <p className="text-slate-500">{entry.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400">Loading runtime capability registry...</p>
          )}
        </Card>

        <Card className="space-y-2 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-slate-100">Approval Queue</h3>
            <Badge tone={approvalQueue ? "good" : "neutral"}>{approvalQueue ? "Loaded" : "Pending"}</Badge>
          </div>
          {approvalQueue ? (
            <div className="space-y-1 text-[9px] text-slate-300">
              <div className="flex flex-wrap gap-1">
                <Badge tone="neutral">Total {approvalQueue.totals.total}</Badge>
                <Badge tone="warn">Pending {approvalQueue.totals.pending}</Badge>
                <Badge tone="good">Consumed {approvalQueue.totals.consumed}</Badge>
                <Badge tone="bad">Denied {approvalQueue.totals.denied}</Badge>
                <Badge tone="warn">Blocked {approvalQueue.totals.blocked}</Badge>
                <Badge tone="neutral">Revoked {approvalQueue.totals.revoked}</Badge>
                <Badge tone="neutral">Expired {approvalQueue.totals.expired}</Badge>
              </div>
              {approvalQueue.records.length > 0 ? (
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {approvalQueue.records.slice(0, 6).map((record) => (
                    <div
                      key={record.id}
                      className="rounded border border-slate-800 bg-slate-950/50 p-1"
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge tone={queueTone(record.status)}>{record.status}</Badge>
                        <span className="text-slate-200">{record.commandName}</span>
                      </div>
                      <p className="text-slate-500">{record.summary}</p>
                      <p className="text-slate-600">
                        {record.approvedBy ?? "unapproved"} | {new Date(record.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No approval queue records yet.</p>
              )}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400">Loading approval queue...</p>
          )}
        </Card>

        <Card className="space-y-2 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-slate-100">Audit Explorer</h3>
            <Badge tone={auditEntries.length > 0 ? "good" : "neutral"}>{auditEntries.length} entries</Badge>
          </div>
          {auditError ? <p className="text-[9px] text-rose-300">{auditError}</p> : null}
          <div className="flex items-center gap-1.5">
            <Input
              value={auditQuery}
              className="py-1 text-[10px]"
              placeholder="Filter by command or summary"
              onChange={(event) => setAuditQuery(event.target.value)}
            />
            <Button className="px-2 py-1 text-[9px]" variant="ghost" onClick={() => void loadGovernanceData()}>
              Search
            </Button>
          </div>
          {auditEntries.length > 0 ? (
            <div className="max-h-36 space-y-1 overflow-y-auto pr-1 text-[9px] text-slate-300">
              {auditEntries.map((entry) => (
                <div key={`${entry.source}-${entry.timestamp}-${entry.commandName}`} className="rounded border border-slate-800 bg-slate-950/50 p-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge tone="neutral">{entry.source}</Badge>
                    <Badge tone={entry.status === "failed" ? "warn" : "good"}>{entry.status}</Badge>
                    <span className="text-slate-200">{entry.commandName}</span>
                  </div>
                  <p className="text-slate-500">{entry.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400">No audit entries matched the current filter.</p>
          )}
        </Card>

        <Card className="space-y-2 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-slate-100">Official Knowledge</h3>
            <div className="flex items-center gap-1">
              <Button className="px-2 py-1 text-[9px]" variant="ghost" onClick={() => void refreshKnowledge()}>
                Reload
              </Button>
              <Badge tone={knowledgeSources.some((source) => source.enabled) ? "good" : "neutral"}>
                {knowledgeSources.filter((source) => source.enabled).length}/{knowledgeSources.length}
              </Badge>
            </div>
          </div>
          {knowledgeError ? <p className="text-[9px] text-rose-300">{knowledgeError}</p> : null}
          {dashboard?.officialKnowledge ? (
            <div className="flex flex-wrap gap-1 text-[9px] text-slate-300">
              <Badge tone={dashboard.officialKnowledge.ready ? "good" : "neutral"}>
                {dashboard.officialKnowledge.ready ? "Ready" : "Empty"}
              </Badge>
              <Badge tone={dashboard.officialKnowledge.mirrorFresh ? "good" : "warn"}>
                {dashboard.officialKnowledge.mirrorFresh ? "Fresh" : "Stale"}
              </Badge>
              <Badge tone="neutral">Docs {dashboard.officialKnowledge.documentCount}</Badge>
              <Badge tone="neutral">Sources {dashboard.officialKnowledge.sourceCount}</Badge>
            </div>
          ) : null}
          {knowledgeSources.length > 0 ? (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1 text-[9px] text-slate-300">
              {knowledgeSources.map((source) => (
                <div
                  key={source.id}
                  className="rounded border border-slate-800 bg-slate-950/50 p-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge tone={sourceTone(source)}>{source.enabled ? "enabled" : "disabled"}</Badge>
                      <span className="text-slate-100">{source.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        className="px-2 py-1 text-[9px]"
                        variant="ghost"
                        disabled={busySourceId === source.id}
                        onClick={() => void toggleSource(source)}
                      >
                        {source.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        className="px-2 py-1 text-[9px]"
                        variant="ghost"
                        disabled={busySourceId === source.id || !source.enabled}
                        onClick={() => void refreshSource(source)}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <p className="text-slate-500">{source.domain} | {source.lastStatus}</p>
                  <p className="text-slate-500">
                    Docs {source.documentCount}
                    {source.lastFetchedAt ? ` | Updated ${new Date(source.lastFetchedAt).toLocaleTimeString()}` : ""}
                    {source.error ? ` | ${source.error}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400">No official knowledge sources are loaded yet.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
