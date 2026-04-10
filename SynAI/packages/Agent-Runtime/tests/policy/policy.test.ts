import { createAgentTask } from '@agent-runtime/core';
import { evaluateTaskPolicy } from '@agent-runtime/policy/policy';

const buildStep = (skill: string) => ({
  id: `${skill}-step`,
  taskId: 'task-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'pending' as const,
  name: `Run ${skill}`,
  skill,
  input: { text: 'hello' },
});

describe('evaluateTaskPolicy', () => {
  it('allows low risk echo skills', () => {
    const task = createAgentTask({ id: 'task-1', title: 'Echo text' });
    expect(evaluateTaskPolicy({ task, step: buildStep('echo_text'), skillRisk: 'low' })).toMatchObject({
      type: 'allow',
    });
  });

  it('escalates high risk mock skills', () => {
    const task = createAgentTask({ id: 'task-2', title: 'Open app', metadata: { policyEscalate: true } });
    expect(evaluateTaskPolicy({ task, step: buildStep('mock_open_app'), skillRisk: 'high' })).toMatchObject({
      type: 'escalate',
    });
  });

  it('blocks medium risk tasks', () => {
    const task = createAgentTask({ id: 'task-3', title: 'Medium risk', metadata: { risk: 'medium' } });
    expect(evaluateTaskPolicy({ task, step: buildStep('echo_text'), skillRisk: 'medium' })).toMatchObject({
      type: 'block',
    });
  });
});
