import type { AgentTask, PolicyDecision, SkillRiskLevel, TaskStep } from '../contracts';
import { createRuntimeId, nowIso } from '../core';

const readBoolean = (task: AgentTask, key: string): boolean => task.metadata?.[key] === true;

const readRiskLevel = (task: AgentTask): SkillRiskLevel | null => {
  const value = task.metadata?.risk;
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high' ? value : null;
};

export const evaluateTaskPolicy = (input: {
  task: AgentTask;
  step: TaskStep;
  skillRisk?: SkillRiskLevel | null;
  contextId?: string;
}): PolicyDecision => {
  const risk = input.skillRisk ?? readRiskLevel(input.task) ?? 'low';
  const createdAt = nowIso();

  if (readBoolean(input.task, 'policyBlock') || risk === 'medium') {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'block',
      reason: readBoolean(input.task, 'policyBlock')
        ? 'Task metadata requested a policy block.'
        : 'Medium-risk tasks are blocked in the Prompt 1 foundation.',
      metadata: {
        risk,
      },
    };
  }

  if (readBoolean(input.task, 'policyEscalate') || risk === 'high' || input.step.skill === 'mock_open_app') {
    return {
      id: createRuntimeId('policy'),
      decidedAt: createdAt,
      contextId: input.contextId ?? input.task.id,
      taskId: input.task.id,
      stepId: input.step.id,
      skillId: input.step.skill,
      type: 'escalate',
      reason: readBoolean(input.task, 'policyEscalate')
        ? 'Task metadata requested escalation.'
        : 'High-risk mock skills require escalation.',
      metadata: {
        risk,
      },
    };
  }

  return {
    id: createRuntimeId('policy'),
    decidedAt: createdAt,
    contextId: input.contextId ?? input.task.id,
    taskId: input.task.id,
    stepId: input.step.id,
    skillId: input.step.skill,
    type: 'allow',
    reason: 'Task is safe to execute in the no-op runtime.',
    metadata: {
      risk,
    },
  };
};
