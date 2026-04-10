import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { RuntimeCheckpoint, RuntimeJob } from '../contracts';
import { cloneValue } from '../core';
import type { AgentRuntimeStateStore } from './runtime-state';

const readJsonFile = async <Value>(filePath: string, fallback: Value): Promise<Value> => {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as Value;
  } catch {
    return fallback;
  }
};

export class FileAgentRuntimeStateStore implements AgentRuntimeStateStore {
  constructor(private readonly rootDir: string) {}

  private get jobsDir(): string {
    return path.join(this.rootDir, 'jobs');
  }

  private get checkpointsDir(): string {
    return path.join(this.rootDir, 'checkpoints');
  }

  private async ensureRoot(): Promise<void> {
    await mkdir(this.jobsDir, { recursive: true });
    await mkdir(this.checkpointsDir, { recursive: true });
  }

  private getJobPath(jobId: string): string {
    return path.join(this.jobsDir, `${jobId}.json`);
  }

  private getCheckpointPath(jobId: string, checkpointId: string): string {
    return path.join(this.checkpointsDir, jobId, `${checkpointId}.json`);
  }

  async saveJob(job: RuntimeJob): Promise<RuntimeJob> {
    await this.ensureRoot();
    const cloned = cloneValue(job);
    await writeFile(this.getJobPath(cloned.id), JSON.stringify(cloned, null, 2), 'utf8');
    return cloneValue(cloned);
  }

  async getJob(jobId: string): Promise<RuntimeJob | undefined> {
    await this.ensureRoot();
    const job = await readJsonFile<RuntimeJob | null>(this.getJobPath(jobId), null);
    return job ? cloneValue(job) : undefined;
  }

  async listJobs(): Promise<RuntimeJob[]> {
    await this.ensureRoot();
    const entries = await readdir(this.jobsDir).catch(() => []);
    const jobs = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) => readJsonFile<RuntimeJob | null>(path.join(this.jobsDir, entry), null)),
    );
    return jobs.filter((job): job is RuntimeJob => Boolean(job)).map((job) => cloneValue(job));
  }

  async saveCheckpoint(checkpoint: RuntimeCheckpoint): Promise<RuntimeCheckpoint> {
    await this.ensureRoot();
    const cloned = cloneValue(checkpoint);
    const targetDir = path.join(this.checkpointsDir, cloned.jobId);
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      this.getCheckpointPath(cloned.jobId, cloned.id),
      JSON.stringify(cloned, null, 2),
      'utf8',
    );
    return cloneValue(cloned);
  }

  async listCheckpoints(jobId: string): Promise<RuntimeCheckpoint[]> {
    await this.ensureRoot();
    const targetDir = path.join(this.checkpointsDir, jobId);
    const entries = await readdir(targetDir).catch(() => []);
    const checkpoints = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) => readJsonFile<RuntimeCheckpoint | null>(path.join(targetDir, entry), null)),
    );
    return checkpoints
      .filter((checkpoint): checkpoint is RuntimeCheckpoint => Boolean(checkpoint))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((checkpoint) => cloneValue(checkpoint));
  }

  async getLatestCheckpoint(jobId: string): Promise<RuntimeCheckpoint | undefined> {
    const checkpoints = await this.listCheckpoints(jobId);
    const latest = checkpoints[checkpoints.length - 1];
    return latest ? cloneValue(latest) : undefined;
  }
}
