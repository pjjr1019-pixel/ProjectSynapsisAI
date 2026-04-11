import {
  PROMPT_INTENT_BRIDGE_METADATA_KEY,
  PromptIntentRuntimeBridgeSchema,
  type ActionRequest,
  type AgentTask,
  type PromptIntentRuntimeBridge,
  type RiskClassification,
  type SideEffectClassification,
  type TaskPlan,
  type TaskStep,
} from '../contracts';
import { createActionRequest, createRuntimeId, createTaskPlan, nowIso } from '../core';

const getTaskMetadata = (task: AgentTask): Record<string, unknown> => task.metadata ?? {};

const getStringMetadata = (task: AgentTask, key: string): string | null => {
  const value = getTaskMetadata(task)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const getBooleanMetadata = (task: AgentTask, key: string): boolean => getTaskMetadata(task)[key] === true;

const getOperationRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const normalizeClarificationQuestions = (questions: string[]): string[] =>
  [...new Set(questions.map((value) => value.trim()).filter((value) => value.length > 0))];

const getPromptIntentBridge = (task: AgentTask): PromptIntentRuntimeBridge | null => {
  const metadata = getTaskMetadata(task);
  const parsed = PromptIntentRuntimeBridgeSchema.safeParse(metadata[PROMPT_INTENT_BRIDGE_METADATA_KEY]);
  return parsed.success ? parsed.data : null;
};

const createPlanStep = (input: {
  taskId: string;
  name: string;
  skill: string;
  input: unknown;
  phase: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}): TaskStep => ({
  id: createRuntimeId('step'),
  taskId: input.taskId,
  createdAt: input.createdAt,
  updatedAt: input.createdAt,
  status: 'pending',
  name: input.name,
  skill: input.skill,
  input: input.input,
  metadata: {
    phase: input.phase,
    ...(input.metadata ?? {}),
  },
});

const resolveSkillOperation = (task: AgentTask): {
  kind: 'skill';
  actionId: string;
  input: Record<string, unknown>;
  title: string;
  expectedEcho: string | null;
  risk: RiskClassification;
  sideEffect: SideEffectClassification;
  dryRun: boolean;
} => {
  const skillId =
    getStringMetadata(task, 'skillId') ??
    (getBooleanMetadata(task, 'policyBlock') || getBooleanMetadata(task, 'policyEscalate')
      ? 'mock_open_app'
      : 'echo_text');
  const inputText = getStringMetadata(task, 'inputText') ?? task.description ?? task.title;
  const expectedEcho = getStringMetadata(task, 'expectedEcho') ?? inputText;

  return {
    kind: 'skill',
    actionId: skillId,
    input: {
      text: inputText,
      metadata: {
        taskId: task.id,
        expectedEcho,
      },
    },
    title: `Execute ${skillId}`,
    expectedEcho,
    risk: skillId === 'mock_open_app' ? 'high' : 'low',
    sideEffect: 'none',
    dryRun: true,
  };
};

const resolveDesktopActionOperation = (task: AgentTask): {
  kind: 'desktop-action';
  actionId: string;
  input: Record<string, unknown>;
  title: string;
  expectedEcho: null;
  risk: RiskClassification;
  sideEffect: SideEffectClassification;
  dryRun: boolean;
  clarificationNeeded: string[];
} => {
  const desktopAction = getTaskMetadata(task)['desktopAction'];
  const record =
    desktopAction && typeof desktopAction === 'object' ? (desktopAction as Record<string, unknown>) : {};
  const proposalId = typeof record.proposalId === 'string' ? record.proposalId : null;
  const target = typeof record.target === 'string' ? record.target : null;
  const risk = record.riskClass;
  const dryRun = record.dryRun !== false;
  const clarificationNeeded = [
    proposalId ? null : 'Provide desktopAction.proposalId.',
    target ? null : 'Provide desktopAction.target.',
  ].filter((value): value is string => Boolean(value));

  return {
    kind: 'desktop-action',
    actionId: proposalId ?? 'desktop-action',
    input: record,
    title: proposalId ? `Execute ${proposalId}` : 'Execute desktop action',
    expectedEcho: null,
    risk:
      risk === 'none' || risk === 'low' || risk === 'medium' || risk === 'high' || risk === 'critical'
        ? risk
        : 'medium',
    sideEffect: 'system',
    dryRun,
    clarificationNeeded,
  };
};

const resolveWorkflowOperation = (task: AgentTask): {
  kind: 'workflow';
  actionId: string;
  input: Record<string, unknown>;
  title: string;
  expectedEcho: null;
  risk: RiskClassification;
  sideEffect: SideEffectClassification;
  dryRun: boolean;
  clarificationNeeded: string[];
} => {
  const workflowPrompt = getStringMetadata(task, 'workflowPrompt');
  const metadata = getTaskMetadata(task);
  const dryRun = metadata['dryRun'] !== false;

  return {
    kind: 'workflow',
    actionId: 'workflow.execute',
    input: {
      prompt: workflowPrompt,
      plan: metadata['workflowPlan'],
      approvedBy: metadata['approvedBy'],
      approvalToken: metadata['approvalToken'],
      dryRun,
    },
    title: workflowPrompt ? `Execute workflow: ${workflowPrompt}` : 'Execute workflow',
    expectedEcho: null,
    risk: 'medium',
    sideEffect: 'system',
    dryRun,
    clarificationNeeded: workflowPrompt ? [] : ['Provide workflowPrompt metadata.'],
  };
};

export interface PlannedAgentTask {
  plan: TaskPlan;
  steps: TaskStep[];
  executionStep: TaskStep;
  actionRequest: ActionRequest;
  expectedEcho: string | null;
}

export const planAgentTask = (task: AgentTask): PlannedAgentTask => {
  const createdAt = nowIso();
  const metadata = getTaskMetadata(task);
  const promptIntentBridge = getPromptIntentBridge(task);
  const operation =
    metadata['desktopAction'] !== undefined
      ? resolveDesktopActionOperation(task)
      : metadata['workflowPrompt'] !== undefined || metadata['workflowPlan'] !== undefined
        ? resolveWorkflowOperation(task)
        : resolveSkillOperation(task);

  const beforeStep = createPlanStep({
    taskId: task.id,
    name: 'Capture pre-execution observation',
    skill: 'capture_observation',
    input: {
      taskId: task.id,
      title: task.title,
    },
    phase: 'observe-before',
    createdAt,
  });
  const executionStep = createPlanStep({
    taskId: task.id,
    name: operation.title,
    skill: operation.actionId,
    input: operation.input,
    phase: 'execute',
    createdAt,
  });
  const afterStep = createPlanStep({
    taskId: task.id,
    name: 'Capture post-execution observation',
    skill: 'capture_observation',
    input: {
      taskId: task.id,
      actionId: operation.actionId,
    },
    phase: 'observe-after',
    createdAt,
  });
  const verifyStep = createPlanStep({
    taskId: task.id,
    name: 'Verify execution result',
    skill: 'verify_execution',
    input: {
      taskId: task.id,
      actionId: operation.actionId,
      expectedEcho: operation.expectedEcho,
    },
    phase: 'verify',
    createdAt,
  });
  const steps = [beforeStep, executionStep, afterStep, verifyStep];

  const operationRecord = getOperationRecord(operation.input);
  const approvalToken =
    (metadata['approvalToken'] && typeof metadata['approvalToken'] === 'object'
      ? metadata['approvalToken']
      : undefined) ??
    (operationRecord['approvalToken'] && typeof operationRecord['approvalToken'] === 'object'
      ? operationRecord['approvalToken']
      : undefined);
  const approvedBy =
    getStringMetadata(task, 'approvedBy') ??
    (typeof operationRecord['approvedBy'] === 'string' ? operationRecord['approvedBy'] : null);

  const actionRequest = createActionRequest({
    taskId: task.id,
    stepId: executionStep.id,
    kind: operation.kind,
    actionId: operation.actionId,
    title: operation.title,
    description: task.description,
    input: operation.input,
    dryRun: operation.dryRun,
    risk: operation.risk,
    sideEffect: operation.sideEffect,
    commandPreview:
      operation.kind === 'skill'
        ? `skill:${operation.actionId}`
        : operation.kind === 'workflow'
          ? `workflow:${String((operation.input as Record<string, unknown>)['prompt'] ?? operation.actionId)}`
          : `desktop-action:${operation.actionId}`,
    approvalBinding:
      approvalToken
        ? {
            bindingHash: '',
            tokenId:
              typeof (approvalToken as Record<string, unknown>)['tokenId'] === 'string'
                ? String((approvalToken as Record<string, unknown>)['tokenId'])
                : undefined,
            approvedBy: approvedBy ?? undefined,
            metadata: {
              approvalToken,
            },
          }
        : undefined,
    metadata: {
      taskTitle: task.title,
    },
  });

  const operationClarificationNeeded =
    operation.kind !== 'skill' && 'clarificationNeeded' in operation ? operation.clarificationNeeded : [];
  const bridgeClarificationNeeded =
    promptIntentBridge?.clarification.needed === true ? promptIntentBridge.clarification.questions : [];
  const clarificationNeeded = normalizeClarificationQuestions([
    ...operationClarificationNeeded,
    ...bridgeClarificationNeeded,
  ]);

  const plan = createTaskPlan({
    taskId: task.id,
    summary: `Planned ${steps.length} runtime steps for ${task.title}.`,
    status: clarificationNeeded.length > 0 ? 'clarification_needed' : 'planned',
    steps,
    clarificationNeeded,
    metadata: {
      actionRequestId: actionRequest.id,
      actionKind: operation.kind,
      promptIntentBridgeSummary: promptIntentBridge
        ? {
            intentFamily: promptIntentBridge.intentFamily,
            sourceScope: promptIntentBridge.sourceScope,
            preserveExactStructure: promptIntentBridge.outputContract.preserveExactStructure,
            clarificationNeeded: promptIntentBridge.clarification.needed,
            preferenceCount: promptIntentBridge.preferenceIds.length,
            resolvedPatternId: promptIntentBridge.resolvedPatternId ?? null,
          }
        : undefined,
    },
  });

  return {
    plan,
    steps,
    executionStep,
    actionRequest,
    expectedEcho: operation.expectedEcho,
  };
};
