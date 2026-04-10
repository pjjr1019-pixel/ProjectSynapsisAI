import type {
  ApprovalBinding,
  ActionProposal,
  ActionRequest,
  AgentTask,
  PolicyDecision,
  RiskClassification,
  SideEffectClassification,
  SkillRiskLevel,
  TaskPlan,
  TaskStep,
} from '../contracts';
import { createRuntimeId, nowIso } from '../core';

const readBoolean = (task: AgentTask, key: string): boolean => task.metadata?.[key] === true;

const readRiskLevel = (task: AgentTask): RiskClassification | null => {
  const value = task.metadata?.risk;
  return value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'critical'
    ? value
    : null;
};

const normalizeRisk = (
  risk: ActionProposal['risk'] | ActionRequest['risk'] | SkillRiskLevel | RiskClassification | null | undefined,
): RiskClassification => {
  switch (risk) {
    case 'none':
    case 'low':
    case 'medium':
    case 'high':
    case 'critical':
      return risk;
    default:
      return 'low';
  }
};

const normalizeSideEffect = (
  value: ActionProposal['sideEffect'] | ActionRequest['sideEffect'] | SideEffectClassification | null | undefined,
): SideEffectClassification => {
  switch (value) {
    case 'none':
    case 'read':
    case 'write':
    case 'ui':
    case 'system':
    case 'network':
    case 'external':
      return value;
    default:
      return 'none';
  }
};

export interface ApprovalValidationResult {
  valid: boolean;
  reason: string | null;
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalValidationInput {
  bindingHash: string;
  approvalBinding?: ApprovalBinding;
  actionRequest?: ActionRequest | null;
  actionProposal?: ActionProposal | null;
  task: AgentTask;
  step: TaskStep;
}

export type ApprovalValidator = (
  input: ApprovalValidationInput,
) => ApprovalValidationResult | Promise<ApprovalValidationResult>;

export const validateApprovalBinding = async (input: {
  bindingHash: string;
  approvalBinding?: ApprovalBinding;
  actionRequest?: ActionRequest | null;
  actionProposal?: ActionProposal | null;
  task: AgentTask;
  step: TaskStep;
  validator?: ApprovalValidator;
}): Promise<ApprovalValidationResult> => {
  const approvalBinding = input.approvalBinding ?? input.actionProposal?.approvalBinding ?? input.actionRequest?.approvalBinding;

  if (!approvalBinding?.tokenId) {
    return {
      valid: false,
      reason: 'Approval token missing.',
      code: 'APPROVAL_TOKEN_MISSING',
    };
  }

  if (approvalBinding.bindingHash !== input.bindingHash) {
    return {
      valid: false,
      reason: 'Approval binding hash mismatch.',
      code: 'APPROVAL_BINDING_HASH_MISMATCH',
    };
  }

  if (!input.validator) {
    return {
      valid: true,
      reason: null,
      code: 'APPROVAL_STRUCTURAL_MATCH',
    };
  }

  return input.validator({
    bindingHash: input.bindingHash,
    approvalBinding,
    actionRequest: input.actionRequest,
    actionProposal: input.actionProposal,
    task: input.task,
    step: input.step,
  });
};

export const evaluateTaskPolicy = (input: {
  task: AgentTask;
  step: TaskStep;
  skillRisk?: SkillRiskLevel | null;
  contextId?: string;
  actionRequest?: ActionRequest | null;
  actionProposal?: ActionProposal | null;
  plan?: TaskPlan | null;
}): PolicyDecision => {
  const risk = normalizeRisk(
    input.actionProposal?.risk ?? input.actionRequest?.risk ?? input.skillRisk ?? readRiskLevel(input.task),
  );
  const sideEffect = normalizeSideEffect(
    input.actionProposal?.sideEffect ?? input.actionRequest?.sideEffect,
  );
  const createdAt = nowIso();
  const dryRun = input.actionProposal?.dryRun ?? input.actionRequest?.dryRun ?? true;
  const approvalRequired = input.actionProposal?.approvalRequired ?? false;
  const bindingHash = input.actionProposal?.bindingHash ?? input.actionRequest?.bindingHash;

  if ((input.plan?.clarificationNeeded.length ?? 0) > 0) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: input.plan?.clarificationNeeded.join(' ') ?? 'Clarification is required before execution.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'CLARIFY_REQUIRED',
      },
    };
  }

  if (input.actionProposal?.capabilityStatus === 'blocked') {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: input.actionProposal.summary,
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'UNSUPPORTED_CAPABILITY',
      },
    };
  }

  if (readBoolean(input.task, 'policyBlock')) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: 'Task metadata requested a policy block.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'TASK_POLICY_BLOCK',
      },
    };
  }

  if (readBoolean(input.task, 'policyEscalate')) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'escalate',
      reason: 'Task metadata requested escalation.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'TASK_POLICY_ESCALATE',
      },
    };
  }

  if (risk === 'critical' && !dryRun) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: 'Critical live actions are blocked until a stronger promotion path is implemented.',
      risk,
      sideEffect,
      approvalRequired: true,
      bindingHash,
      metadata: {
        code: 'CRITICAL_LIVE_BLOCK',
      },
    };
  }

  if (approvalRequired && !dryRun && !input.actionProposal?.approvalBinding?.tokenId) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'escalate',
      reason: 'Live execution requires an approval token bound to the normalized command hash.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'APPROVAL_REQUIRED',
      },
    };
  }

  if (risk === 'high' && !dryRun && !input.actionProposal?.approvalBinding?.tokenId) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'escalate',
      reason: 'High-risk live execution requires explicit approval.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'HIGH_RISK_APPROVAL_REQUIRED',
      },
    };
  }

  if (risk === 'medium' && !dryRun && (sideEffect === 'write' || sideEffect === 'system' || sideEffect === 'external')) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: 'Medium-risk live side effects stay blocked in the foundation runtime.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'FOUNDATION_LIVE_BLOCK',
      },
    };
  }

  if (risk === 'medium' && !input.actionProposal && !input.actionRequest) {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: 'Medium-risk tasks are blocked in the foundation runtime until a normalized action proposal exists.',
      risk,
      sideEffect,
      approvalRequired,
      bindingHash,
      metadata: {
        code: 'FOUNDATION_MEDIUM_RISK_BLOCK',
      },
    };
  }

  return {
    id: createRuntimeId('policy'),
    decidedAt: createdAt,
    contextId: input.contextId ?? input.task.id,
    taskId: input.task.id,
    stepId: input.step.id,
    skillId: input.step.skill,
    type: 'allow',
    reason: dryRun
      ? 'The request is safe to execute in dry-run mode.'
      : 'The request is safe to execute.',
    risk,
    sideEffect,
    approvalRequired,
    bindingHash,
    metadata: {
      dryRun,
    },
  };
};
