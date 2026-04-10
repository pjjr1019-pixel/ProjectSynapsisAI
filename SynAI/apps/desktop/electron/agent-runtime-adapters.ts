import type { ApprovalToken, DesktopActionRequest, DesktopActionResult, WorkflowExecutionRequest, WorkflowExecutionResult } from "@contracts";
import type {
  ActionProposal,
  ActionRequest,
  ActionResult,
  ExecutionContext,
  RiskClassification,
} from "@agent-runtime/contracts";
import { createBindingHash, createRuntimeId, nowIso } from "@agent-runtime/core";
import type { AgentActionAdapter } from "@agent-runtime/executor";
import { buildWindowsActionPreview, findWindowsActionDefinitionById } from "@governance-execution/execution/windows-action-catalog";
import type { DesktopActionService } from "./desktop-actions";
import type { WorkflowOrchestrator } from "./workflow-orchestrator";

const mapDesktopStatus = (status: DesktopActionResult["status"]): ActionResult["status"] => {
  switch (status) {
    case "executed":
      return "executed";
    case "simulated":
      return "simulated";
    case "blocked":
      return "blocked";
    case "denied":
      return "denied";
    default:
      return "failed";
  }
};

const mapWorkflowStatus = (status: WorkflowExecutionResult["status"]): ActionResult["status"] => {
  switch (status) {
    case "executed":
      return "executed";
    case "simulated":
      return "simulated";
    case "blocked":
      return "blocked";
    case "denied":
      return "denied";
    default:
      return "failed";
  }
};

const toApprovalToken = (value: unknown): ApprovalToken | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record.tokenId === "string" &&
    typeof record.commandHash === "string" &&
    typeof record.approver === "string" &&
    typeof record.issuedAt === "string" &&
    typeof record.expiresAt === "string" &&
    typeof record.signature === "string"
    ? {
        tokenId: record.tokenId,
        commandHash: record.commandHash,
        approver: record.approver,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        signature: record.signature,
      }
    : null;
};

const createProposal = (input: Omit<ActionProposal, "id" | "createdAt">): ActionProposal => ({
  id: createRuntimeId("proposal"),
  createdAt: nowIso(),
  ...input,
});

const createResult = (input: Omit<ActionResult, "id" | "createdAt">): ActionResult => ({
  id: createRuntimeId("result"),
  createdAt: nowIso(),
  ...input,
});

