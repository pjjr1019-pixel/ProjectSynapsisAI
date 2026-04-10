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
  expectedEcho: string;
}): VerificationReport => {
  const createdAt = nowIso();
  const base = {
    id: createRuntimeId('verification'),
    createdAt,
    taskId: input.task.id,
    jobId: input.observation.jobId,
    stepId: input.step.id,
    metadata: {
      policyDecision: input.policyDecision.type,
      skillId: input.step.skill,
    },
  } satisfies Omit<VerificationReport, 'status' | 'issues'>;

  if (input.policyDecision.type !== 'allow') {
    return {
      ...base,
      status: 'skipped',
      issues: [buildIssue(`Verification skipped after policy ${input.policyDecision.type}.`, 'policy-skipped')],
    };
  }

  const execution = input.execution;
  if (!execution) {
    return {
      ...base,
      status: 'failed',
      issues: [buildIssue('Execution outcome is missing.', 'missing-execution')],
    };
  }

  if (!execution.result.success) {
    return {
      ...base,
      status: 'failed',
      issues: [buildIssue('Skill result reported failure.', 'skill-failed', execution.result.error)],
    };
  }

  const echoed = typeof execution.result.output === 'object' && execution.result.output !== null
    ? (execution.result.output as { echoed?: unknown }).echoed
    : undefined;

  if (input.step.skill === 'echo_text' && echoed !== input.expectedEcho) {
    return {
      ...base,
      status: 'failed',
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
      issues: [buildIssue('Verification was intentionally failed by task metadata.', 'forced-failure')],
    };
  }

  return {
    ...base,
    status: 'passed',
    issues: [],
  };
};

export const toRuntimeOutcomeStatus = (report: VerificationReport, decision: PolicyDecision['type']): RuntimeOutcomeStatus => {
  if (decision === 'block') {
    return 'blocked';
  }

  if (decision === 'escalate') {
    return 'escalated';
  }

  return report.status === 'passed' ? 'success' : 'failed';
};

export const buildRuntimeTaskResult = (input: {
  taskId: string;
  policyDecision: PolicyDecision;
  verification: VerificationReport;
  output?: unknown;
  status: RuntimeOutcomeStatus;
}): RuntimeTaskResult => {
  const policyBlock = input.policyDecision.type === 'block'
    ? {
        reason: input.policyDecision.reason,
        code: 'POLICY_BLOCK',
      }
    : undefined;

  const policyEscalation = input.policyDecision.type === 'escalate'
    ? {
        reason: input.policyDecision.reason,
        code: 'POLICY_ESCALATE',
      }
    : undefined;

  return {
    id: input.taskId,
    status: input.status,
    output: input.output,
    policyDecision: input.policyDecision,
    policyBlock,
    policyEscalation,
    verification: input.verification,
  };
};

