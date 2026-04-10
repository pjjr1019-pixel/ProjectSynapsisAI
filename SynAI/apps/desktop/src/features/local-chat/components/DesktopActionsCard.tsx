import { useEffect, useMemo, useState } from "react";
import type { ApprovalToken, DesktopActionProposal, DesktopActionRequest, DesktopActionResult } from "@contracts";
import {
  buildWindowsActionPreview,
  listWindowsActionDefinitions,
  suggestWindowsActionFromPrompt
} from "@governance-execution/execution/windows-action-catalog";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";

const catalog = listWindowsActionDefinitions();

const formatActionLabel = (action: DesktopActionProposal): string =>
  `${action.title} | ${action.riskClass}${action.approvalRequired ? " | approval" : ""}`;

const parseArgs = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const parsePathList = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

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

const emptyToken = "";

export function DesktopActionsCard() {
  const [selectedActionId, setSelectedActionId] = useState(catalog[0]?.id ?? "");
  const selectedAction = useMemo(
    () => catalog.find((action) => action.id === selectedActionId) ?? catalog[0] ?? null,
    [selectedActionId]
  );
  const [goalPrompt, setGoalPrompt] = useState("");
  const [target, setTarget] = useState(selectedAction?.defaultTarget ?? "");
  const [destinationTarget, setDestinationTarget] = useState("");
  const [argsText, setArgsText] = useState("");
  const [contentText, setContentText] = useState("");
  const [allowedRootsText, setAllowedRootsText] = useState("");
  const [approvedBy, setApprovedBy] = useState("qa-operator");
  const [approvalTokenJson, setApprovalTokenJson] = useState<string>(emptyToken);
  const [dryRun, setDryRun] = useState(true);
  const [forceTermination, setForceTermination] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DesktopActionResult | null>(null);
  const [rollbackResult, setRollbackResult] = useState<DesktopActionResult | null>(null);

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

  const request = useMemo<DesktopActionRequest | null>(() => {
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

  const suggestFromPrompt = (): void => {
    const suggestion = suggestWindowsActionFromPrompt(goalPrompt);
    if (!suggestion) {
      setStatusMessage("No action match found for that prompt.");
      return;
    }

    setSelectedActionId(suggestion.id);
    setTarget(suggestion.defaultTarget ?? "");
    setStatusMessage(`Suggested ${suggestion.title}.`);
  };

  const issueApproval = async (): Promise<void> => {
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
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to issue approval token.");
    } finally {
      setBusy(false);
    }
  };

  const executeAction = async (): Promise<void> => {
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
      setStatusMessage(
        result.status === "executed"
          ? "Action executed."
          : result.status === "simulated"
            ? "Action simulated."
            : result.summary
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to execute action.");
    } finally {
      setBusy(false);
    }
  };

  const rollbackLastAction = async (): Promise<void> => {
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
      const result = await window.synai.rollbackDesktopAction(
        lastResult.commandId,
        approvedBy.trim() || "qa-operator",
        dryRun
      );
      setRollbackResult(result);
      setStatusMessage(
        result.status === "executed"
          ? "Rollback executed."
          : result.status === "simulated"
            ? "Rollback simulated."
            : result.summary
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to roll back the last action.");
    } finally {
      setBusy(false);
    }
  };

  const showDestination = selectedAction?.kind === "rename-item" || selectedAction?.kind === "move-item";
  const showArgs = selectedAction?.kind === "launch-program";
  const showContent = selectedAction?.kind === "create-file";
  const showForceToggle = selectedAction?.kind === "terminate-process";

  return (
    <Card className="space-y-2 p-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">Desktop Actions</h3>
          <p className="text-[9px] text-slate-400">Governed launch, open, file, and process actions.</p>
        </div>
        <Badge tone={dryRun ? "neutral" : "good"}>{dryRun ? "Preview" : "Live"}</Badge>
      </div>

      <label className="grid gap-1">
        <span className="text-[9px] text-slate-400">Goal or prompt</span>
        <Textarea
          rows={2}
          value={goalPrompt}
          onChange={(event) => setGoalPrompt(event.target.value)}
          className="min-h-[56px] py-1.5 text-[10px]"
          placeholder="Open Add or Remove Programs, launch Notepad, create a file..."
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !goalPrompt.trim()} onClick={() => void suggestFromPrompt()}>
          Suggest Action
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy} onClick={() => setDryRun((current) => !current)}>
          {dryRun ? "Switch to Live" : "Switch to Preview"}
        </Button>
      </div>

      <label className="grid gap-1">
        <span className="text-[9px] text-slate-400">Action</span>
        <select
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
          value={selectedAction?.id ?? ""}
          onChange={(event) => setSelectedActionId(event.target.value)}
        >
          {catalog.map((action) => (
            <option key={action.id} value={action.id}>
              {formatActionLabel(action)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2 text-[9px] text-slate-300">
        {selectedAction ? (
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
            <p className="font-semibold text-slate-100">{selectedAction.title}</p>
            <p className="mt-1 text-slate-400">{selectedAction.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="neutral">{selectedAction.scope}</Badge>
              <Badge tone="neutral">{selectedAction.targetKind}</Badge>
              <Badge tone={selectedAction.approvalRequired ? "warn" : "good"}>
                {selectedAction.approvalRequired ? "Approval required" : "Low risk"}
              </Badge>
            </div>
            <p className="mt-2 font-mono text-[8px] text-cyan-200">{preview}</p>
            {selectedAction.preconditions.length > 0 ? (
              <p className="mt-2 text-slate-400">Preconditions: {selectedAction.preconditions.join(" | ")}</p>
            ) : null}
          </div>
        ) : null}

        <label className="grid gap-1">
          <span className="text-slate-400">Target</span>
          <Input
            value={target}
            placeholder={selectedAction?.targetPlaceholder ?? "Target"}
            className="py-1 text-[10px]"
            onChange={(event) => setTarget(event.target.value)}
          />
        </label>

        {showDestination ? (
          <label className="grid gap-1">
            <span className="text-slate-400">Destination</span>
            <Input
              value={destinationTarget}
              placeholder="New path or name"
              className="py-1 text-[10px]"
              onChange={(event) => setDestinationTarget(event.target.value)}
            />
          </label>
        ) : null}

        {showArgs ? (
          <label className="grid gap-1">
            <span className="text-slate-400">Program args</span>
            <Textarea
              rows={2}
              value={argsText}
              className="min-h-[56px] py-1.5 text-[10px]"
              placeholder="One arg per line or comma-separated"
              onChange={(event) => setArgsText(event.target.value)}
            />
          </label>
        ) : null}

        {showContent ? (
          <label className="grid gap-1">
            <span className="text-slate-400">File content</span>
            <Textarea
              rows={3}
              value={contentText}
              className="min-h-[72px] py-1.5 text-[10px]"
              placeholder="Optional content for the new file"
              onChange={(event) => setContentText(event.target.value)}
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-slate-400">Approved by</span>
          <Input
            value={approvedBy}
            placeholder="qa-operator"
            className="py-1 text-[10px]"
            onChange={(event) => setApprovedBy(event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-slate-400">Allowed roots</span>
          <Textarea
            rows={2}
            value={allowedRootsText}
            className="min-h-[48px] py-1.5 text-[10px]"
            placeholder="C:\\Users\\you\\Documents, C:\\Users\\you\\Desktop"
            onChange={(event) => setAllowedRootsText(event.target.value)}
          />
        </label>

        {showForceToggle ? (
          <label className="flex items-center gap-2 text-[9px] text-slate-400">
            <input
              type="checkbox"
              checked={forceTermination}
              onChange={(event) => setForceTermination(event.target.checked)}
            />
            Force termination
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-slate-400">Approval token</span>
          <Textarea
            rows={4}
            value={approvalTokenJson}
            className="min-h-[84px] py-1.5 font-mono text-[9px]"
            placeholder="Issue a token for live execution"
            onChange={(event) => setApprovalTokenJson(event.target.value)}
          />
          {parsedApprovalToken.error ? <span className="text-[9px] text-rose-300">{parsedApprovalToken.error}</span> : null}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !request} onClick={() => void issueApproval()}>
          Issue Approval
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" disabled={busy || !request} onClick={() => void executeAction()}>
          {dryRun ? "Run Preview" : "Run Live"}
        </Button>
      </div>

      {statusMessage ? <p className="text-[9px] text-cyan-200">{statusMessage}</p> : null}

      {lastResult ? (
        <div className="space-y-1 rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-100">Last result</p>
            <Badge tone={lastResult.status === "executed" ? "good" : lastResult.status === "simulated" ? "neutral" : "warn"}>
              {lastResult.status}
            </Badge>
          </div>
          <p>{lastResult.summary}</p>
          <p className="font-mono text-[8px] text-cyan-200">Preview: {lastResult.preview}</p>
          {lastResult.commandId ? <p className="font-mono text-[8px] text-slate-500">Command: {lastResult.commandId}</p> : null}
          {lastResult.commandHash ? <p className="font-mono text-[8px] text-slate-500">Hash: {lastResult.commandHash}</p> : null}
          {lastResult.verification ? (
            <p className={lastResult.verification.passed ? "text-emerald-300" : "text-amber-200"}>
              Verification: {lastResult.verification.summary}
            </p>
          ) : null}
          {lastResult.rollback ? (
            <p className="text-[8px] text-slate-400">Rollback: {lastResult.rollback.summary}</p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button
              className="py-1 text-[10px]"
              variant="ghost"
              disabled={busy || !lastResult?.commandId || !lastResult.rollback?.possible}
              onClick={() => void rollbackLastAction()}
            >
              Rollback Last
            </Button>
          </div>
        </div>
      ) : null}

      {rollbackResult ? (
        <div className="space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[9px] text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-100">Rollback Result</p>
            <Badge tone={rollbackResult.status === "executed" ? "good" : rollbackResult.status === "simulated" ? "neutral" : "warn"}>
              {rollbackResult.status}
            </Badge>
          </div>
          <p>{rollbackResult.summary}</p>
          <p className="font-mono text-[8px] text-cyan-200">Preview: {rollbackResult.preview}</p>
          {rollbackResult.commandId ? <p className="font-mono text-[8px] text-slate-500">Command: {rollbackResult.commandId}</p> : null}
          {rollbackResult.verification ? (
            <p className={rollbackResult.verification.passed ? "text-emerald-300" : "text-amber-200"}>
              Verification: {rollbackResult.verification.summary}
            </p>
          ) : null}
          {rollbackResult.rollback ? (
            <p className="text-[8px] text-slate-400">Rollback: {rollbackResult.rollback.summary}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
