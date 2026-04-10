import type { ObservationSnapshot, PolicyDecision, TaskStep } from '../contracts';
import { createObservationEvidence, createObservationSnapshot } from '../core';
import type { StepExecutionOutcome } from '../executor';

export const captureObservationSnapshot = (input: {
  contextId: string;
  taskId: string;
  jobId: string;
  step: TaskStep;
  policyDecision: PolicyDecision;
  execution: StepExecutionOutcome | null;
}): ObservationSnapshot => {
  const beforeData = {
    taskId: input.taskId,
    stepId: input.step.id,
    skillId: input.step.skill,
    policyDecision: input.policyDecision.type,
  };
  const executionData = input.execution
    ? {
        skillId: input.execution.skillId,
        executedAt: input.execution.executedAt,
        result: input.execution.result,
        attemptId: input.execution.attempt?.id,
      }
    : null;
  const afterData = {
    ...beforeData,
    execution: executionData,
  };

  return createObservationSnapshot({
    contextId: input.contextId,
    taskId: input.taskId,
    jobId: input.jobId,
    stepId: input.step.id,
    data: afterData,
    beforeData,
    afterData,
    comparison: {
      changed: executionData !== null,
      summary: executionData
        ? 'Execution produced observable output.'
        : `No execution output was produced because the step was ${input.step.status}.`,
      before: beforeData,
      after: afterData,
    },
    evidence: [
      createObservationEvidence({
        label: 'Policy state',
        summary: `Policy decision: ${input.policyDecision.type}`,
        source: 'policy',
        provenance: {
          sourceType: 'policy',
          sourceId: input.policyDecision.id,
          capturedBy: 'captureObservationSnapshot',
        },
        data: {
          type: input.policyDecision.type,
          reason: input.policyDecision.reason,
        },
      }),
      createObservationEvidence({
        label: 'Execution outcome',
        summary: executionData
          ? `Execution completed via ${input.execution?.skillId ?? input.step.skill}.`
          : 'Execution was skipped or unavailable.',
        source: executionData ? 'action-result' : 'runtime',
        provenance: {
          sourceType: executionData ? 'action-result' : 'runtime',
          sourceId: input.execution?.attempt?.id,
          adapterId: input.execution?.adapterId,
          capturedBy: 'captureObservationSnapshot',
        },
        data: executionData,
      }),
    ],
    metadata: {
      status: input.step.status,
    },
  });
};
