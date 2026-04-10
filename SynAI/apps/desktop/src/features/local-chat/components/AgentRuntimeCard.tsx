import { useEffect, useMemo, useState } from "react";
import type { AgentRuntimeInspection, AgentRuntimeRunResult, AgentTask, PolicyDecision, RuntimeJob, RuntimeProgressEvent, VerificationReport } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
import { formatDateTime } from "../../../shared/utils/time";

const emptyMetadata = "";

const parseMetadataJson = (
  value: string
): { metadata: Record<string, unknown> | null; error: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { metadata: null, error: null };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { metadata: null, error: "Metadata JSON must be an object." };
    }

    return { metadata: parsed as Record<string, unknown>, error: null };
  } catch {
    return { metadata: null, error: "Metadata JSON is invalid." };
  }
};

const runtimeStatusTone = (status: string): "good" | "neutral" | "warn" | "bad" => {
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

const verificationTone = (report?: VerificationReport | null): "good" | "neutral" | "warn" => {
  if (!report) {
    return "neutral";
  }
  return report.status === "passed" ? "good" : report.status === "skipped" ? "neutral" : "warn";
};

const policyTone = (decision?: PolicyDecision | null): "good" | "neutral" | "warn" | "bad" => {
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

const uniqueStepList = (description: string, title: string): string[] => {
  const entries = description
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : [title];
};

const buildRuntimeTask = (title: string, description: string, metadata: Record<string, unknown> | null): AgentTask => {
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

const summarizeJob = (job: RuntimeJob): string =>
  `${job.status}${job.activeStepId ? ` | ${job.activeStepId}` : ""}${job.completedStepIds.length ? ` | ${job.completedStepIds.length} done` : ""}${job.resumeCount ? ` | resumed ${job.resumeCount}x` : ""}`;

const summarizeAuditEvents = (auditTrail: AgentRuntimeRunResult["auditTrail"] | AgentRuntimeInspection["auditTrail"]): string => {
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RuntimeJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<AgentRuntimeInspection | null>(null);
  const [runtimeResult, setRuntimeResult] = useState<AgentRuntimeRunResult | null>(null);
  const [liveProgress, setLiveProgress] = useState<RuntimeProgressEvent | null>(null);

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

  const refreshJobs = async (): Promise<void> => {
    if (!window.synai?.listAgentRuntimeJobs) {
      return;
    }

    const nextJobs = await window.synai.listAgentRuntimeJobs();
    const sortedJobs = [...nextJobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    setJobs(sortedJobs);
    setSelectedJobId((current) => current ?? sortedJobs[0]?.id ?? null);
  };

  const inspectJob = async (jobId: string): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to inspect the selected job.");
    } finally {
      setBusy(false);
    }
  };

  const runTask = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to run the runtime task.");
    } finally {
      setBusy(false);
    }
  };

  const resumeJob = async (): Promise<void> => {
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
      } else {
        setStatusMessage("No runtime result was returned for that resume request.");
      }
      await refreshJobs();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to resume the selected job.");
    } finally {
      setBusy(false);
    }
  };

  const cancelJob = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to cancel the selected job.");
    } finally {
      setBusy(false);
    }
  };

  const recoverJob = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to recover the selected job.");
    } finally {
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

  return (
    <Card className="space-y-2 p-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">Agent Runtime</h3>
          <p className="text-[9px] text-slate-400">Compact operator view for jobs, checkpoints, and verification.</p>
        </div>
        <Badge tone={runtimeStatusTone(snapshot?.job.status ?? liveProgress?.status ?? "idle")}>
          {snapshot?.job.status ?? liveProgress?.status ?? "idle"}
        </Badge>
      </div>

      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Title</span>
          <Input
            value={title}
            className="py-1 text-[10px]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Runtime job title"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Description / step outline</span>
          <Textarea
            rows={3}
            value={description}
            className="min-h-[64px] py-1.5 text-[10px]"
            placeholder="Use one line per step if you want a multi-step outline."
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Metadata JSON</span>
          <Textarea
            rows={2}
            value={metadataJson}
            className="min-h-[52px] py-1.5 font-mono text-[9px]"
            placeholder='{"source":"tools-panel","priority":"operator"}'
            onChange={(event) => setMetadataJson(event.target.value)}
          />
          {parsedMetadata.error ? <span className="text-[9px] text-rose-300">{parsedMetadata.error}</span> : null}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy} onClick={() => void runTask()}>
          Run Runtime Task
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy} onClick={() => void refreshJobs()}>
          Refresh Jobs
        </Button>
      </div>

      {statusMessage ? <p className="text-[9px] text-cyan-200">{statusMessage}</p> : null}
      {liveProgress ? (
        <p className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[9px] text-cyan-100">
          Progress: {liveProgress.summary} | checkpoint {liveProgress.checkpointId ?? "n/a"}
        </p>
      ) : null}

      <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-100">Recent Jobs</p>
            <p className="text-slate-400">{jobs.length ? `${jobs.length} cached jobs` : "No jobs loaded yet."}</p>
          </div>
          <Badge tone="neutral">{stepCount} planned steps</Badge>
        </div>

        {jobs.length > 0 ? (
          <div className="space-y-1">
            {jobs.slice(0, 4).map((job) => (
              <button
                key={job.id}
                type="button"
                className={`w-full rounded border px-2 py-1 text-left transition ${
                  selectedJobId === job.id
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-950/50 hover:bg-slate-800/70"
                }`}
                onClick={() => void inspectJob(job.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] text-cyan-200">{job.id}</span>
                  <Badge tone={runtimeStatusTone(job.status)}>{job.status}</Badge>
                </div>
                <p className="mt-0.5 text-slate-400">{summarizeJob(job)}</p>
                <p className="mt-0.5 text-[8px] text-slate-500">
                  {formatDateTime(job.createdAt)} | task {job.taskId}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">Recent jobs will appear here after the first runtime task.</p>
        )}

        {selectedJob ? (
          <p className="font-mono text-[8px] text-slate-500">Selected job {selectedJob.id}</p>
        ) : null}
      </div>

      {snapshot ? (
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-100">Last Snapshot</p>
              <p className="text-slate-400">{snapshotResult?.summary ?? snapshot.job.status}</p>
            </div>
            <Badge tone={runtimeStatusTone(snapshotResult?.status ?? snapshot.job.status)}>{snapshotResult?.status ?? snapshot.job.status}</Badge>
          </div>

          <div className="grid gap-2">
            <div>
              <p className="text-slate-400">Policy Decision</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={policyTone(snapshotPolicyDecision)}>{snapshotPolicyDecision?.type ?? "unknown"}</Badge>
                <Badge tone={snapshotPolicyDecision?.approvalRequired ? "warn" : "good"}>
                  {snapshotPolicyDecision?.approvalRequired ? "approval required" : "no approval required"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-300">{snapshotPolicyDecision?.reason ?? "No policy decision returned."}</p>
            </div>

            <div>
              <p className="text-slate-400">Planned Steps</p>
              <div className="mt-1 space-y-1">
                {snapshotPlannedSteps.slice(0, 4).map((step) => (
                  <div key={step.id} className="rounded border border-slate-800 bg-slate-900/70 p-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-100">{step.name}</p>
                      <Badge tone={runtimeStatusTone(step.status)}>{step.status}</Badge>
                    </div>
                    <p className="text-slate-400">{step.skill}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-slate-400">Verification</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={verificationTone(snapshotVerification)}>{snapshotVerification?.status ?? "unknown"}</Badge>
                <Badge tone={(snapshotVerification?.issues.length ?? 0) > 0 ? "warn" : "good"}>
                  {snapshotVerification?.issues.length ?? 0} issues
                </Badge>
              </div>
              <p className="mt-1 text-slate-300">{snapshotVerification?.summary ?? "Verification finished."}</p>
            </div>

            <div>
              <p className="text-slate-400">Checkpoint Summary</p>
              <p className="mt-1 text-slate-300">
                {snapshotCheckpoint?.id ?? "No checkpoint"} | {snapshotCheckpoint?.phase ?? "phase n/a"} |{" "}
                {snapshotCheckpoint?.completedStepIds.length ?? 0} complete
              </p>
              <p className="mt-0.5 text-slate-400">{snapshotCheckpoint?.summary ?? "No checkpoint summary provided."}</p>
            </div>

            <div>
              <p className="text-slate-400">Continuation</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={snapshotContinuation?.mode === "exact" ? "good" : snapshotContinuation ? "warn" : "neutral"}>
                  {snapshotContinuation?.mode ?? "unknown"}
                </Badge>
                <Badge tone={snapshotContinuation?.resumable ? "good" : "neutral"}>
                  {snapshotContinuation?.resumable ? "resumable" : "reconstruction only"}
                </Badge>
              </div>
              <p className="mt-1 text-slate-300">
                {snapshotContinuation?.limitation ??
                  "Checkpoint state is recoverable, but terminal jobs are reconstructed rather than replayed."}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Audit Trail</p>
              <p className="mt-1 text-slate-300">{summarizeAuditEvents(snapshotAuditTrail)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !selectedJobId} onClick={() => void resumeJob()}>
              Resume Selected
            </Button>
            <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !selectedJobId} onClick={() => void cancelJob()}>
              Cancel Selected
            </Button>
            <Button className="col-span-2 py-1 text-[10px]" variant="ghost" disabled={busy || !selectedJobId} onClick={() => void recoverJob()}>
              Recover Selected
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[9px] text-slate-500">Run a task or inspect a cached job to see the runtime snapshot.</p>
      )}
    </Card>
  );
}
