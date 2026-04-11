import type {
  AgentRuntimeInspection,
  AgentRuntimeRunResult,
  AgentTask,
  AuditEvent,
  ExecutionAttempt,
  ExecutionContext,
  ObservationSnapshot,
  PolicyDecision,
  RuntimeContinuation,
  RuntimeCheckpoint,
  RuntimeJob,
  RuntimeJobStatus,
  RuntimeProgressEvent,
  RuntimeTaskResult,
  TaskPlan,
  TaskStep,
  VerificationReport,
} from '../contracts';
import { createAuditEvent, InMemoryAuditStore, type AuditStore } from '../audit';
import {
  cloneValue,
  createActionResult,
  createAgentTask,
  createExecutionAttempt,
  createExecutionContext,
  createObservationEvidence,
  createObservationSnapshot,
  createRuntimeCheckpoint,
  createRuntimeId,
  createRuntimeJob,
  createRuntimeProgressEvent,
  nowIso,
} from '../core';
import {
  createDefaultActionAdapters,
  executeActionProposal,
  prepareActionProposal,
  type AgentActionAdapter,
} from '../executor';
import { captureObservationSnapshot } from '../perception';
import { planAgentTask } from '../planner';
import { evaluateTaskPolicy, type ApprovalValidator, validateApprovalBinding } from '../policy';
import { createDefaultSkillRegistry, SkillRegistry } from '../skills';
import type { AgentRuntimeStateStore } from './runtime-state';
import { buildRuntimeTaskResult, toRuntimeOutcomeStatus, verifyTaskExecution } from '../verifier';

export interface AgentRuntimeOptions {
  agentId?: string;
  userId?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  skillRegistry?: SkillRegistry;
  actionAdapters?: AgentActionAdapter[];
  stateStore?: AgentRuntimeStateStore;
  auditStore?: AuditStore;
  validateApproval?: ApprovalValidator;
  emitProgress?: (event: RuntimeProgressEvent) => void;
}

export interface AgentRuntimeService {
  runTask(taskInput: AgentTask, options?: AgentRuntimeOptions): Promise<AgentRuntimeRunResult>;
  startTask(taskInput: AgentTask, options?: AgentRuntimeOptions): Promise<AgentRuntimeRunResult>;
  listJobs(): Promise<RuntimeJob[]>;
  inspectJob(jobId: string): Promise<AgentRuntimeInspection | null>;
  cancelJob(jobId: string): Promise<AgentRuntimeInspection | null>;
  resumeJob(jobId: string, options?: AgentRuntimeOptions): Promise<AgentRuntimeRunResult | null>;
  recoverJob(jobId: string): Promise<AgentRuntimeInspection | null>;
}

const cloneStep = (step: TaskStep): TaskStep => cloneValue(step);

const updateStepStatus = (
  step: TaskStep,
  status: TaskStep['status'],
  patch: Partial<Pick<TaskStep, 'result' | 'error' | 'metadata'>> = {},
): TaskStep => ({
  ...step,
  status,
  updatedAt: nowIso(),
  result: patch.result ?? step.result,
  error: patch.error ?? step.error,
  metadata: {
    ...(step.metadata ?? {}),
    ...(patch.metadata ?? {}),
  },
});