export const createDesktopActionRuntimeAdapter = (
  desktopActions: Pick<DesktopActionService, "listDesktopActions" | "executeDesktopAction">,
): AgentActionAdapter => ({
  id: "synai-desktop-actions",
  supports(request) {
    return request.kind === "desktop-action";
  },
  async propose(request) {
    const input = request.input && typeof request.input === "object"
      ? (request.input as Record<string, unknown>)
      : {};
    const proposalId = typeof input.proposalId === "string" ? input.proposalId : request.actionId;
    const definition =
      desktopActions.listDesktopActions().find((entry) => entry.id === proposalId) ??
      findWindowsActionDefinitionById(proposalId);

    if (!definition) {
      return createProposal({
        requestId: request.id,
        taskId: request.taskId,
        jobId: request.jobId,
        stepId: request.stepId,
        adapterId: "synai-desktop-actions",
        actionId: proposalId,
        title: request.title,
        summary: `Desktop action ${proposalId} is not available.`,
        preview: request.commandPreview ?? `desktop-action:${proposalId}`,
        normalizedInput: input,
        risk: request.risk,
        sideEffect: request.sideEffect,
        approvalRequired: false,
        dryRun: request.dryRun,
        capabilityStatus: "blocked",
        bindingHash: request.bindingHash,
        approvalBinding: request.approvalBinding,
        metadata: request.metadata,
      });
    }

    const target = typeof input.target === "string" ? input.target : definition.defaultTarget ?? definition.targetPlaceholder;
    const destinationTarget = typeof input.destinationTarget === "string" ? input.destinationTarget : null;
    const preview = buildWindowsActionPreview(definition, {
      target,
      destinationTarget,
      args: Array.isArray(input.args) ? input.args.filter((entry): entry is string => typeof entry === "string") : undefined,
    });
    const bindingHash = createBindingHash({
      proposalId: definition.id,
      target,
      destinationTarget,
      args: input.args,
      dryRun: request.dryRun,
    });

    return createProposal({
      requestId: request.id,
      taskId: request.taskId,
      jobId: request.jobId,
      stepId: request.stepId,
      adapterId: "synai-desktop-actions",
      actionId: definition.id,
      title: definition.title,
      summary: definition.description,
      preview,
      normalizedInput: {
        ...input,
        proposalId: definition.id,
        target,
        destinationTarget,
      },
      risk: definition.riskClass as RiskClassification,
      sideEffect: request.sideEffect,
      approvalRequired: definition.approvalRequired,
      dryRun: request.dryRun,
      capabilityStatus: "supported",
      bindingHash,
      approvalBinding: request.approvalBinding
        ? {
            ...request.approvalBinding,
            bindingHash,
          }
        : undefined,
      metadata: {
        ...(request.metadata ?? {}),
        target,
      },
    });
  },
  async execute(proposal, context) {
    const input = proposal.normalizedInput && typeof proposal.normalizedInput === "object"
      ? (proposal.normalizedInput as Record<string, unknown>)
      : {};
    const approvalToken = toApprovalToken(input.approvalToken ?? proposal.approvalBinding?.metadata?.["approvalToken"]);
    const request: DesktopActionRequest = {
      proposalId: String(input.proposalId ?? proposal.actionId),
      kind: String(input.kind ?? proposal.actionId) as DesktopActionRequest["kind"],
      scope: String(input.scope ?? "workspace") as DesktopActionRequest["scope"],
      targetKind: String(input.targetKind ?? "path") as DesktopActionRequest["targetKind"],
      target: String(input.target ?? ""),
      destinationTarget: typeof input.destinationTarget === "string" ? input.destinationTarget : null,
      args: Array.isArray(input.args) ? input.args.filter((entry): entry is string => typeof entry === "string") : [],
      workingDirectory: typeof input.workingDirectory === "string" ? input.workingDirectory : null,
      workspaceRoot: typeof input.workspaceRoot === "string" ? input.workspaceRoot : null,
      allowedRoots: Array.isArray(input.allowedRoots)
        ? input.allowedRoots.filter((entry): entry is string => typeof entry === "string")
        : null,
      riskClass: String(input.riskClass ?? proposal.risk ?? "medium") as DesktopActionRequest["riskClass"],
      destructive: Boolean(input.destructive),
      dryRun: proposal.dryRun,
      approvedBy:
        typeof input.approvedBy === "string"
          ? input.approvedBy
          : proposal.approvalBinding?.approvedBy ?? context.userId ?? null,
      approvalToken,
      metadata: {
        ...(typeof input.metadata === "object" && input.metadata ? (input.metadata as Record<string, unknown>) : {}),
        runtimeBindingHash: proposal.bindingHash,
      },
    };
    const result = await desktopActions.executeDesktopAction(request);

    return createResult({
      requestId: proposal.requestId,
      proposalId: proposal.id,
      status: mapDesktopStatus(result.status),
      summary: result.summary,
      commandId: result.commandId ?? undefined,
      commandHash: result.commandHash ?? proposal.bindingHash,
      output: result,
      rollback: result.rollback ?? undefined,
      error: result.error
        ? {
            message: result.error,
            code: "desktop-action-failed",
          }
        : undefined,
      metadata: {
        adapterId: "synai-desktop-actions",
      },
    });
  },
});

