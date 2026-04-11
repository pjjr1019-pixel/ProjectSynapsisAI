import type {
  ActionProposal,
  ActionRequest,
  ActionResult,
  ExecutionAttempt,
  ExecutionContext,
  RiskClassification,
  SideEffectClassification,
  SkillResult,
  TaskStep,
} from '../contracts';
import {
  createActionProposal,
  createActionResult,
  createExecutionAttempt,
  nowIso,
} from '../core';
import { SkillRegistry } from '../skills/SkillRegistry';

const toExecutionAttemptStatus = (status: ActionResult['status']): ExecutionAttempt['status'] => {
  switch (status) {
    case 'executed':
      return 'executed';
    case 'simulated':
      return 'simulated';
    case 'clarification_needed':
      return 'clarification_needed';
    case 'blocked':
      return 'blocked';
    case 'denied':
      return 'denied';
    case 'escalated':
      return 'escalated';
    case 'cancelled':
      return 'cancelled';
    case 'skipped':
      return 'skipped';
    default:
      return 'failed';
  }
};

const toSkillResult = (actionResult: ActionResult): SkillResult => ({
  success: actionResult.status === 'executed' || actionResult.status === 'simulated',
  output: actionResult.output,
  error: actionResult.error,
  metadata: {
    commandId: actionResult.commandId ?? null,
    commandHash: actionResult.commandHash ?? null,
    actionResultStatus: actionResult.status,
  },
});

export const createUnsupportedActionProposal = (request: ActionRequest): ActionProposal =>
  createActionProposal({
    requestId: request.id,
    taskId: request.taskId,
    jobId: request.jobId,
    stepId: request.stepId,
    adapterId: 'missing-adapter',
    actionId: request.actionId,
    title: request.title,
    summary: `No adapter is available for ${request.kind}:${request.actionId}.`,
    preview: request.commandPreview ?? `${request.kind}:${request.actionId}`,
    normalizedInput: request.input,
    risk: request.risk,
    sideEffect: request.sideEffect,
    approvalRequired: false,
    dryRun: request.dryRun,
    capabilityStatus: 'blocked',
    bindingHash: request.bindingHash,
    approvalBinding: request.approvalBinding,
    metadata: request.metadata,
  });

const buildBlockedActionResult = (request: ActionRequest, proposal: ActionProposal, reason: string): ActionResult =>
  createActionResult({
    requestId: request.id,
    proposalId: proposal.id,
    status: 'blocked',
    summary: reason,
    commandHash: proposal.bindingHash,
    error: {
      message: reason,
      code: 'adapter-blocked',
    },
    metadata: {
      adapterId: proposal.adapterId,
    },
  });

export interface AgentActionAdapter {
  id: string;
  supports(request: ActionRequest): boolean;
  propose(request: ActionRequest, context: ExecutionContext): Promise<ActionProposal>;
  execute(proposal: ActionProposal, context: ExecutionContext): Promise<ActionResult>;
}

export interface StepExecutionOutcome {
  adapterId: string;
  skillId: string;
  input: unknown;
  result: SkillResult;
  executedAt: string;
  proposal: ActionProposal;
  actionResult: ActionResult;
  attempt: ExecutionAttempt;
}

export const resolveActionAdapter = (
  request: ActionRequest,
  adapters: AgentActionAdapter[],
): AgentActionAdapter | null => adapters.find((adapter) => adapter.supports(request)) ?? null;

export const createSkillActionAdapter = (registry: SkillRegistry): AgentActionAdapter => ({
  id: 'skill-registry',
  supports(request) {
    return request.kind === 'skill' && Boolean(registry.get(request.actionId));
  },
  async propose(request) {
    const skill = registry.get(request.actionId);

    if (!skill) {
      return createUnsupportedActionProposal(request);
    }

    let normalizedInput: unknown = request.input;
    try {
      normalizedInput = skill.inputSchema.parse(request.input);
    } catch {
      normalizedInput = request.input;
    }

    return createActionProposal({
      requestId: request.id,
      taskId: request.taskId,
      jobId: request.jobId,
      stepId: request.stepId,
      adapterId: 'skill-registry',
      actionId: skill.id,
      title: request.title,
      summary: `Prepared skill ${skill.id}.`,
      preview: request.commandPreview ?? `skill:${skill.id}`,
      normalizedInput,
      risk: request.risk,
      sideEffect: request.sideEffect,
      approvalRequired: false,
      dryRun: request.dryRun,
      capabilityStatus: 'supported',
      bindingHash: request.bindingHash,
      approvalBinding: request.approvalBinding,
      metadata: {
        ...(request.metadata ?? {}),
        skillName: skill.name,
      },
    });
  },
  async execute(proposal, context) {
    const skill = registry.get(proposal.actionId);
    if (!skill) {
      return createActionResult({
        requestId: proposal.requestId,
        proposalId: proposal.id,
        status: 'blocked',
        summary: `Skill ${proposal.actionId} is not registered.`,
        commandHash: proposal.bindingHash,
        error: {
          message: `Unknown skill: ${proposal.actionId}`,
          code: 'unknown-skill',
        },
      });
    }

    try {
      const input = skill.inputSchema.parse(proposal.normalizedInput ?? {});
      const result = skill.resultSchema.parse(await skill.execute(input, context));
      return createActionResult({
        requestId: proposal.requestId,
        proposalId: proposal.id,
        status: 'executed',
        summary: result.success
          ? `Skill ${skill.id} executed successfully.`
          : `Skill ${skill.id} reported failure.`,
        commandHash: proposal.bindingHash,
        output: result.output,
        error: result.error,
        metadata: result.metadata,
      });
    } catch (error) {
      return createActionResult({
        requestId: proposal.requestId,
        proposalId: proposal.id,
        status: 'failed',
        summary: `Skill ${skill.id} failed during execution.`,
        commandHash: proposal.bindingHash,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'skill-execution-failed',
        },
      });
    }
  },
});

