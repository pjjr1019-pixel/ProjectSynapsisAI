import type {
  AgentEvalCase,
  AgentEvalCaseResult,
  AgentEvalReport,
  AgentRuntimeRunResult,
} from '../contracts';
import { createAgentTask, createRuntimeId, nowIso } from '../core';
import { runAgentTask } from '../runtime/noop-runtime';

export interface RuntimeEvalRunner {
  runTask(task: AgentEvalCase['task']): Promise<AgentRuntimeRunResult>;
}

const buildEvalIssue = (message: string, code: string, details?: unknown) => ({
  message,
  code,
  details,
});

export const buildNoopRuntimeEvalCases = (): AgentEvalCase[] => [
  {
    id: 'allow-echo',
    title: 'Allow echo skill execution',
    task: createAgentTask({
      id: 'eval-allow-echo',
      title: 'Echo the sample text',
      metadata: {
        inputText: 'hello',
      },
    }),
    expectedStatus: 'success',
    expectedPolicyDecisionType: 'allow',
    expectedVerificationStatus: 'passed',
    expectedPlanStepCount: 4,
    expectedCheckpointPhase: 'terminal',
    expectedContinuationMode: 'reconstructed',
    expectedContinuationResumable: false,
  },
  {
    id: 'clarification-needed',
    title: 'Require clarification before execution',
    task: createAgentTask({
      id: 'eval-clarification-needed',
      title: 'Open a desktop action without enough detail',
      metadata: {
        desktopAction: {},
      },
    }),
    expectedStatus: 'clarification_needed',
    expectedPolicyDecisionType: 'allow',
    expectedVerificationStatus: 'skipped',
    expectedPlanStepCount: 4,
  },
  {
    id: 'block-policy',
    title: 'Block policy-requested task',
    task: createAgentTask({
      id: 'eval-block-policy',
      title: 'Block this task',
      metadata: {
        policyBlock: true,
      },
    }),
    expectedStatus: 'blocked',
    expectedPolicyDecisionType: 'block',
    expectedVerificationStatus: 'skipped',
    expectedPlanStepCount: 4,
  },
  {
    id: 'escalate-policy',
    title: 'Escalate policy-requested task',
    task: createAgentTask({
      id: 'eval-escalate-policy',
      title: 'Escalate this task',
      metadata: {
        policyEscalate: true,
      },
    }),
    expectedStatus: 'escalated',
    expectedPolicyDecisionType: 'escalate',
    expectedVerificationStatus: 'skipped',
    expectedPlanStepCount: 4,
  },
];

export const evaluateAgentRuntimeCase = (
  input: AgentEvalCase,
  run: AgentRuntimeRunResult,
): AgentEvalCaseResult => {
  const issues = [];

  if (run.result.status !== input.expectedStatus) {
    issues.push(
      buildEvalIssue('Runtime status did not match the expected outcome.', 'status-mismatch', {
        expected: input.expectedStatus,
        actual: run.result.status,
      }),
    );
  }

  if (
    input.expectedPolicyDecisionType &&
    run.policyDecision.type !== input.expectedPolicyDecisionType
  ) {
    issues.push(
      buildEvalIssue('Policy decision type did not match expectation.', 'policy-mismatch', {
        expected: input.expectedPolicyDecisionType,
        actual: run.policyDecision.type,
      }),
    );
  }

  if (
    input.expectedVerificationStatus &&
    run.verification.status !== input.expectedVerificationStatus
  ) {
    issues.push(
      buildEvalIssue('Verification status did not match expectation.', 'verification-mismatch', {
        expected: input.expectedVerificationStatus,
        actual: run.verification.status,
      }),
    );
  }

  if (
    typeof input.expectedPlanStepCount === 'number' &&
    run.plannedSteps.length !== input.expectedPlanStepCount
  ) {
    issues.push(
      buildEvalIssue('Planned step count did not match expectation.', 'plan-step-count-mismatch', {
        expected: input.expectedPlanStepCount,
        actual: run.plannedSteps.length,
      }),
    );
  }

  if (input.expectedCheckpointPhase && run.checkpoint.phase !== input.expectedCheckpointPhase) {
    issues.push(
      buildEvalIssue('Checkpoint phase did not match expectation.', 'checkpoint-phase-mismatch', {
        expected: input.expectedCheckpointPhase,
        actual: run.checkpoint.phase,
      }),
    );
  }

  if (input.expectedContinuationMode && run.checkpoint.continuation?.mode !== input.expectedContinuationMode) {
    issues.push(
      buildEvalIssue(
        'Checkpoint continuation mode did not match expectation.',
        'checkpoint-continuation-mismatch',
        {
          expected: input.expectedContinuationMode,
          actual: run.checkpoint.continuation?.mode ?? null,
        },
      ),
    );
  }

  if (input.expectedContinuationMode && run.result.continuation?.mode !== input.expectedContinuationMode) {
    issues.push(
      buildEvalIssue('Result continuation mode did not match expectation.', 'result-continuation-mismatch', {
        expected: input.expectedContinuationMode,
        actual: run.result.continuation?.mode ?? null,
      }),
    );
  }

  if (
    typeof input.expectedContinuationResumable === 'boolean' &&
    run.checkpoint.continuation?.resumable !== input.expectedContinuationResumable
  ) {
    issues.push(
      buildEvalIssue('Checkpoint resumable flag did not match expectation.', 'checkpoint-resumable-mismatch', {
        expected: input.expectedContinuationResumable,
        actual: run.checkpoint.continuation?.resumable ?? null,
      }),
    );
  }

  if (
    typeof input.expectedContinuationResumable === 'boolean' &&
    run.result.continuation?.resumable !== input.expectedContinuationResumable
  ) {
    issues.push(
      buildEvalIssue('Result resumable flag did not match expectation.', 'result-resumable-mismatch', {
        expected: input.expectedContinuationResumable,
        actual: run.result.continuation?.resumable ?? null,
      }),
    );
  }

  const status: AgentEvalCaseResult['status'] =
    issues.length === 0
      ? 'passed'
      : run.result.status === 'blocked'
        ? 'blocked'
        : run.result.status === 'escalated'
          ? 'escalated'
          : 'failed';

  return {
    caseId: input.id,
    status,
    issues,
    run,
  };
};

export const runAgentRuntimeEvalSuite = async (
  cases: AgentEvalCase[],
  runtime: RuntimeEvalRunner = {
    runTask: runAgentTask,
  },
): Promise<AgentEvalReport> => {
  const results: AgentEvalCaseResult[] = [];

  for (const entry of cases) {
    const run = await runtime.runTask(entry.task);
    results.push(evaluateAgentRuntimeCase(entry, run));
  }

  return {
    id: createRuntimeId('eval-report'),
    createdAt: nowIso(),
    totals: {
      total: results.length,
      passed: results.filter((entry) => entry.status === 'passed').length,
      failed: results.filter((entry) => entry.status === 'failed').length,
      blocked: results.filter((entry) => entry.status === 'blocked').length,
      escalated: results.filter((entry) => entry.status === 'escalated').length,
    },
    cases: results,
  };
};
