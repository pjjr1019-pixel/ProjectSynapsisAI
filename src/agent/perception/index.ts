import type { ObservationSnapshot, PolicyDecision, TaskStep } from '../contracts';
import { createRuntimeId, nowIso } from '../core';
import type { StepExecutionOutcome } from '../executor';

export const captureObservationSnapshot = (input: {
  contextId: string;
  taskId: string;
  jobId: string;
  step: TaskStep;
  policyDecision: PolicyDecision;
  execution: StepExecutionOutcome | null;
}): ObservationSnapshot => ({
  id: createRuntimeId('obs'),
  takenAt: nowIso(),
  contextId: input.contextId,
  taskId: input.taskId,
  jobId: input.jobId,
  stepId: input.step.id,
  data: {
    taskId: input.taskId,
    stepId: input.step.id,
    skillId: input.step.skill,
    policyDecision: input.policyDecision.type,
    execution: input.execution
      ? {
          skillId: input.execution.skillId,
          executedAt: input.execution.executedAt,
          result: input.execution.result,
        }
      : null,
  },
  metadata: {
    status: input.step.status,
  },
});

