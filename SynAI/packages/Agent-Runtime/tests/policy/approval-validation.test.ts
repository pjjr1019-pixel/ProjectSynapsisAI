import { createAgentTask } from '@agent-runtime/core';
import { validateApprovalBinding } from '@agent-runtime/policy';

const buildStep = () => ({
  id: 'step-approval',
  taskId: 'task-approval',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'pending' as const,
  name: 'Execute governed action',
  skill: 'desktop-action',
  input: {},
});

describe('validateApprovalBinding', () => {
  it('accepts structural matches when the binding hash and token id line up', async () => {
    const result = await validateApprovalBinding({
      bindingHash: 'hash-1',
      approvalBinding: {
        bindingHash: 'hash-1',
        tokenId: 'token-1',
      },
      task: createAgentTask({
        id: 'task-approval',
        title: 'Run governed action',
      }),
      step: buildStep(),
    });

    expect(result).toEqual({
      valid: true,
      reason: null,
      code: 'APPROVAL_STRUCTURAL_MATCH',
    });
  });

  it('rejects mismatched binding hashes before custom validator execution', async () => {
    const validator = jest.fn();

    const result = await validateApprovalBinding({
      bindingHash: 'hash-1',
      approvalBinding: {
        bindingHash: 'hash-2',
        tokenId: 'token-1',
      },
      task: createAgentTask({
        id: 'task-approval-mismatch',
        title: 'Run governed action',
      }),
      step: buildStep(),
      validator,
    });

    expect(result).toEqual({
      valid: false,
      reason: 'Approval binding hash mismatch.',
      code: 'APPROVAL_BINDING_HASH_MISMATCH',
    });
    expect(validator).not.toHaveBeenCalled();
  });

  it('surfaces expired-token validator failures unchanged', async () => {
    const result = await validateApprovalBinding({
      bindingHash: 'hash-expired',
      approvalBinding: {
        bindingHash: 'hash-expired',
        tokenId: 'token-expired',
      },
      task: createAgentTask({
        id: 'task-approval-expired',
        title: 'Run governed action',
      }),
      step: buildStep(),
      validator: async () => ({
        valid: false,
        reason: 'Approval token has expired.',
        code: 'APPROVAL_TOKEN_EXPIRED',
      }),
    });

    expect(result).toEqual({
      valid: false,
      reason: 'Approval token has expired.',
      code: 'APPROVAL_TOKEN_EXPIRED',
    });
  });

  it('surfaces signature mismatches from the live validator seam', async () => {
    const result = await validateApprovalBinding({
      bindingHash: 'hash-signature',
      approvalBinding: {
        bindingHash: 'hash-signature',
        tokenId: 'token-signature',
      },
      task: createAgentTask({
        id: 'task-approval-signature',
        title: 'Run governed action',
      }),
      step: buildStep(),
      validator: async () => ({
        valid: false,
        reason: 'Approval token signature mismatch.',
        code: 'APPROVAL_TOKEN_SIGNATURE_MISMATCH',
      }),
    });

    expect(result).toEqual({
      valid: false,
      reason: 'Approval token signature mismatch.',
      code: 'APPROVAL_TOKEN_SIGNATURE_MISMATCH',
    });
  });
});