const resolveTaskStatus = (resultStatus: RuntimeTaskResult['status']): AgentTask['status'] => {
  switch (resultStatus) {
    case 'success':
    case 'skipped':
      return 'completed';
    case 'clarification_needed':
      return 'pending';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
};

const resolveJobStatus = (resultStatus: RuntimeTaskResult['status']): RuntimeJobStatus => {
  switch (resultStatus) {
    case 'success':
    case 'skipped':
      return 'completed';
    case 'blocked':
      return 'blocked';
    case 'clarification_needed':
      return 'clarification_needed';
    case 'denied':
      return 'denied';
    case 'escalated':
      return 'escalated';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
};

const getLatestCheckpointState = (checkpoint: RuntimeCheckpoint | undefined): Record<string, unknown> =>
  checkpoint?.state ?? {};

const extractInspectionState = (checkpoint: RuntimeCheckpoint | undefined): {
  task?: AgentTask;
  executionContext?: ExecutionContext;
  plan?: TaskPlan;
  plannedSteps?: TaskStep[];
  executionAttempts?: ExecutionAttempt[];
  observations?: ObservationSnapshot[];
  policyDecision?: PolicyDecision;
  verification?: VerificationReport;
  result?: RuntimeTaskResult;
} => {
  const state = getLatestCheckpointState(checkpoint);
  return {
    task: state['task'] as AgentTask | undefined,
    executionContext: state['executionContext'] as ExecutionContext | undefined,
    plan: state['plan'] as TaskPlan | undefined,
    plannedSteps: state['plannedSteps'] as TaskStep[] | undefined,
    executionAttempts: state['executionAttempts'] as ExecutionAttempt[] | undefined,
    observations: state['observations'] as ObservationSnapshot[] | undefined,
    policyDecision: state['policyDecision'] as PolicyDecision | undefined,
    verification: state['verification'] as VerificationReport | undefined,
    result: state['result'] as RuntimeTaskResult | undefined,
  };
};

const createInitialObservation = (input: {
  task: AgentTask;
  job: RuntimeJob;
  executionContext: ExecutionContext;
  plan: TaskPlan;
  step: TaskStep;
}): ObservationSnapshot =>
  createObservationSnapshot({
    contextId: input.executionContext.id,
    taskId: input.task.id,
    jobId: input.job.id,
    stepId: input.step.id,
    data: {
      taskId: input.task.id,
      title: input.task.title,
      planId: input.plan.id,
      stepCount: input.plan.steps.length,
    },
    evidence: [
      createObservationEvidence({
        label: 'Task input',
        summary: input.task.title,
        source: 'task',
        provenance: {
          sourceType: 'task',
          sourceId: input.task.id,
          capturedBy: 'runtime-manager',
        },
        data: input.task,
      }),
      createObservationEvidence({
        label: 'Plan summary',
        summary: input.plan.summary,
        source: 'plan',
        provenance: {
          sourceType: 'plan',
          sourceId: input.plan.id,
          capturedBy: 'runtime-manager',
        },
        data: {
          clarificationNeeded: input.plan.clarificationNeeded,
          stepCount: input.plan.steps.length,
        },
      }),
    ],
    metadata: {
      phase: 'observe-before',
      status: input.step.status,
    },
  });

const resolveAuditEvents = async (
  store: AuditStore,
  jobId: string,
  taskId: string,
): Promise<AuditEvent[]> => {
  const queried = await Promise.resolve(store.query({ jobId }));
  if (queried.length > 0) {
    return queried;
  }

  return Promise.resolve(store.query({ taskId }));
};

const resolveAuditStore = (auditStore?: AuditStore): AuditStore => auditStore ?? new InMemoryAuditStore();

const resolveSkillRegistry = (registry?: SkillRegistry): SkillRegistry =>
  registry ?? createDefaultSkillRegistry();

const resolveActionAdapters = (registry: SkillRegistry, adapters?: AgentActionAdapter[]): AgentActionAdapter[] => {
  const defaults = createDefaultActionAdapters(registry);
  if (!adapters || adapters.length === 0) {
    return defaults;
  }

  return [
    ...adapters,
    ...defaults.filter((adapter) => !adapters.some((candidate) => candidate.id === adapter.id)),
  ];
};

const appendAudit = async (
  store: AuditStore,
  job: RuntimeJob,
  event: Omit<Parameters<typeof createAuditEvent>[0], 'taskId'> & { taskId: string },
): Promise<AuditEvent> => {
  const auditEvent = createAuditEvent(event);
  await Promise.resolve(store.emit(auditEvent));
  job.auditEventIds = [...job.auditEventIds, auditEvent.id];
  return auditEvent;
};

const emitProgressEvent = (
  options: AgentRuntimeOptions,
  input: {
    taskId: string;
    jobId: string;
    status: RuntimeJobStatus;
    currentStepId: string | null;
    currentStepIndex: number;
    stepCount: number;
    completedStepIds: string[];
    checkpointId?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
): RuntimeProgressEvent => {
  const event = createRuntimeProgressEvent(input);
  options.emitProgress?.(event);
  return event;
};

const createCheckpointContinuation = (
  sourceCheckpointId: string,
  limitation: string,
  mode: RuntimeContinuation['mode'] = 'reconstructed',
): RuntimeContinuation => ({
  mode,
  resumable: false,
  sourceCheckpointId,
  limitation,
});

const buildInspection = async (
  stateStore: AgentRuntimeStateStore | undefined,
  auditStore: AuditStore,
  jobId: string,
): Promise<AgentRuntimeInspection | null> => {
  if (!stateStore) {
    return null;
  }

  const job = await Promise.resolve(stateStore.getJob(jobId));
  if (!job) {
    return null;
  }

  const checkpoints = await Promise.resolve(stateStore.listCheckpoints(jobId));
  const latestCheckpoint = checkpoints[checkpoints.length - 1];
  const extracted = extractInspectionState(latestCheckpoint);
  const auditTrail = await resolveAuditEvents(auditStore, jobId, job.taskId);

  return {
    job,
    task: extracted.task,
    executionContext: extracted.executionContext,
    plan: extracted.plan,
    plannedSteps: extracted.plannedSteps ?? [],
    executionAttempts: extracted.executionAttempts ?? [],
    latestObservation: extracted.observations?.[extracted.observations.length - 1],
    observations: extracted.observations ?? [],
    policyDecision: extracted.policyDecision,
    verification: extracted.verification,
    result: extracted.result,
    latestCheckpoint,
    checkpoints,
    auditTrail,
  };
};

const createSkippedVerification = (input: {
  taskId: string;
  jobId: string;
  stepId: string;
  observationId: string;
  evidenceIds: string[];
  summary: string;
  code: string;
  metadata?: Record<string, unknown>;
}): VerificationReport => ({
  id: createRuntimeId('verification'),
  createdAt: nowIso(),
  taskId: input.taskId,
  jobId: input.jobId,
  stepId: input.stepId,
  observationId: input.observationId,
  status: 'skipped',
  summary: input.summary,
  issues: [
    {
      message: input.summary,
      code: input.code,
    },
  ],
  evidenceIds: input.evidenceIds,
  metadata: input.metadata,
});

const createServiceMethods = (baseOptions: AgentRuntimeOptions = {}): AgentRuntimeService => {
  const runTask = async (
    taskInput: AgentTask,
    callOptions: AgentRuntimeOptions = {},
  ): Promise<AgentRuntimeRunResult> => {
    const options: AgentRuntimeOptions = {
      ...baseOptions,
      ...callOptions,
    };
    const task = createAgentTask(taskInput);
    const auditStore = resolveAuditStore(options.auditStore);
    const skillRegistry = resolveSkillRegistry(options.skillRegistry);
    const actionAdapters = resolveActionAdapters(skillRegistry, options.actionAdapters);
    const planned = planAgentTask(task);
    const plannedSteps = planned.steps.map((step) => cloneStep(step));
    const executionStepIndex = plannedSteps.findIndex((step) => step.id === planned.executionStep.id);
    const executionStep = cloneStep(plannedSteps[executionStepIndex]);
    const job = createRuntimeJob({
      taskId: task.id,
      planId: planned.plan.id,
      status: 'running',
      startedAt: nowIso(),
      activeStepId: plannedSteps[0]?.id,
      stepIds: plannedSteps.map((step) => step.id),
      metadata: {
        actionRequestId: planned.actionRequest.id,
        actionKind: planned.actionRequest.kind,
      },
    });
    const executionContext = createExecutionContext({
      id: createRuntimeId('ctx'),
      agentId: options.agentId,
      taskId: task.id,
      jobId: job.id,
      userId: options.userId,
      environment: options.environment,
      metadata: options.metadata,
    });

    await appendAudit(auditStore, job, {
      taskId: task.id,
      stage: 'runtime',
      event: 'started',
      jobId: job.id,
      details: { taskTitle: task.title },
    });
    await appendAudit(auditStore, job, {
      taskId: task.id,
      stage: 'planner',
      event: 'planned',
      jobId: job.id,
      stepId: executionStep.id,
      details: {
        planId: planned.plan.id,
        stepCount: plannedSteps.length,
        clarificationNeeded: planned.plan.clarificationNeeded,
      },
    });

    const beforeStep = updateStepStatus(plannedSteps[0], 'completed');
    plannedSteps[0] = beforeStep;
    job.completedStepIds = [beforeStep.id];
    const beforeObservation = createInitialObservation({
      task,
      job,
      executionContext,
      plan: planned.plan,
      step: beforeStep,
    });
    const observations: ObservationSnapshot[] = [beforeObservation];

    emitProgressEvent(options, {
      taskId: task.id,
      jobId: job.id,
      status: job.status,
      currentStepId: beforeStep.id,
      currentStepIndex: 0,
      stepCount: plannedSteps.length,
      completedStepIds: job.completedStepIds,
      summary: 'Captured initial observation.',
    });

    const actionRequest = {
      ...planned.actionRequest,
      jobId: job.id,
      metadata: {
        ...(planned.actionRequest.metadata ?? {}),
        resumedFromJobId: task.metadata?.['resumeOf'] ?? null,
      },
    };
    let executionAttempts: ExecutionAttempt[] = [];
    let verification: VerificationReport | null = null;
    let result: RuntimeTaskResult | null = null;
    let finalObservation: ObservationSnapshot | null = null;
    let policyDecision: PolicyDecision | null = null;

    if (planned.plan.status === 'clarification_needed') {
      const clarificationSummary =
        planned.plan.clarificationNeeded.join(' ') || 'Clarification is required before execution.';
      const clarificationStep = updateStepStatus(executionStep, 'skipped', {
        error: {
          message: clarificationSummary,
          code: 'clarification-needed',
        },
      });
      plannedSteps[executionStepIndex] = clarificationStep;
      policyDecision = {
        id: createRuntimeId('policy'),
        decidedAt: nowIso(),
        contextId: executionContext.id,
        taskId: task.id,
        stepId: clarificationStep.id,
        skillId: clarificationStep.skill,
        type: 'allow',
        reason: 'Policy evaluation skipped because clarification is required before execution.',
        risk: actionRequest.risk,
        sideEffect: actionRequest.sideEffect,
        approvalRequired: false,
        bindingHash: actionRequest.bindingHash,
        metadata: {
          code: 'POLICY_SKIPPED_CLARIFICATION',
          clarificationNeeded: planned.plan.clarificationNeeded,
        },
      };

      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'planner',
        event: 'clarification_needed',
        jobId: job.id,
        stepId: clarificationStep.id,
        details: {
          clarificationNeeded: planned.plan.clarificationNeeded,
        },
      });
      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'policy',
        event: 'skipped',
        jobId: job.id,
        stepId: clarificationStep.id,
        details: {
          reason: policyDecision.reason,
        },
      });
      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'executor',
        event: 'skipped',
        jobId: job.id,
        stepId: clarificationStep.id,
        details: {
          reason: clarificationSummary,
        },
      });

      finalObservation = captureObservationSnapshot({
        contextId: executionContext.id,
        taskId: task.id,
        jobId: job.id,
        step: clarificationStep,
        policyDecision,
        execution: null,
      });
      observations.push(finalObservation);
      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'perception',
        event: 'captured',
        jobId: job.id,
        stepId: clarificationStep.id,
        details: {
          observationId: finalObservation.id,
        },
      });

      verification = createSkippedVerification({
        taskId: task.id,
        jobId: job.id,
        stepId: clarificationStep.id,
        observationId: finalObservation.id,
        evidenceIds: finalObservation.evidence.map((entry) => entry.id),
        summary: 'Verification skipped because clarification is required before execution.',
        code: 'clarification-needed',
        metadata: {
          clarificationNeeded: planned.plan.clarificationNeeded,
        },
      });
      const verifyStepIndex = executionStepIndex + 2;
      plannedSteps[verifyStepIndex] = updateStepStatus(plannedSteps[verifyStepIndex], 'skipped', {
        result: verification,
        metadata: {
          skippedForClarification: true,
        },
      });
      job.completedStepIds = [...job.completedStepIds, plannedSteps[verifyStepIndex].id];
      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'verifier',
        event: verification.status,
        jobId: job.id,
        stepId: plannedSteps[verifyStepIndex].id,
        details: {
          summary: verification.summary,
        },
      });

      result = buildRuntimeTaskResult({
        taskId: task.id,
        policyDecision,
        verification,
        status: 'clarification_needed',
        summary: clarificationSummary,
        clarificationNeeded: planned.plan.clarificationNeeded,
      });
    } else {
      const prepared = await prepareActionProposal({
        request: actionRequest,
        adapters: actionAdapters,
        context: executionContext,
      });
      policyDecision = evaluateTaskPolicy({
        task,
        step: executionStep,
        contextId: executionContext.id,
        actionRequest,
        actionProposal: prepared.proposal,
        plan: planned.plan,
      });

      await appendAudit(auditStore, job, {
        taskId: task.id,
        stage: 'policy',
        event: policyDecision.type,
        jobId: job.id,
        stepId: executionStep.id,
        details: {
          reason: policyDecision.reason,
          bindingHash: policyDecision.bindingHash,
        },
      });

      if (policyDecision.type !== 'allow') {
        const blockedAttempt = createExecutionAttempt({
          jobId: job.id,
          stepId: executionStep.id,
          status: policyDecision.type === 'block' ? 'blocked' : 'escalated',
          request: actionRequest,
          proposal: prepared.proposal,
          summary: policyDecision.reason,
          metadata: {
            policyDecision: policyDecision.type,
          },
        });
        executionAttempts = [blockedAttempt];
        job.attemptIds = [blockedAttempt.id];
        const blockedStep = updateStepStatus(
          executionStep,
          'skipped',
          {
            error: {
              message: policyDecision.reason,
              code: policyDecision.type === 'block' ? 'policy-block' : 'policy-escalate',
            },
          },
        );
        plannedSteps[executionStepIndex] = blockedStep;
        finalObservation = captureObservationSnapshot({
          contextId: executionContext.id,
          taskId: task.id,
          jobId: job.id,
          step: blockedStep,
          policyDecision,
          execution: null,
        });
        observations.push(finalObservation);
        await appendAudit(auditStore, job, {
          taskId: task.id,
          stage: 'executor',
          event: 'skipped',
          jobId: job.id,
          stepId: blockedStep.id,
          details: {
            reason: policyDecision.reason,
          },
        });
        await appendAudit(auditStore, job, {
          taskId: task.id,
          stage: 'perception',
          event: 'captured',
          jobId: job.id,
          stepId: blockedStep.id,
          details: {
            observationId: finalObservation.id,
          },
        });
        verification = verifyTaskExecution({
          task,
          step: blockedStep,
          policyDecision,
          execution: null,
          observation: finalObservation,
          expectedEcho: planned.expectedEcho,
        });
        await appendAudit(auditStore, job, {
          taskId: task.id,
          stage: 'verifier',
          event: verification.status,
          jobId: job.id,
          stepId: blockedStep.id,
          details: {
            summary: verification.summary,
          },
        });
        result = buildRuntimeTaskResult({
          taskId: task.id,
          policyDecision,
          verification,
          status: policyDecision.type === 'block' ? 'blocked' : 'escalated',
          summary: policyDecision.reason,
        });
      } else {
        const approvalValidationRequired =
          !prepared.proposal.dryRun &&
          (prepared.proposal.approvalRequired || Boolean(prepared.proposal.approvalBinding?.tokenId));

        if (approvalValidationRequired) {
          const approvalValidation = await validateApprovalBinding({
            bindingHash: prepared.proposal.bindingHash,
            approvalBinding: prepared.proposal.approvalBinding,
            actionRequest,
            actionProposal: prepared.proposal,
            task,
            step: executionStep,
            validator: options.validateApproval,
          });

          if (!approvalValidation.valid) {
            const denialReason = approvalValidation.reason ?? 'Approval validation failed.';
            const deniedActionResult = createActionResult({
              requestId: actionRequest.id,
              proposalId: prepared.proposal.id,
              status: 'denied',
              summary: denialReason,
              commandHash: prepared.proposal.bindingHash,
              error: {
                message: denialReason,
                code: approvalValidation.code ?? 'approval-validation-denied',
              },
              metadata: {
                adapterId: prepared.proposal.adapterId,
                approvalValidation: approvalValidation.metadata,
              },
            });
            const deniedAttempt = createExecutionAttempt({
              jobId: job.id,
              stepId: executionStep.id,
              status: 'denied',
              request: actionRequest,
              proposal: prepared.proposal,
              actionResult: deniedActionResult,
              summary: deniedActionResult.summary,
              metadata: {
                adapterId: prepared.proposal.adapterId,
                code: approvalValidation.code ?? 'approval-validation-denied',
              },
            });
            const deniedExecution = {
              adapterId: prepared.proposal.adapterId,
              skillId: prepared.proposal.actionId,
              input: prepared.proposal.normalizedInput ?? actionRequest.input,
              result: {
                success: false,
                error: deniedActionResult.error,
                metadata: {
                  actionResultStatus: deniedActionResult.status,
                  commandHash: deniedActionResult.commandHash ?? null,
                },
              },
              executedAt: nowIso(),
              proposal: prepared.proposal,
              actionResult: deniedActionResult,
              attempt: deniedAttempt,
            };

            executionAttempts = [deniedAttempt];
            job.attemptIds = [deniedAttempt.id];
            const deniedStep = updateStepStatus(executionStep, 'skipped', {
              result: deniedActionResult,
              error: deniedActionResult.error,
              metadata: {
                adapterId: prepared.proposal.adapterId,
                deniedByPolicy: true,
              },
            });
            plannedSteps[executionStepIndex] = deniedStep;
            policyDecision = {
              ...policyDecision,
              reason: denialReason,
              metadata: {
                ...(policyDecision.metadata ?? {}),
                code: approvalValidation.code ?? 'APPROVAL_VALIDATION_DENIED',
                approvalValidation: approvalValidation.metadata,
              },
            };

            await appendAudit(auditStore, job, {
              taskId: task.id,
              stage: 'policy',
              event: 'denied',
              jobId: job.id,
              stepId: deniedStep.id,
              details: {
                reason: denialReason,
                bindingHash: prepared.proposal.bindingHash,
                code: approvalValidation.code ?? null,
              },
            });
            await appendAudit(auditStore, job, {
              taskId: task.id,
              stage: 'executor',
              event: 'skipped',
              jobId: job.id,
              stepId: deniedStep.id,
              details: {
                reason: denialReason,
                code: approvalValidation.code ?? null,
              },
            });

            finalObservation = captureObservationSnapshot({
              contextId: executionContext.id,
              taskId: task.id,
              jobId: job.id,
              step: deniedStep,
              policyDecision,
              execution: deniedExecution,
            });
            observations.push(finalObservation);
            await appendAudit(auditStore, job, {
              taskId: task.id,
              stage: 'perception',
              event: 'captured',
              jobId: job.id,
              stepId: deniedStep.id,
              details: {
                observationId: finalObservation.id,
              },
            });

            verification = verifyTaskExecution({
              task,
              step: deniedStep,
              policyDecision,
              execution: deniedExecution,
              observation: finalObservation,
              expectedEcho: planned.expectedEcho,
            });
            const verifyStepIndex = executionStepIndex + 2;
            plannedSteps[verifyStepIndex] = updateStepStatus(
              plannedSteps[verifyStepIndex],
              'failed',
              {
                result: verification,
              },
            );
            job.completedStepIds = [...job.completedStepIds, plannedSteps[verifyStepIndex].id];
            await appendAudit(auditStore, job, {
              taskId: task.id,
              stage: 'verifier',
              event: verification.status,
              jobId: job.id,
              stepId: plannedSteps[verifyStepIndex].id,
              details: {
                summary: verification.summary,
                issueCount: verification.issues.length,
              },
            });

            result = buildRuntimeTaskResult({
              taskId: task.id,
              policyDecision,
              verification,
              status: 'denied',
              lastAttemptId: deniedAttempt.id,
              summary: deniedActionResult.summary,
              denial: {
                reason: denialReason,
                code: approvalValidation.code ?? 'APPROVAL_VALIDATION_DENIED',
              },
            });
          }
        }

        if (!result) {
          const inProgressStep = updateStepStatus(executionStep, 'in_progress');
          plannedSteps[executionStepIndex] = inProgressStep;
          emitProgressEvent(options, {
            taskId: task.id,
            jobId: job.id,
            status: job.status,
            currentStepId: inProgressStep.id,
            currentStepIndex: executionStepIndex,
            stepCount: plannedSteps.length,
            completedStepIds: job.completedStepIds,
            summary: `Executing ${prepared.proposal.actionId}.`,
          });
          await appendAudit(auditStore, job, {
            taskId: task.id,
            stage: 'executor',
            event: 'started',
            jobId: job.id,
            stepId: inProgressStep.id,
            details: {
              adapterId: prepared.proposal.adapterId,
              preview: prepared.proposal.preview,
            },
          });

          const execution = await executeActionProposal({
            request: actionRequest,
            proposal: prepared.proposal,
            adapter: prepared.adapter,
            context: executionContext,
          });
          executionAttempts = [execution.attempt];
          job.attemptIds = [execution.attempt.id];
          const stepStatus =
            execution.actionResult.status === 'executed' || execution.actionResult.status === 'simulated'
              ? 'completed'
              : execution.actionResult.status === 'failed'
                ? 'failed'
                : 'skipped';
          const executedStep = updateStepStatus(inProgressStep, stepStatus, {
            result: execution.actionResult,
            error: execution.actionResult.error,
            metadata: {
              adapterId: execution.adapterId,
            },
          });
          plannedSteps[executionStepIndex] = executedStep;
          job.completedStepIds = [...job.completedStepIds, executedStep.id];

          await appendAudit(auditStore, job, {
            taskId: task.id,
            stage: 'executor',
            event: execution.actionResult.status,
            jobId: job.id,
            stepId: executedStep.id,
            details: {
              adapterId: execution.adapterId,
              summary: execution.actionResult.summary,
            },
          });

          const afterStepIndex = executionStepIndex + 1;
          const afterStep = updateStepStatus(plannedSteps[afterStepIndex], 'completed');
          plannedSteps[afterStepIndex] = afterStep;
          job.completedStepIds = [...job.completedStepIds, afterStep.id];

          finalObservation = captureObservationSnapshot({
            contextId: executionContext.id,
            taskId: task.id,
            jobId: job.id,
            step: executedStep,
            policyDecision,
            execution,
          });
          observations.push(finalObservation);
          await appendAudit(auditStore, job, {
            taskId: task.id,
            stage: 'perception',
            event: 'captured',
            jobId: job.id,
            stepId: afterStep.id,
            details: {
              observationId: finalObservation.id,
              evidenceCount: finalObservation.evidence.length,
            },
          });

          verification = verifyTaskExecution({
            task,
            step: executedStep,
            policyDecision,
            execution,
            observation: finalObservation,
            expectedEcho: planned.expectedEcho,
          });
          const verifyStepIndex = executionStepIndex + 2;
          plannedSteps[verifyStepIndex] = updateStepStatus(
            plannedSteps[verifyStepIndex],
            verification.status === 'passed' ? 'completed' : verification.status === 'failed' ? 'failed' : 'skipped',
            {
              result: verification,
            },
          );
          job.completedStepIds = [...job.completedStepIds, plannedSteps[verifyStepIndex].id];
          await appendAudit(auditStore, job, {
            taskId: task.id,
            stage: 'verifier',
            event: verification.status,
            jobId: job.id,
            stepId: plannedSteps[verifyStepIndex].id,
            details: {
              summary: verification.summary,
              issueCount: verification.issues.length,
            },
          });

          const runtimeStatus = toRuntimeOutcomeStatus(verification, policyDecision.type, execution);
          result = buildRuntimeTaskResult({
            taskId: task.id,
            policyDecision,
            verification,
            output: execution.actionResult.output,
            status: runtimeStatus,
            lastAttemptId: execution.attempt.id,
            summary: execution.actionResult.summary,
            clarificationNeeded:
              execution.actionResult.status === 'clarification_needed'
                ? execution.actionResult.clarification?.missingFields ?? []
                : [],
            clarification: execution.actionResult.clarification,
          });
        }
      }
    }

    if (!result || !verification || !finalObservation || !policyDecision) {
      throw new Error('Runtime execution ended without a terminal result.');
    }

    const finalTask: AgentTask = {
      ...task,
      status: resolveTaskStatus(result.status),
      updatedAt: nowIso(),
      steps: plannedSteps.map((step) => step.id),
      metadata: {
        ...(task.metadata ?? {}),
        finalOutcome: result.status,
      },
    };
    job.status = resolveJobStatus(result.status);
    job.finishedAt = nowIso();
    job.activeStepId = undefined;
    job.result = result;
    job.metadata = {
      ...(job.metadata ?? {}),
      verification: verification.status,
      finalOutcome: result.status,
    };

    await appendAudit(auditStore, job, {
      taskId: task.id,
      stage: 'result',
      event: result.status,
      jobId: job.id,
      stepId: planned.executionStep.id,
      details: {
        summary: result.summary,
      },
    });

    const checkpoint = createRuntimeCheckpoint({
      jobId: job.id,
      phase: 'terminal',
      summary: result.summary ?? verification.summary,
      completedStepIds: job.completedStepIds,
      state: {
        task: finalTask,
        executionContext,
        job,
        plan: planned.plan,
        plannedSteps,
        executionAttempts,
        observations,
        policyDecision,
        verification,
        result,
      },
      metadata: {
        outcome: result.status,
      },
    });
    const terminalContinuation = createCheckpointContinuation(
      checkpoint.id,
      'Terminal checkpoints can be recovered without replaying side effects.',
    );
    result.continuation = terminalContinuation;
    checkpoint.continuation = terminalContinuation;
    job.checkpointIds = [checkpoint.id];

    await appendAudit(auditStore, job, {
      taskId: task.id,
      stage: 'checkpoint',
      event: 'saved',
      jobId: job.id,
      targetId: checkpoint.id,
      details: {
        phase: checkpoint.phase,
      },
    });
    await Promise.resolve(options.stateStore?.saveJob(job));
    await Promise.resolve(options.stateStore?.saveCheckpoint(checkpoint));

    emitProgressEvent(options, {
      taskId: task.id,
      jobId: job.id,
      status: job.status,
      currentStepId: null,
      currentStepIndex: plannedSteps.length,
      stepCount: plannedSteps.length,
      completedStepIds: job.completedStepIds,
      checkpointId: checkpoint.id,
      summary: result.summary ?? verification.summary ?? `Job ${job.status}.`,
    });

    const auditTrail = await resolveAuditEvents(auditStore, job.id, task.id);

    return {
      task: finalTask,
      executionContext,
      job,
      plan: planned.plan,
      plannedStep: plannedSteps[executionStepIndex],
      plannedSteps,
      executionAttempts,
      observation: finalObservation,
      observations,
      policyDecision,
      verification,
      result,
      auditTrail,
      checkpoint,
    };
  };

  return {
    runTask,
    startTask: runTask,
    async listJobs(): Promise<RuntimeJob[]> {
      if (!baseOptions.stateStore) {
        return [];
      }

      return Promise.resolve(baseOptions.stateStore.listJobs());
    },
    async inspectJob(jobId: string): Promise<AgentRuntimeInspection | null> {
      return buildInspection(baseOptions.stateStore, resolveAuditStore(baseOptions.auditStore), jobId);
    },
    async cancelJob(jobId: string): Promise<AgentRuntimeInspection | null> {
      if (!baseOptions.stateStore) {
        return null;
      }

      const auditStore = resolveAuditStore(baseOptions.auditStore);
      const inspection = await buildInspection(baseOptions.stateStore, auditStore, jobId);
      if (!inspection) {
        return null;
      }

      if (
        inspection.job.status === 'completed' ||
        inspection.job.status === 'failed' ||
        inspection.job.status === 'clarification_needed' ||
        inspection.job.status === 'denied' ||
        inspection.job.status === 'cancelled'
      ) {
        return inspection;
      }

      const nextJob: RuntimeJob = {
        ...inspection.job,
        status: 'cancelled',
        finishedAt: nowIso(),
        cancellable: false,
      };
      const checkpoint = createRuntimeCheckpoint({
        jobId,
        phase: 'cancelled',
        summary: 'Job cancelled by operator request.',
        activeStepId: inspection.latestCheckpoint?.activeStepId,
        completedStepIds: nextJob.completedStepIds,
        state: {
          ...(inspection.latestCheckpoint?.state ?? {}),
          job: nextJob,
        },
        metadata: {
          cancelledFromCheckpointId: inspection.latestCheckpoint?.id ?? null,
        },
      });
      checkpoint.continuation = createCheckpointContinuation(
        inspection.latestCheckpoint?.id ?? checkpoint.id,
        'Cancelled jobs can be recovered from their latest checkpoint without replaying side effects.',
      );
      nextJob.checkpointIds = [...inspection.job.checkpointIds, checkpoint.id];
      await appendAudit(auditStore, nextJob, {
        taskId: inspection.task?.id ?? nextJob.taskId,
        stage: 'runtime',
        event: 'cancelled',
        jobId,
        targetId: checkpoint.id,
        details: {
          cancelledFromCheckpointId: inspection.latestCheckpoint?.id ?? null,
        },
      });
      await appendAudit(auditStore, nextJob, {
        taskId: inspection.task?.id ?? nextJob.taskId,
        stage: 'checkpoint',
        event: 'saved',
        jobId,
        targetId: checkpoint.id,
        details: {
          phase: checkpoint.phase,
        },
      });
      await Promise.resolve(baseOptions.stateStore.saveJob(nextJob));
      await Promise.resolve(baseOptions.stateStore.saveCheckpoint(checkpoint));
      return buildInspection(baseOptions.stateStore, auditStore, jobId);
    },
    async resumeJob(jobId: string, callOptions: AgentRuntimeOptions = {}): Promise<AgentRuntimeRunResult | null> {
      if (!baseOptions.stateStore) {
        return null;
      }

      const auditStore = resolveAuditStore(baseOptions.auditStore);
      const inspection = await buildInspection(
        baseOptions.stateStore,
        auditStore,
        jobId,
      );
      if (
        !inspection?.task ||
        !inspection.latestCheckpoint ||
        !inspection.executionContext ||
        !inspection.plan ||
        !inspection.policyDecision ||
        !inspection.verification ||
        !inspection.result
      ) {
        return null;
      }

      if (
        inspection.job.status !== 'blocked' &&
        inspection.job.status !== 'clarification_needed' &&
        inspection.job.status !== 'denied' &&
        inspection.job.status !== 'escalated' &&
        inspection.job.status !== 'cancelled'
      ) {
        return null;
      }

      const continuation = createCheckpointContinuation(
        inspection.latestCheckpoint.id,
        'Resume reconstructs the persisted checkpoint instead of replaying the original job.',
      );
      const resumedTask: AgentTask = {
        ...cloneValue(inspection.task),
        status: resolveTaskStatus(inspection.result.status),
        updatedAt: nowIso(),
        metadata: {
          ...(inspection.task.metadata ?? {}),
          resumeOf: jobId,
          resumedFromCheckpointId: inspection.latestCheckpoint.id,
          resumeMode: continuation.mode,
        },
      };
      const resumedResult: RuntimeTaskResult = {
        ...cloneValue(inspection.result),
        summary: `Resumed from checkpoint ${inspection.latestCheckpoint.id} without replaying side effects. ${
          inspection.result.summary ?? ''
        }`.trim(),
        continuation,
        metadata: {
          ...(inspection.result.metadata ?? {}),
          resumedFromCheckpointId: inspection.latestCheckpoint.id,
          resumeMode: continuation.mode,
        },
      };
      const resumedJob: RuntimeJob = {
        ...cloneValue(inspection.job),
        resumeCount: inspection.job.resumeCount + 1,
        result: resumedResult,
        metadata: {
          ...(inspection.job.metadata ?? {}),
          resumedFromCheckpointId: inspection.latestCheckpoint.id,
          resumeMode: continuation.mode,
        },
      };
      const resumedPlannedSteps = cloneValue(inspection.plannedSteps);
      const resumedObservation =
        cloneValue(inspection.observations[inspection.observations.length - 1]) ??
        cloneValue(inspection.latestObservation) ??
        null;
      if (!resumedObservation) {
        return null;
      }

      const resumedCheckpoint = createRuntimeCheckpoint({
        jobId,
        phase: 'resumed',
        summary: resumedResult.summary ?? inspection.latestCheckpoint.summary ?? 'Checkpoint resumed.',
        activeStepId: inspection.latestCheckpoint.activeStepId,
        completedStepIds: inspection.latestCheckpoint.completedStepIds,
        state: {
          ...(cloneValue(inspection.latestCheckpoint.state) as Record<string, unknown>),
          task: resumedTask,
          executionContext: inspection.executionContext,
          job: resumedJob,
          plan: inspection.plan,
          plannedSteps: resumedPlannedSteps,
          executionAttempts: cloneValue(inspection.executionAttempts),
          observations: cloneValue(inspection.observations),
          policyDecision: inspection.policyDecision,
          verification: inspection.verification,
          result: resumedResult,
        },
        continuation,
        metadata: {
          resumedFromCheckpointId: inspection.latestCheckpoint.id,
          resumeMode: continuation.mode,
        },
      });
      resumedJob.checkpointIds = [...inspection.job.checkpointIds, resumedCheckpoint.id];

      await appendAudit(auditStore, resumedJob, {
        taskId: inspection.task.id,
        stage: 'runtime',
        event: 'resumed',
        jobId,
        targetId: resumedCheckpoint.id,
        details: {
          resumedFromCheckpointId: inspection.latestCheckpoint.id,
          continuationMode: continuation.mode,
        },
      });
      await appendAudit(auditStore, resumedJob, {
        taskId: inspection.task.id,
        stage: 'checkpoint',
        event: 'saved',
        jobId,
        targetId: resumedCheckpoint.id,
        details: {
          phase: resumedCheckpoint.phase,
        },
      });
      await Promise.resolve(baseOptions.stateStore.saveJob(resumedJob));
      await Promise.resolve(baseOptions.stateStore.saveCheckpoint(resumedCheckpoint));

      const auditTrail = await resolveAuditEvents(auditStore, jobId, inspection.task.id);
      const executionStep =
        resumedPlannedSteps.find((step) => step.metadata?.['phase'] === 'execute') ??
        resumedPlannedSteps[1] ??
        resumedPlannedSteps[0];
      if (!executionStep) {
        return null;
      }

      return {
        task: resumedTask,
        executionContext: inspection.executionContext,
        job: resumedJob,
        plan: inspection.plan,
        plannedStep: executionStep,
        plannedSteps: resumedPlannedSteps,
        executionAttempts: cloneValue(inspection.executionAttempts),
        observation: resumedObservation,
        observations: cloneValue(inspection.observations),
        policyDecision: inspection.policyDecision,
        verification: inspection.verification,
        result: resumedResult,
        auditTrail,
        checkpoint: resumedCheckpoint,
      };
    },
    async recoverJob(jobId: string): Promise<AgentRuntimeInspection | null> {
      if (!baseOptions.stateStore) {
        return null;
      }

      const auditStore = resolveAuditStore(baseOptions.auditStore);
      const inspection = await buildInspection(baseOptions.stateStore, auditStore, jobId);
      if (!inspection?.latestCheckpoint) {
        return inspection;
      }

      const recoveredCheckpoint = createRuntimeCheckpoint({
        jobId,
        phase: 'recovered',
        summary: 'Recovered the latest known safe checkpoint for inspection.',
        activeStepId: inspection.latestCheckpoint.activeStepId,
        completedStepIds: inspection.latestCheckpoint.completedStepIds,
        state: inspection.latestCheckpoint.state,
        metadata: {
          recoveredFromCheckpointId: inspection.latestCheckpoint.id,
        },
      });
      recoveredCheckpoint.continuation = createCheckpointContinuation(
        inspection.latestCheckpoint.id,
        'Recovered checkpoints are for inspection only and do not replay side effects.',
      );
      const recoveredJob: RuntimeJob = {
        ...inspection.job,
        checkpointIds: [...inspection.job.checkpointIds, recoveredCheckpoint.id],
      };
      recoveredCheckpoint.state = {
        ...(inspection.latestCheckpoint.state ?? {}),
        job: recoveredJob,
      };
      await appendAudit(auditStore, recoveredJob, {
        taskId: inspection.task?.id ?? inspection.job.taskId,
        stage: 'runtime',
        event: 'recovered',
        jobId,
        targetId: recoveredCheckpoint.id,
        details: {
          recoveredFromCheckpointId: inspection.latestCheckpoint.id,
        },
      });
      await appendAudit(auditStore, recoveredJob, {
        taskId: inspection.task?.id ?? inspection.job.taskId,
        stage: 'checkpoint',
        event: 'saved',
        jobId,
        targetId: recoveredCheckpoint.id,
        details: {
          phase: recoveredCheckpoint.phase,
        },
      });
      await Promise.resolve(baseOptions.stateStore.saveJob(recoveredJob));
      await Promise.resolve(baseOptions.stateStore.saveCheckpoint(recoveredCheckpoint));
      return buildInspection(baseOptions.stateStore, auditStore, jobId);
    },
  };
};

export const createAgentRuntimeService = (options: AgentRuntimeOptions = {}): AgentRuntimeService =>
  createServiceMethods(options);
