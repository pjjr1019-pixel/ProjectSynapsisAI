import type {
  AgentTask,
  ObservationSnapshot,
  PolicyDecision,
  RuntimeOutcomeStatus,
  RuntimeTaskResult,
  TaskStep,
  VerificationReport,
} from '../contracts';
import type { StepExecutionOutcome } from '../executor';
import { createRuntimeId, nowIso } from '../core';

const buildIssue = (message: string, code?: string, details?: unknown) => ({
  message,
  code,
  details,
});

export const verifyTaskExecution = (input: {
  task: AgentTask;
  step: TaskStep;
  policyDecision: PolicyDecision;
  execution: StepExecutionOutcome | null;
  observation: ObservationSnapshot;
  expectedEcho: string | null;
}): VerificationReport => {
  const createdAt = nowIso();
  const evidenceIds = input.observation.evidence.map((entry) => entry.id);
  const base: Omit<VerificationReport, 'status' | 'issues'> = {
    id: createRuntimeId('verification'),
    createdAt,
    taskId: input.task.id,
    jobId: input.observation.jobId,
    stepId: input.step.id,
    attemptId: input.execution?.attempt.id,
    observationId: input.observation.id,
    summary: undefined,
    evidenceIds,
    metadata: {
      policyDecision: input.policyDecision.type,
      skillId: input.step.skill,
      adapterId: input.execution?.adapterId,
    },
  };

  if (input.policyDecision.type !== 'allow') {
    return {
      ...base,
      status: 'skipped',
      summary: `Verification skipped after policy ${input.policyDecision.type}.`,
      issues: [buildIssue(`Verification skipped after policy ${input.policyDecision.type}.`, 'policy-skipped')],
    };
  }

  const execution = input.execution;
  if (!execution) {
    return {
      ...base,
      status: 'failed',
      summary: 'Execution outcome is missing.',
      issues: [buildIssue('Execution outcome is missing.', 'missing-execution')],
    };
  }

  const executionStatus = execution.actionResult.status;
  if (executionStatus === 'clarification_needed') {
    return {
      ...base,
      status: 'skipped',
      summary: execution.actionResult.summary,
      issues: [
        buildIssue(
          'Execution needs clarification before it can continue.',
          'execution-clarification-needed',
          execution.actionResult.clarification ?? execution.actionResult.error,
        ),
      ],
    };
  }

  if (executionStatus === 'blocked' || executionStatus === 'denied' || executionStatus === 'escalated') {
    return {
      ...base,
      status: 'failed',
      summary: execution.actionResult.summary,
      issues: [
        buildIssue(
          `Execution finished with ${executionStatus}.`,
          executionStatus === 'blocked'
            ? 'execution-blocked'
            : executionStatus === 'denied'
              ? 'execution-denied'
              : 'execution-escalated',
          execution.actionResult.error,
        ),
      ],
    };
  }

  if (executionStatus === 'cancelled' || executionStatus === 'skipped') {
    return {
      ...base,
      status: 'skipped',
      summary: execution.actionResult.summary,
      issues: [
        buildIssue(
          `Execution ${executionStatus}.`,
          executionStatus === 'cancelled' ? 'execution-cancelled' : 'execution-skipped',
        ),
      ],
    };
  }

  if (!execution.result.success) {
    return {
      ...base,
      status: 'failed',
      summary: execution.actionResult.summary,
      issues: [buildIssue('Skill or adapter result reported failure.', 'skill-failed', execution.result.error)],
    };
  }

  const externalVerification =
    execution.actionResult.output &&
    typeof execution.actionResult.output === 'object' &&
    'verification' in (execution.actionResult.output as Record<string, unknown>)
      ? ((execution.actionResult.output as Record<string, unknown>)['verification'] as
          | { passed?: unknown; summary?: unknown }
          | undefined)
      : undefined;
  if (externalVerification && externalVerification.passed === false) {
    return {
      ...base,
      status: 'failed',
      summary:
        typeof externalVerification.summary === 'string'
          ? externalVerification.summary
          : 'External verification reported failure.',
      issues: [
        buildIssue(
          'External verification reported failure.',
          'external-verification-failed',
          externalVerification,
        ),
      ],
    };
  }

  const echoed =
    typeof execution.result.output === 'object' && execution.result.output !== null
      ? (execution.result.output as { echoed?: unknown }).echoed
      : undefined;

  if (execution.skillId === 'echo_text' && input.expectedEcho !== null && echoed !== input.expectedEcho) {
    return {
      ...base,
      status: 'failed',
      summary: 'Echo output did not match the expected value.',
      issues: [
        buildIssue('Echo output did not match the expected value.', 'mismatch', {
          expectedEcho: input.expectedEcho,
          actualEcho: echoed,
        }),
      ],
    };
  }

  if (input.task.metadata?.['failVerify'] === true) {
    return {
      ...base,
      status: 'failed',
      summary: 'Verification was intentionally failed by task metadata.',
      issues: [buildIssue('Verification was intentionally failed by task metadata.', 'forced-failure')],
    };
  }

  return {
    ...base,
    status: 'passed',
    summary: execution.actionResult.summary,
    issues: [],
  };
};

export const toRuntimeOutcomeStatus = (
  report: VerificationReport,
  decision: PolicyDecision['type'],
  execution?: StepExecutionOutcome | null,
): RuntimeOutcomeStatus => {
  if (decision === 'block') {
    return 'blocked';
  }

  if (decision === 'escalate') {
    return 'escalated';
  }

  if (execution?.actionResult.status === 'denied') {
    return 'denied';
  }

  if (execution?.actionResult.status === 'clarification_needed') {
    return 'clarification_needed';
  }

  if (execution?.actionResult.status === 'cancelled') {
    return 'cancelled';
  }

  if (execution?.actionResult.status === 'skipped' || report.status === 'skipped') {
    return 'skipped';
  }

  return report.status === 'passed' ? 'success' : 'failed';
};

export const buildRuntimeTaskResult = (input: {
  taskId: string;
  policyDecision: PolicyDecision;
  verification: VerificationReport;
  output?: unknown;
  status: RuntimeOutcomeStatus;
  lastAttemptId?: string;
  summary?: string;
  clarificationNeeded?: string[];
  clarification?: RuntimeTaskResult['clarification'];
  denial?: { reason: string; code: string };
}): RuntimeTaskResult => {
  const policyBlock =
    input.policyDecision.type === 'block'
      ? {
          reason: input.policyDecision.reason,
          code: 'POLICY_BLOCK',
        }
      : undefined;

  const policyEscalation =
    input.policyDecision.type === 'escalate'
      ? {
          reason: input.policyDecision.reason,
          code: 'POLICY_ESCALATE',
        }
      : undefined;

  return {
    id: input.taskId,
    status: input.status,
    summary: input.summary ?? input.verification.summary,
    output: input.output,
    clarificationNeeded: input.clarificationNeeded ?? [],
    clarification: input.clarification,
    policyDecision: input.policyDecision,
    policyBlock,
    policyEscalation,
    denial: input.denial,
    verification: input.verification,
    lastAttemptId: input.lastAttemptId,
  };
};