export const createDefaultActionAdapters = (registry: SkillRegistry): AgentActionAdapter[] => [
  createSkillActionAdapter(registry),
];

export const createActionRequestForStep = (input: {
  taskId: string;
  jobId?: string;
  step: TaskStep;
  kind: ActionRequest['kind'];
  actionId: string;
  title: string;
  description?: string;
  executionInput: unknown;
  dryRun?: boolean;
  risk: RiskClassification;
  sideEffect: SideEffectClassification;
  commandPreview?: string;
  approvalBinding?: ActionRequest['approvalBinding'];
  metadata?: Record<string, unknown>;
}): ActionRequest => ({
  id: `action-request-${input.step.id}`,
  createdAt: input.step.createdAt,
  taskId: input.taskId,
  jobId: input.jobId,
  stepId: input.step.id,
  kind: input.kind,
  actionId: input.actionId,
  title: input.title,
  description: input.description,
  input: input.executionInput,
  dryRun: input.dryRun ?? true,
  risk: input.risk,
  sideEffect: input.sideEffect,
  commandPreview: input.commandPreview,
  bindingHash: '',
  approvalBinding: input.approvalBinding,
  metadata: input.metadata,
});

export const prepareActionProposal = async (input: {
  request: ActionRequest;
  adapters: AgentActionAdapter[];
  context: ExecutionContext;
}): Promise<{ adapter: AgentActionAdapter | null; proposal: ActionProposal }> => {
  const adapter = resolveActionAdapter(input.request, input.adapters);
  const proposal = adapter
    ? await adapter.propose(input.request, input.context)
    : createUnsupportedActionProposal(input.request);

  return {
    adapter,
    proposal,
  };
};

export const executeActionProposal = async (input: {
  request: ActionRequest;
  proposal: ActionProposal;
  adapter: AgentActionAdapter | null;
  context: ExecutionContext;
}): Promise<StepExecutionOutcome> => {
  const actionResult =
    input.proposal.capabilityStatus === 'blocked'
      ? buildBlockedActionResult(input.request, input.proposal, input.proposal.summary)
      : input.adapter
        ? await input.adapter.execute(input.proposal, input.context)
        : buildBlockedActionResult(input.request, input.proposal, input.proposal.summary);
  const attempt = createExecutionAttempt({
    jobId: input.context.jobId ?? input.request.jobId ?? input.request.taskId,
    stepId: input.request.stepId,
    status: toExecutionAttemptStatus(actionResult.status),
    request: input.request,
    proposal: input.proposal,
    actionResult,
    summary: actionResult.summary,
    metadata: {
      adapterId: input.proposal.adapterId,
    },
  });

  return {
    adapterId: input.proposal.adapterId,
    skillId: input.proposal.actionId,
    input: input.proposal.normalizedInput ?? input.request.input,
    result: toSkillResult(actionResult),
    executedAt: nowIso(),
    proposal: input.proposal,
    actionResult,
    attempt,
  };
};

export const executeActionRequest = async (input: {
  request: ActionRequest;
  adapters: AgentActionAdapter[];
  context: ExecutionContext;
}): Promise<StepExecutionOutcome> => {
  const prepared = await prepareActionProposal(input);
  return executeActionProposal({
    request: input.request,
    proposal: prepared.proposal,
    adapter: prepared.adapter,
    context: input.context,
  });
};

export const executePlannedStep = async (
  step: TaskStep,
  registry: SkillRegistry,
  context: ExecutionContext,
  adapters: AgentActionAdapter[] = createDefaultActionAdapters(registry),
): Promise<StepExecutionOutcome> => {
  const request = {
    id: createActionRequestId(step.id),
    createdAt: step.updatedAt,
    taskId: step.taskId,
    jobId: context.jobId,
    stepId: step.id,
    kind: 'skill' as const,
    actionId: step.skill,
    title: step.name,
    description: `Execute ${step.skill}`,
    input: step.input,
    dryRun: true,
    risk: 'low' as const,
    sideEffect: 'none' as const,
    commandPreview: `skill:${step.skill}`,
    bindingHash: `step-${step.id}`,
    metadata: step.metadata,
  } satisfies ActionRequest;

  return executeActionRequest({
    request,
    adapters,
    context,
  });
};

const createActionRequestId = (stepId: string): string => `action-request-${stepId}`;
