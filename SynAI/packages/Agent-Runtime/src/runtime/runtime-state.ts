import type { AgentRuntimeRunResult, RuntimeCheckpoint, RuntimeJob } from '../contracts';
import { cloneValue } from '../core';

export interface AgentRuntimeStateStore {
  saveJob(job: RuntimeJob): RuntimeJob | Promise<RuntimeJob>;
  getJob(jobId: string): RuntimeJob | undefined | Promise<RuntimeJob | undefined>;
  listJobs(): RuntimeJob[] | Promise<RuntimeJob[]>;
  saveCheckpoint(checkpoint: RuntimeCheckpoint): RuntimeCheckpoint | Promise<RuntimeCheckpoint>;
  listCheckpoints(jobId: string): RuntimeCheckpoint[] | Promise<RuntimeCheckpoint[]>;
  getLatestCheckpoint(jobId: string): RuntimeCheckpoint | undefined | Promise<RuntimeCheckpoint | undefined>;
}

export const cloneRuntimeJob = (job: RuntimeJob): RuntimeJob => cloneValue(job);

export const cloneRuntimeCheckpoint = (checkpoint: RuntimeCheckpoint): RuntimeCheckpoint =>
  cloneValue(checkpoint);

export const persistRuntimeRunResult = async (
  store: AgentRuntimeStateStore | undefined,
  result: Pick<AgentRuntimeRunResult, 'job' | 'checkpoint'>,
): Promise<void> => {
  if (!store) {
    return;
  }

  await Promise.resolve(store.saveJob(cloneRuntimeJob(result.job)));
  await Promise.resolve(store.saveCheckpoint(cloneRuntimeCheckpoint(result.checkpoint)));
};
