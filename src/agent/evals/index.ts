import type { AgentTask, RuntimeOutcomeStatus } from '../contracts';
import { createAgentTask } from '../core';

export interface RuntimeEvalCase {
  name: string;
  task: AgentTask;
  expectedStatus: RuntimeOutcomeStatus;
}

export const buildNoopRuntimeEvalCases = (): RuntimeEvalCase[] => [
  {
    name: 'allow-echo',
    task: createAgentTask({
      id: 'eval-allow-echo',
      title: 'Echo the sample text',
      metadata: {
        inputText: 'hello',
      },
    }),
    expectedStatus: 'success',
  },
  {
    name: 'block-policy',
    task: createAgentTask({
      id: 'eval-block-policy',
      title: 'Block this task',
      metadata: {
        policyBlock: true,
      },
    }),
    expectedStatus: 'blocked',
  },
];

