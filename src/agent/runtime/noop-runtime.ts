import type {
  AgentRuntimeRunResult,
  AgentTask,
  AuditEvent as AgentAuditEvent,
  RuntimeOutcomeStatus,
  RuntimeTaskResult,
  TaskStep,
} from '../contracts';
import {
  createAgentTask,
  createExecutionContext,
  createRuntimeCheckpoint,
  createRuntimeId,
  createRuntimeJob,
  nowIso,
} from '../core';
import { createAuditEvent, InMemoryAuditStore } from '../audit';
import { createDefaultSkillRegistry, SkillRegistry } from '../skills';
import { planAgentTask } from '../planner';
import { evaluateTaskPolicy } from '../policy';
import { captureObservationSnapshot } from '../perception';
import { executePlannedStep } from '../executor';
import { buildRuntimeTaskResult, toRuntimeOutcomeStatus, verifyTaskExecution } from '../verifier';
import { persistRuntimeRunResult, type AgentRuntimeStateStore } from './runtime-state';

export type AgentTaskInput = AgentTask;
export type AgentTaskResult = RuntimeTaskResult;
export type PolicyBlock = { reason: string; code: string };

export interface AgentRuntimeOptions {
  agentId?: string;
  userId?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  skillRegistry?: SkillRegistry;
  stateStore?: AgentRuntimeStateStore;
}

const logEvent = (
  store: InMemoryAuditStore,
  input: {
    taskId: string;
    stage: AgentAuditEvent['stage'];
    event: string;
    jobId?: string;
    stepId?: string;
    details?: unknown;
    metadata?: Record<string, unknown>;
  },
): void => {
  store.emit(
    createAuditEvent({
      taskId: input.taskId,
      stage: input.stage,
      event: input.event,
      jobId: input.jobId,
      stepId: input.stepId,
      details: input.details,
      metadata: input.metadata,
    }),
  );
};

const resolveSkillRegistry = (registry?: SkillRegistry): SkillRegistry =>
  registry ?? createDefaultSkillRegistry();

const finalizeTask = (task: AgentTask, stepId: string, outcome: RuntimeOutcomeStatus): AgentTask => ({
  ...task,
  status: outcome === 'success' ? 'completed' : outcome === 'failed' ? 'failed' : 'failed',
  updatedAt: nowIso(),
  steps: task.steps.includes(stepId) ? task.steps : [...task.steps, stepId],
  metadata: {
    ...(task.metadata ?? {}),
    finalOutcome: outcome,
  },
});

const buildVerificationState = (step: TaskStep, outcome: RuntimeOutcomeStatus): TaskStep => ({
  ...step,
  status:
    outcome === 'success'
      ? 'completed'
      : outcome === 'failed'
        ? 'failed'
        : 'skipped',
  updatedAt: nowIso(),
});

