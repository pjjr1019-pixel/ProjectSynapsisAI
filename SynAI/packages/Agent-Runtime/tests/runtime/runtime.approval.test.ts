import type { ActionProposal, ActionResult, ExecutionContext } from '@agent-runtime/contracts';
import { InMemoryAuditStore } from '@agent-runtime/audit';
import {
  createActionProposal,
  createActionResult,
  createAgentTask,
} from '@agent-runtime/core';
import type { AgentActionAdapter } from '@agent-runtime/executor';
import { createAgentRuntimeService } from '@agent-runtime/runtime/runtime-manager';

const createDesktopActionAdapter = (input: {
  approvalRequired?: boolean;
  actionResultStatus?: ActionResult['status'];
  onExecute?: () => void;
}): AgentActionAdapter => ({
  id: 'test-desktop-adapter',
  supports(request) {
    return request.kind === 'desktop-action';
  },
  async propose(request): Promise<ActionProposal> {
    return createActionProposal({
      requestId: request.id,
      taskId: request.taskId,
      jobId: request.jobId,
      stepId: request.stepId,
      adapterId: 'test-desktop-adapter',
      actionId: request.actionId,
      title: request.title,
      summary: 'Prepared desktop action.',
      preview: request.commandPreview ?? `desktop-action:${request.actionId}`,
      normalizedInput: request.input,
      risk: request.risk,
      sideEffect: request.sideEffect,
      approvalRequired: input.approvalRequired ?? false,
      dryRun: false,
      capabilityStatus: 'supported',
      bindingHash: request.bindingHash,
      approvalBinding: request.approvalBinding,
      metadata: request.metadata,
    });
  },
  async execute(proposal, _context: ExecutionContext): Promise<ActionResult> {
    input.onExecute?.();
    return createActionResult({
      requestId: proposal.requestId,
      proposalId: proposal.id,
      status: input.actionResultStatus ?? 'executed',
      summary:
        input.actionResultStatus === 'denied'
          ? 'The governed adapter denied the live action.'
          : 'The desktop action executed.',
      commandHash: proposal.bindingHash,
      error:
        input.actionResultStatus === 'denied'
          ? {
              message: 'The governed adapter denied the live action.',
              code: 'adapter-denied',
            }
          : undefined,
      output:
        input.actionResultStatus === 'denied'
          ? undefined
          : {
              executed: true,
            },
    });
  },
});

describe('Agent runtime approval handling', () => {
  it('returns denied without executing the adapter when approval validation fails', async () => {
    let executeCount = 0;
    const runtime = createAgentRuntimeService({
      auditStore: new InMemoryAuditStore(),
      actionAdapters: [
        createDesktopActionAdapter({
          approvalRequired: true,
          onExecute: () => {
            executeCount += 1;
          },
        }),
      ],
      validateApproval: async () => ({
        valid: false,
        reason: 'Approval token has expired.',
        code: 'APPROVAL_TOKEN_EXPIRED',
      }),
    });

    const run = await runtime.runTask(
      createAgentTask({
        id: 'approval-denied-task',
        title: 'Open a governed desktop action',
        metadata: {
          desktopAction: {
            proposalId: 'open-file',
            target: 'C:/temp/file.txt',
            riskClass: 'low',
            dryRun: false,
            approvalToken: {
              tokenId: 'token-1',
              commandHash: 'fnv1a-aaaaaaaa',
              approver: 'operator',
              issuedAt: '2026-04-10T00:00:00.000Z',
              expiresAt: '2026-04-10T00:10:00.000Z',
              signature: 'expired-signature',
            },
          },
          approvedBy: 'operator',
        },
      }),
    );

    expect(executeCount).toBe(0);
    expect(run.result.status).toBe('denied');
    expect(run.result.denial).toEqual({
      reason: 'Approval token has expired.',
      code: 'APPROVAL_TOKEN_EXPIRED',
    });
    expect(run.job.status).toBe('denied');
    expect(run.executionAttempts[0]?.status).toBe('denied');
    expect(run.auditTrail.map((event) => `${event.stage}:${event.event}`)).toEqual(
      expect.arrayContaining(['policy:denied', 'executor:skipped', 'result:denied']),
    );
  });

  it('preserves adapter denied results as denied runtime outcomes', async () => {
    const runtime = createAgentRuntimeService({
      auditStore: new InMemoryAuditStore(),
      actionAdapters: [
        createDesktopActionAdapter({
          actionResultStatus: 'denied',
        }),
      ],
    });

    const run = await runtime.runTask(
      createAgentTask({
        id: 'adapter-denied-task',
        title: 'Run a live desktop action',
        metadata: {
          desktopAction: {
            proposalId: 'open-file',
            target: 'C:/temp/file.txt',
            riskClass: 'low',
            dryRun: false,
          },
        },
      }),
    );

    expect(run.executionAttempts[0]?.actionResult?.status).toBe('denied');
    expect(run.executionAttempts[0]?.status).toBe('denied');
    expect(run.result.status).toBe('denied');
    expect(run.verification.status).toBe('failed');
  });
});