export const createWorkflowRuntimeAdapter = (
  workflowOrchestrator: Pick<WorkflowOrchestrator, "suggestWorkflow" | "executeWorkflow">,
): AgentActionAdapter => ({
  id: "synai-workflow-orchestrator",
  supports(request) {
    return request.kind === "workflow";
  },
  async propose(request) {
    const input = request.input && typeof request.input === "object"
      ? (request.input as Record<string, unknown>)
      : {};
    const prompt = typeof input.prompt === "string" ? input.prompt : "";
    if (!prompt.trim()) {
      return createProposal({
        requestId: request.id,
        taskId: request.taskId,
        jobId: request.jobId,
        stepId: request.stepId,
        adapterId: "synai-workflow-orchestrator",
        actionId: request.actionId,
        title: request.title,
        summary: "Workflow execution requires a prompt.",
        preview: request.commandPreview ?? "workflow:missing-prompt",
        normalizedInput: input,
        risk: request.risk,
        sideEffect: request.sideEffect,
        approvalRequired: false,
        dryRun: request.dryRun,
        capabilityStatus: "blocked",
        bindingHash: request.bindingHash,
        approvalBinding: request.approvalBinding,
        metadata: request.metadata,
      });
    }

    const suggestedPlan =
      input.plan && typeof input.plan === "object"
        ? (input.plan as WorkflowExecutionRequest["plan"])
        : await workflowOrchestrator.suggestWorkflow(prompt);
    const bindingHash = suggestedPlan?.workflowHash ?? request.bindingHash;
    const approvalRequired = suggestedPlan?.approvalRequired ?? false;

    return createProposal({
      requestId: request.id,
      taskId: request.taskId,
      jobId: request.jobId,
      stepId: request.stepId,
      adapterId: "synai-workflow-orchestrator",
      actionId: request.actionId,
      title: prompt,
      summary: suggestedPlan?.summary ?? "Workflow plan prepared.",
      preview: suggestedPlan?.summary ?? prompt,
      normalizedInput: {
        ...input,
        prompt,
        plan: suggestedPlan,
      },
      risk: approvalRequired ? "high" : request.risk,
      sideEffect: request.sideEffect,
      approvalRequired,
      dryRun: request.dryRun,
      capabilityStatus:
        (suggestedPlan?.clarificationNeeded.length ?? 0) > 0 ? "blocked" : "supported",
      bindingHash,
      approvalBinding: request.approvalBinding
        ? {
            ...request.approvalBinding,
            bindingHash,
          }
        : undefined,
      metadata: {
        ...(request.metadata ?? {}),
        workflowFamily: suggestedPlan?.family ?? null,
      },
    });
  },
  async execute(proposal, context) {
    const input = proposal.normalizedInput && typeof proposal.normalizedInput === "object"
      ? (proposal.normalizedInput as Record<string, unknown>)
      : {};
    const request: WorkflowExecutionRequest = {
      prompt: String(input.prompt ?? ""),
      plan: (input.plan as WorkflowExecutionRequest["plan"]) ?? null,
      dryRun: proposal.dryRun,
      approvedBy:
        typeof input.approvedBy === "string"
          ? input.approvedBy
          : proposal.approvalBinding?.approvedBy ?? context.userId ?? null,
      approvalToken: toApprovalToken(input.approvalToken ?? proposal.approvalBinding?.metadata?.["approvalToken"]),
    };
    const result = await workflowOrchestrator.executeWorkflow(request);

    return createResult({
      requestId: proposal.requestId,
      proposalId: proposal.id,
      status: mapWorkflowStatus(result.status),
      summary: result.summary,
      commandId: result.commandId ?? undefined,
      commandHash: result.commandHash ?? proposal.bindingHash,
      output: result,
      rollback: result.rollback?.[0] ?? undefined,
      compensation: result.compensation?.map((entry, index) => ({
        id: `workflow-compensation-${index}`,
        createdAt: nowIso(),
        status:
          entry.status === "executed" || entry.status === "simulated" || entry.status === "blocked" || entry.status === "failed" || entry.status === "skipped"
            ? entry.status
            : "failed",
        summary: entry.summary,
        details: entry,
      })),
      error: result.error
        ? {
            message: result.error,
            code: "workflow-execution-failed",
          }
        : undefined,
      metadata: {
        adapterId: "synai-workflow-orchestrator",
        workflowHash: result.workflowHash,
      },
    });
  },
});
