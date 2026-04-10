import { createAgentTask } from '../../../src/agent/core';
import { runAgentTask } from '../../../src/agent/runtime/noop-runtime';

describe('Agent Runtime No-op Flow', () => {
  it('processes a task through planner, executor, verifier, policy, and audit', async () => {
    const sampleTask = createAgentTask({
      id: 't1',
      title: 'Echo sample text',
      metadata: { inputText: 'hello' },
    });

    const { result, auditTrail } = await runAgentTask(sampleTask);

    expect(result).toMatchObject({
      id: 't1',
      status: 'success',
      policyDecision: {
        type: 'allow',
      },
      output: {
        echoed: 'hello',
      },
    });
    expect(auditTrail.map((event) => `${event.stage}:${event.event}`)).toEqual([
      'task:received',
      'planner:planned',
      'policy:allow',
      'executor:executed',
      'perception:captured',
      'verifier:passed',
      'result:completed',
    ]);
  });

  it('returns a failed result if verification is intentionally forced to fail', async () => {
    const failTask = createAgentTask({
      id: 't2',
      title: 'Fail verification',
      metadata: {
        inputText: 'hello',
        failVerify: true,
      },
    });

    const { result, auditTrail } = await runAgentTask(failTask);

    expect(result.status).toBe('failed');
    expect(result.verification?.status).toBe('failed');
    expect(auditTrail.some((event) => event.stage === 'verifier' && event.event === 'failed')).toBe(true);
  });

  it('returns a policy block without executing the skill', async () => {
    const blockedTask = createAgentTask({
      id: 't3',
      title: 'Blocked task',
      metadata: {
        policyBlock: true,
      },
    });

    const { result, auditTrail } = await runAgentTask(blockedTask);

    expect(result.status).toBe('blocked');
    expect(result.policyBlock).toEqual({ reason: 'Task metadata requested a policy block.', code: 'POLICY_BLOCK' });
    expect(auditTrail.some((event) => event.stage === 'executor' && event.event === 'skipped')).toBe(true);
  });

  it('returns an escalation result for high-risk mock skills', async () => {
    const escalatedTask = createAgentTask({
      id: 't4',
      title: 'Escalate mock app open',
      metadata: {
        skillId: 'mock_open_app',
        policyEscalate: true,
      },
    });

    const { result, auditTrail } = await runAgentTask(escalatedTask);

    expect(result.status).toBe('escalated');
    expect(result.policyEscalation).toEqual({
      reason: 'Task metadata requested escalation.',
      code: 'POLICY_ESCALATE',
    });
    expect(auditTrail.some((event) => event.stage === 'executor' && event.event === 'skipped')).toBe(true);
  });
});
