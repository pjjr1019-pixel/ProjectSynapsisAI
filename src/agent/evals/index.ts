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
