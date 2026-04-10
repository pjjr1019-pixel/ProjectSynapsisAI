import { createAgentTask } from '@agent-runtime/core';
import { runAgentTask } from '@agent-runtime/runtime/noop-runtime';

describe('Agent Runtime No-op Flow', () => {
  it('processes a task through planner, executor, verifier, policy, and audit', async () => {
    const sampleTask = createAgentTask({
      id: 't1',
      title: 'Echo sample text',
      metadata: { inputText: 'hello' },
    });

    const { result, auditTrail, plannedSteps, executionAttempts, plan } = await runAgentTask(sampleTask);

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
    expect(plan.steps).toHaveLength(4);
    expect(plannedSteps).toHaveLength(4);
    expect(executionAttempts).toHaveLength(1);
    expect(auditTrail.map((event) => `${event.stage}:${event.event}`)).toEqual([
      'runtime:started',
      'planner:planned',
      'policy:allow',
      'executor:started',
      'executor:executed',
      'perception:captured',
      'verifier:passed',
      'result:success',
      'checkpoint:saved',
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

  it('returns clarification_needed without executing when the planner needs more input', async () => {
    const clarifyTask = createAgentTask({
      id: 't5',
      title: 'Open a desktop action without enough detail',
      metadata: {
        desktopAction: {},
      },
    });

    const { result, job, policyDecision, auditTrail } = await runAgentTask(clarifyTask);

    expect(result.status).toBe('clarification_needed');
    expect(result.clarificationNeeded).toEqual([
      'Provide desktopAction.proposalId.',
      'Provide desktopAction.target.',
    ]);
    expect(job.status).toBe('clarification_needed');
    expect(policyDecision.type).toBe('allow');
    expect(auditTrail.map((event) => `${event.stage}:${event.event}`)).toContain('planner:clarification_needed');
    expect(auditTrail.some((event) => event.stage === 'executor' && event.event === 'started')).toBe(false);
  });
});
