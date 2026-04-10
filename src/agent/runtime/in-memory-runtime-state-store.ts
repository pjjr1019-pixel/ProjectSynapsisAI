import type { RuntimeCheckpoint, RuntimeJob } from '../contracts';

const cloneValue = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }

  if (value instanceof Map) {
    const clonedMap = new Map();
    seen.set(value, clonedMap);
    value.forEach((mapValue, mapKey) => {
      clonedMap.set(cloneValue(mapKey, seen), cloneValue(mapValue, seen));
    });
    return clonedMap as T;
  }

  if (value instanceof Set) {
    const clonedSet = new Set();
    seen.set(value, clonedSet);
    value.forEach((setValue) => {
      clonedSet.add(cloneValue(setValue, seen));
    });
    return clonedSet as T;
  }

  if (seen.has(value)) {
    return seen.get(value) as T;
  }

  if (Array.isArray(value)) {
    const clonedArray: unknown[] = [];
    seen.set(value, clonedArray);
    value.forEach((item, index) => {
      clonedArray[index] = cloneValue(item, seen);
    });
    return clonedArray as T;
  }

  const clonedObject: Record<string, unknown> = {};
  seen.set(value, clonedObject);
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    clonedObject[key] = cloneValue(item, seen);
  }
  return clonedObject as T;
};

export class InMemoryAgentRuntimeStateStore {
  private readonly jobs = new Map<string, RuntimeJob>();
  private readonly checkpoints: RuntimeCheckpoint[] = [];

  saveJob(job: RuntimeJob): RuntimeJob {
    const storedJob = cloneValue(job);
    this.jobs.set(storedJob.id, storedJob);
    return cloneValue(storedJob);
  }

  getJob(jobId: string): RuntimeJob | undefined {
    const job = this.jobs.get(jobId);
    return job ? cloneValue(job) : undefined;
  }

  listJobs(): RuntimeJob[] {
    return Array.from(this.jobs.values(), (job) => cloneValue(job));
  }

  saveCheckpoint(checkpoint: RuntimeCheckpoint): RuntimeCheckpoint {
    const storedCheckpoint = cloneValue(checkpoint);
    this.checkpoints.push(storedCheckpoint);
    return cloneValue(storedCheckpoint);
  }

  listCheckpoints(jobId: string): RuntimeCheckpoint[] {
    return this.checkpoints
      .filter((checkpoint) => checkpoint.jobId === jobId)
      .map((checkpoint) => cloneValue(checkpoint));
  }

  getLatestCheckpoint(jobId: string): RuntimeCheckpoint | undefined {
    for (let index = this.checkpoints.length - 1; index >= 0; index -= 1) {
      const checkpoint = this.checkpoints[index];
      if (checkpoint.jobId === jobId) {
        return cloneValue(checkpoint);
      }
    }

    return undefined;
  }
}
