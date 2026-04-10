import type { AgentTask, TaskStep } from '../contracts';
import { createRuntimeId, nowIso } from '../core';

const getTaskMetadata = (task: AgentTask): Record<string, unknown> =>
  task.metadata ?? {};

const getStringMetadata = (task: AgentTask, key: string): string | null => {
  const value = getTaskMetadata(task)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const getBooleanMetadata = (task: AgentTask, key: string): boolean => getTaskMetadata(task)[key] === true;

export interface PlannedAgentStep {
  step: TaskStep;
  skillId: string;
  expectedEcho: string;
}

export const planAgentTask = (task: AgentTask): PlannedAgentStep => {
  const skillId =
    getStringMetadata(task, 'skillId') ??
    (getBooleanMetadata(task, 'policyBlock') || getBooleanMetadata(task, 'policyEscalate')
      ? 'mock_open_app'
      : 'echo_text');
  const inputText = getStringMetadata(task, 'inputText') ?? task.description ?? task.title;
  const expectedEcho = getStringMetadata(task, 'expectedEcho') ?? inputText;
  const createdAt = nowIso();

  return {
    skillId,
    expectedEcho,
    step: {
      id: createRuntimeId('step'),
      taskId: task.id,
      createdAt,
      updatedAt: createdAt,
      status: 'pending',
      name: `Run ${skillId}`,
      skill: skillId,
      input: {
        text: inputText,
        metadata: {
          taskId: task.id,
          expectedEcho,
        },
      },
      metadata: {
        expectedEcho,
        policyBlock: getBooleanMetadata(task, 'policyBlock'),
        policyEscalate: getBooleanMetadata(task, 'policyEscalate'),
      },
    },
  };
};
