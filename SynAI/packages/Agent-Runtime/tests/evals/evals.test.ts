import type { ActionProposal, ActionResult } from '@agent-runtime/contracts';
import { InMemoryAuditStore } from '@agent-runtime/audit';
import { createActionProposal, createAgentTask } from '@agent-runtime/core';
import type { AgentActionAdapter } from '@agent-runtime/executor';
import { createAgentRuntimeService } from '@agent-runtime/runtime/runtime-manager';
import { buildNoopRuntimeEvalCases, runAgentRuntimeEvalSuite } from '@agent-runtime/evals';

const createDesktopActionTask = (input: {
  id: string;
  title: string;
  scenario: string;
  riskClass: 'low' | 'medium' | 'high' | 'critical';
}): ReturnType<typeof createAgentTask> =>
  createAgentTask({
    id: input.id,
    title: input.title,
    metadata: {
      scenario: input.scenario,
      desktopAction: {
        proposalId: 'open-file',
        target: 'C:/temp/file.txt',
        riskClass: input.riskClass,
        dryRun: false,
        scenario: input.scenario,
      },
    },
  });

const createScenarioAdapter = (): AgentActionAdapter => ({
  id: 'eval-desktop-adapter',
  supports(request) {
    return request.kind === 'desktop-action';
  },
  async propose(request): Promise<ActionProposal> {
    const input =
      request.input && typeof request.input === 'object'
        ? (request.input as Record<string, unknown>)
        : {};
    const scenario = String(input.scenario ?? '');
    const approvalRequired = scenario === 'approval-binding-mismatch' || scenario === 'approval-validator-denied';
    const bindingHash =
      scenario === 'approval-binding-mismatch'
        ? `${request.bindingHash}-adapter`
        : request.bindingHash;
    const approvalBinding =
      scenario === 'approval-binding-mismatch'
        ? {
            bindingHash: `${request.bindingHash}-mismatch`,
            tokenId: 'approval-token-1',
            approvedBy: 'qa-operator',
          }
        : scenario === 'approval-validator-denied'
          ? {
              bindingHash: request.bindingHash,
              tokenId: 'approval-token-2',
              approvedBy: 'qa-operator',
            }
          : undefined;

    return createActionProposal({
      requestId: request.id,
      taskId: request.taskId,
      jobId: request.jobId,
      stepId: request.stepId,
      adapterId: 'eval-desktop-adapter',
      actionId: request.actionId,
      title: request.title,
      summary: `${scenario || 'desktop'} action prepared.`,
      preview: request.commandPreview ?? `desktop-action:${request.actionId}`,
      normalizedInput: request.input,
      risk:
        scenario === 'live-medium-block'
          ? 'medium'
          : scenario === 'live-high-escalate'
            ? 'high'
            : request.risk,
      sideEffect: request.sideEffect,
      approvalRequired,
      dryRun: false,
      capabilityStatus: 'supported',
      bindingHash,
      approvalBinding,
      metadata: request.metadata,
    });
  },
  async execute(): Promise<ActionResult> {
    throw new Error('Unexpected live execution during eval coverage.');
  },
});

const runScenarioTask = async (task: ReturnType<typeof createAgentTask>) => {
  const scenario = String(task.metadata?.['scenario'] ?? '');
  const runtime = createAgentRuntimeService({
    auditStore: new InMemoryAuditStore(),
    actionAdapters: [createScenarioAdapter()],
    validateApproval:
      scenario === 'approval-validator-denied'
        ? async () => ({
            valid: false,
            reason: 'Approval token has expired.',
            code: 'APPROVAL_TOKEN_EXPIRED',
          })
        : undefined,
  });

  return runtime.runTask(task);
};

describe('runAgentRuntimeEvalSuite', () => {
  it('runs the built-in eval cases against the runtime', async () => {
    const report = await runAgentRuntimeEvalSuite(buildNoopRuntimeEvalCases());

    expect(report.totals.total).toBe(4);
    expect(report.totals.passed).toBe(4);
    expect(report.cases.every((entry) => entry.status === 'passed')).toBe(true);
  });

  it('covers denied, approval mismatch, and live-risk paths deterministically', async () => {
    const cases = [
      {
        id: 'approval-binding-mismatch',
        title: 'Reject mismatched approval binding',
        task: createDesktopActionTask({
          id: 'eval-approval-binding-mismatch',
          title: 'Reject mismatched approval binding',
          scenario: 'approval-binding-mismatch',
          riskClass: 'low',
        }),
        expectedStatus: 'denied',
        expectedPolicyDecisionType: 'allow',
        expectedVerificationStatus: 'failed',
        expectedPlanStepCount: 4,
      },
      {
        id: 'approval-validator-denied',
        title: 'Reject approval through validator',
        task: createDesktopActionTask({
          id: 'eval-approval-validator-denied',
          title: 'Reject approval through validator',
          scenario: 'approval-validator-denied',
          riskClass: 'low',
        }),
        expectedStatus: 'denied',
        expectedPolicyDecisionType: 'allow',
        expectedVerificationStatus: 'failed',
        expectedPlanStepCount: 4,
      },
      {
        id: 'live-medium-block',
        title: 'Block medium-risk live action',
        task: createDesktopActionTask({
          id: 'eval-live-medium-block',
          title: 'Block medium-risk live action',
          scenario: 'live-medium-block',
          riskClass: 'medium',
        }),
        expectedStatus: 'blocked',
        expectedPolicyDecisionType: 'block',
        expectedVerificationStatus: 'skipped',
        expectedPlanStepCount: 4,
      },
      {
        id: 'live-high-escalate',
        title: 'Escalate high-risk live action',
        task: createDesktopActionTask({
          id: 'eval-live-high-escalate',
          title: 'Escalate high-risk live action',
          scenario: 'live-high-escalate',
          riskClass: 'high',
        }),
        expectedStatus: 'escalated',
        expectedPolicyDecisionType: 'escalate',
        expectedVerificationStatus: 'skipped',
        expectedPlanStepCount: 4,
      },
    ] as const;

    const report = await runAgentRuntimeEvalSuite(cases as unknown as Parameters<typeof runAgentRuntimeEvalSuite>[0], {
      runTask: runScenarioTask,
    });

    expect(report.totals.total).toBe(4);
    expect(report.totals.passed).toBe(4);
    expect(report.cases.every((entry) => entry.status === 'passed')).toBe(true);
    expect(report.cases.map((entry) => entry.caseId)).toEqual([
      'approval-binding-mismatch',
      'approval-validator-denied',
      'live-medium-block',
      'live-high-escalate',
    ]);
  });
});
