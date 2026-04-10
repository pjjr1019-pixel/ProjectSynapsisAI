import { useEffect, useMemo, useState } from "react";
import type {
  ApprovalToken,
  WorkflowExecutionResult,
  WorkflowPlan,
  WorkflowProgressEvent
} from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";

const emptyToken = "";

const formatStepStatusTone = (status: string): "good" | "neutral" | "warn" => {
  if (status === "executed") {
    return "good";
  }
  if (status === "blocked" || status === "failed") {
    return "warn";
  }
  return "neutral";
};

const parseApprovalTokenJson = (
  value: string
): { token: ApprovalToken | null; error: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { token: null, error: null };
  }

  try {
    return { token: JSON.parse(trimmed) as ApprovalToken, error: null };
  } catch {
    return { token: null, error: "Approval token JSON is invalid." };
  }
};

const formatArtifactLabel = (pathValue: string): string => pathValue.split(/[/\\]/).pop() ?? pathValue;

export function WorkflowOrchestrationCard() {
  const [prompt, setPrompt] = useState("");
  const [approvedBy, setApprovedBy] = useState("qa-operator");
  const [approvalTokenJson, setApprovalTokenJson] = useState<string>(emptyToken);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [progress, setProgress] = useState<WorkflowProgressEvent | null>(null);
  const [lastResult, setLastResult] = useState<WorkflowExecutionResult | null>(null);

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

  const suggestPlan = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to suggest a workflow.");
    } finally {
      setBusy(false);
    }
  };

  const issueApproval = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to issue workflow approval.");
    } finally {
      setBusy(false);
    }
  };

  const executePlan = async (): Promise<void> => {
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
      setStatusMessage(
        result.status === "executed"
          ? "Workflow executed."
          : result.status === "simulated"
            ? "Workflow simulated."
            : result.summary
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to execute workflow.");
    } finally {
      setBusy(false);
    }
  };

  const activeStep = progress?.currentStepId ?? plan?.steps[0]?.id ?? null;

  return (
    <Card className="space-y-2 p-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">Workflow Orchestration</h3>
          <p className="text-[9px] text-slate-400">Plan and execute multi-step Windows tasks with governed approvals.</p>
        </div>
        <Badge tone={dryRun ? "neutral" : "good"}>{dryRun ? "Preview" : "Live"}</Badge>
      </div>

      <label className="grid gap-1">
        <span className="text-[9px] text-slate-400">Goal or prompt</span>
        <Textarea
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-[72px] py-1.5 text-[10px]"
          placeholder='Research the current state of AI and save a report in Documents'
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !prompt.trim()} onClick={() => void suggestPlan()}>
          Suggest Plan
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy} onClick={() => setDryRun((current) => !current)}>
          {dryRun ? "Switch to Live" : "Switch to Preview"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Approver</span>
          <Input
            value={approvedBy}
            className="py-1 text-[10px]"
            onChange={(event) => setApprovedBy(event.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Token JSON</span>
          <Input
            value={approvalTokenJson}
            className="py-1 text-[10px]"
            onChange={(event) => setApprovalTokenJson(event.target.value)}
          />
        </label>
      </div>

      {parsedApprovalToken.error ? <p className="text-[9px] text-rose-300">{parsedApprovalToken.error}</p> : null}

      <div className="grid grid-cols-3 gap-2">
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !plan} onClick={() => void issueApproval()}>
          Issue Approval
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !plan} onClick={() => void executePlan()}>
          Execute Plan
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy} onClick={() => setApprovalTokenJson(emptyToken)}>
          Clear Token
        </Button>
      </div>

      <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-100">Plan Preview</p>
            <p className="text-slate-400">{suggestionSummary}</p>
          </div>
          <Badge tone={plan?.approvalRequired ? "warn" : "good"}>{plan?.family ?? "idle"}</Badge>
        </div>

        {plan ? (
          <>
            <p className="font-mono text-[8px] text-cyan-200">{plan.workflowHash.slice(0, 16)}</p>
            <div className="flex flex-wrap gap-1">
              {plan.clarificationNeeded.length > 0 ? <Badge tone="warn">Clarification needed</Badge> : null}
              <Badge tone={plan.approvalRequired ? "warn" : "good"}>
                {plan.approvalRequired ? "Approval required" : "No approval required"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Steps</p>
              {plan.steps.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-md border px-2 py-1 ${
                    activeStep === step.id ? "border-cyan-400/50 bg-cyan-500/10" : "border-slate-800 bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-100">{step.title}</span>
                    <Badge tone={formatStepStatusTone(progress?.stepResults.find((item) => item.id === step.id)?.status ?? "neutral")}>
                      {progress?.stepResults.find((item) => item.id === step.id)?.status ?? step.kind}
                    </Badge>
                  </div>
                  <p className="text-slate-400">{step.summary}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-slate-400">No workflow plan yet.</p>
        )}
      </div>

      {progress ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-100">Progress</p>
            <Badge tone={formatStepStatusTone(progress.status)}>{progress.status}</Badge>
          </div>
          <p className="mt-1 text-slate-400">{progress.summary}</p>
          {progress.artifactPaths.length > 0 ? (
            <div className="mt-1">
              <p className="text-slate-400">Artifacts</p>
              {progress.artifactPaths.map((artifactPath) => (
                <p key={artifactPath} className="font-mono text-[8px] text-cyan-200">
                  {formatArtifactLabel(artifactPath)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {lastResult ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[9px] text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-100">Last Result</p>
            <Badge tone={formatStepStatusTone(lastResult.status)}>{lastResult.status}</Badge>
          </div>
          <p className="mt-1 text-slate-400">{lastResult.summary}</p>
          {lastResult.verification ? (
            <p className={lastResult.verification.passed ? "mt-1 text-emerald-300" : "mt-1 text-amber-200"}>
              Verification: {lastResult.verification.summary}
            </p>
          ) : null}
          {lastResult.artifactPaths.length > 0 ? (
            <div className="mt-1">
              <p className="text-slate-400">Saved files</p>
              {lastResult.artifactPaths.map((artifactPath) => (
                <p key={artifactPath} className="font-mono text-[8px] text-cyan-200">
                  {artifactPath}
                </p>
              ))}
            </div>
          ) : null}
          {lastResult.compensation?.length ? (
            <div className="mt-1">
              <p className="text-slate-400">Compensation</p>
              {lastResult.compensation.map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="rounded border border-slate-800 bg-slate-950/50 p-1">
                  <p className="text-[8px] text-slate-300">{entry.summary}</p>
                  <p className="font-mono text-[8px] text-slate-500">
                    {entry.kind} | {entry.status}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {lastResult.rollback?.length ? (
            <div className="mt-1">
              <p className="text-slate-400">Rollback</p>
              {lastResult.rollback.map((rollback, index) => (
                <div key={`${rollback.kind}-${rollback.target}-${index}`} className="rounded border border-slate-800 bg-slate-950/50 p-1">
                  <p className="text-[8px] text-slate-300">{rollback.summary}</p>
                  <p className="font-mono text-[8px] text-slate-500">
                    {rollback.kind} | {rollback.target}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {statusMessage ? <p className="text-[9px] text-emerald-300">{statusMessage}</p> : null}
    </Card>
  );
}