export async function runAgentTask(
  taskInput: AgentTask,
  options: AgentRuntimeOptions = {},
): Promise<AgentRuntimeRunResult> {
  const task = createAgentTask(taskInput);
  const skillRegistry = resolveSkillRegistry(options.skillRegistry);
  const auditStore = new InMemoryAuditStore();
  const planned = planAgentTask(task);
  const resolvedSkill = skillRegistry.get(planned.skillId) ?? skillRegistry.get('echo_text');

  if (!resolvedSkill) {
    throw new Error('No default skill is registered.');
  }

  const plannedStep = {
    ...planned.step,
    skill: resolvedSkill.id,
    metadata: {
      ...(planned.step.metadata ?? {}),
      resolvedSkillId: resolvedSkill.id,
    },
  };

  const executionContextId = createRuntimeId('ctx');
  const job = createRuntimeJob({
    taskId: task.id,
    status: 'running',
    startedAt: nowIso(),
    stepIds: [plannedStep.id],
    metadata: {
      plannedSkillId: plannedStep.skill,
    },
  });
  const executionContext = createExecutionContext({
    id: executionContextId,
    agentId: options.agentId,
    taskId: task.id,
    jobId: job.id,
    userId: options.userId,
    environment: options.environment,
    metadata: options.metadata,
  });
  const policyDecision = evaluateTaskPolicy({
    task,
    step: plannedStep,
    skillRisk: resolvedSkill.risk,
    contextId: executionContext.id,
  });
  job.metadata = {
    ...(job.metadata ?? {}),
    policyDecision: policyDecision.type,
  };

  logEvent(auditStore, {
    taskId: task.id,
    stage: 'task',
    event: 'received',
    jobId: job.id,
    details: { title: task.title },
  });
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'planner',
    event: 'planned',
    jobId: job.id,
    stepId: plannedStep.id,
    details: {
      skillId: plannedStep.skill,
      expectedEcho: planned.expectedEcho,
    },
  });
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'policy',
    event: policyDecision.type,
    jobId: job.id,
    stepId: plannedStep.id,
    details: {
      reason: policyDecision.reason,
    },
  });

  if (policyDecision.type !== 'allow') {
    const skippedStep = buildVerificationState({ ...plannedStep, status: 'skipped' }, policyDecision.type === 'block' ? 'blocked' : 'escalated');
    const observation = captureObservationSnapshot({
      contextId: executionContext.id,
      taskId: task.id,
      jobId: job.id,
      step: skippedStep,
      policyDecision,
      execution: null,
    });
    const verification = verifyTaskExecution({
      task,
      step: skippedStep,
      policyDecision,
      execution: null,
      observation,
      expectedEcho: planned.expectedEcho,
    });
    const runtimeStatus = policyDecision.type === 'block' ? 'blocked' : 'escalated';
    const result = buildRuntimeTaskResult({
      taskId: task.id,
      policyDecision,
      verification,
      status: runtimeStatus,
    });
    job.status = runtimeStatus;
    job.finishedAt = nowIso();
    job.result = result;
    job.metadata = {
      ...(job.metadata ?? {}),
      verification: verification.status,
    };
    logEvent(auditStore, {
      taskId: task.id,
      stage: 'executor',
      event: 'skipped',
      jobId: job.id,
      stepId: skippedStep.id,
      details: {
        reason: policyDecision.reason,
      },
    });
    logEvent(auditStore, {
      taskId: task.id,
      stage: 'perception',
      event: 'captured',
      jobId: job.id,
      stepId: skippedStep.id,
      details: observation.data,
    });
    logEvent(auditStore, {
      taskId: task.id,
      stage: 'verifier',
      event: verification.status,
      jobId: job.id,
      stepId: skippedStep.id,
      details: verification.issues,
    });
    logEvent(auditStore, {
      taskId: task.id,
      stage: 'result',
      event: runtimeStatus,
      jobId: job.id,
      stepId: skippedStep.id,
      details: {
        status: runtimeStatus,
      },
    });
    const checkpoint = createRuntimeCheckpoint({
      jobId: job.id,
      state: {
        task,
        executionContext,
        job,
        step: skippedStep,
        policyDecision,
        observation,
        verification,
        result,
      },
      metadata: {
        phase: 'blocked-or-escalated',
      },
    });
    persistRuntimeRunResult(options.stateStore, { job, checkpoint });
    return {
      task: finalizeTask(task, skippedStep.id, runtimeStatus),
      executionContext,
      job,
      plannedStep: skippedStep,
      observation,
      policyDecision,
      verification,
      result,
      auditTrail: auditStore.getAll(),
      checkpoint,
    };
  }

  const executingStep: TaskStep = {
    ...plannedStep,
    status: 'in_progress',
    updatedAt: nowIso(),
  };

  const execution = await executePlannedStep(executingStep, skillRegistry, executionContext);
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'executor',
    event: 'executed',
    jobId: job.id,
    stepId: executingStep.id,
    details: {
      skillId: execution.skillId,
      success: execution.result.success,
    },
  });

  const observation = captureObservationSnapshot({
    contextId: executionContext.id,
    taskId: task.id,
    jobId: job.id,
    step: executingStep,
    policyDecision,
    execution,
  });
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'perception',
    event: 'captured',
    jobId: job.id,
    stepId: executingStep.id,
    details: observation.data,
  });

  const verification = verifyTaskExecution({
    task,
    step: executingStep,
    policyDecision,
    execution,
    observation,
    expectedEcho: planned.expectedEcho,
  });
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'verifier',
    event: verification.status,
    jobId: job.id,
    stepId: executingStep.id,
    details: verification.issues,
  });

  const runtimeStatus = toRuntimeOutcomeStatus(verification, policyDecision.type);
  const result = buildRuntimeTaskResult({
    taskId: task.id,
    policyDecision,
    verification,
    output: execution.result.output,
    status: runtimeStatus,
  });
  const finalStep = buildVerificationState({ ...executingStep, result: execution.result }, runtimeStatus);
  job.status = runtimeStatus === 'success' ? 'completed' : 'failed';
  job.finishedAt = nowIso();
  job.result = result;
  job.metadata = {
    ...(job.metadata ?? {}),
    verification: verification.status,
  };
  logEvent(auditStore, {
    taskId: task.id,
    stage: 'result',
    event: runtimeStatus === 'success' ? 'completed' : 'failed',
    jobId: job.id,
    stepId: finalStep.id,
    details: {
      status: runtimeStatus,
    },
  });
  const checkpoint = createRuntimeCheckpoint({
    jobId: job.id,
    state: {
      task,
      executionContext,
      job,
      step: finalStep,
      policyDecision,
      observation,
      verification,
      result,
    },
    metadata: {
      phase: 'completed',
    },
  });
  persistRuntimeRunResult(options.stateStore, { job, checkpoint });

  return {
    task: finalizeTask(task, finalStep.id, runtimeStatus),
    executionContext,
    job,
    plannedStep: finalStep,
    observation,
    policyDecision,
    verification,
    result,
    auditTrail: auditStore.getAll(),
    checkpoint,
  };
}

export const runNoopAgentTask = runAgentTask;
