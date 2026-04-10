import type { RuntimeCheckpoint, RuntimeJob } from '../contracts';
import { cloneValue } from '../core';
import type { AgentRuntimeStateStore } from './runtime-state';

export class InMemoryAgentRuntimeStateStore implements AgentRuntimeStateStore {
  private readonly jobs = new Map<string, RuntimeJob>();

  private readonly checkpointsByJob = new Map<string, RuntimeCheckpoint[]>();

  saveJob(job: RuntimeJob): RuntimeJob {
    const cloned = cloneValue(job);
    this.jobs.set(cloned.id, cloned);
    return cloneValue(cloned);
  }

  getJob(jobId: string): RuntimeJob | undefined {
    const job = this.jobs.get(jobId);
    return job ? cloneValue(job) : undefined;
  }

  listJobs(): RuntimeJob[] {
    return Array.from(this.jobs.values()).map((job) => cloneValue(job));
  }

  saveCheckpoint(checkpoint: RuntimeCheckpoint): RuntimeCheckpoint {
    const cloned = cloneValue(checkpoint);
    const existing = this.checkpointsByJob.get(cloned.jobId) ?? [];
    existing.push(cloned);
    this.checkpointsByJob.set(cloned.jobId, existing);
    return cloneValue(cloned);
  }

  listCheckpoints(jobId: string): RuntimeCheckpoint[] {
    return (this.checkpointsByJob.get(jobId) ?? []).map((checkpoint) => cloneValue(checkpoint));
  }

  getLatestCheckpoint(jobId: string): RuntimeCheckpoint | undefined {
    const checkpoints = this.checkpointsByJob.get(jobId) ?? [];
    const latest = checkpoints[checkpoints.length - 1];
    return latest ? cloneValue(latest) : undefined;
  }
}
