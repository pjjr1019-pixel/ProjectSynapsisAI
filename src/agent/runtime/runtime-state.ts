import type { AgentRuntimeRunResult, RuntimeCheckpoint, RuntimeJob } from '../contracts';

const cloneValue = <Value>(value: Value): Value => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as Value;
};

export interface AgentRuntimeStateStore {
  saveJob(job: RuntimeJob): RuntimeJob;
  saveCheckpoint(checkpoint: RuntimeCheckpoint): RuntimeCheckpoint;
}

export const cloneRuntimeJob = (job: RuntimeJob): RuntimeJob => cloneValue(job);

export const cloneRuntimeCheckpoint = (checkpoint: RuntimeCheckpoint): RuntimeCheckpoint =>
  cloneValue(checkpoint);

export const persistRuntimeRunResult = (
  store: AgentRuntimeStateStore | undefined,
  result: Pick<AgentRuntimeRunResult, 'job' | 'checkpoint'>,
): void => {
  if (!store) {
    return;
  }

  store.saveJob(cloneRuntimeJob(result.job));
  store.saveCheckpoint(cloneRuntimeCheckpoint(result.checkpoint));
};
