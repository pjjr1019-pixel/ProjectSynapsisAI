import { mkdtemp, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRuntimeCheckpoint, createRuntimeJob } from '../../../src/agent/core';
import { FileAgentRuntimeStateStore } from '../../../src/agent/runtime/file-runtime-state-store';

describe('FileAgentRuntimeStateStore', () => {
  it('persists and retrieves jobs plus checkpoints from disk', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'agent-runtime-store-'));

    try {
      const store = new FileAgentRuntimeStateStore(rootDir);
      const job = createRuntimeJob({
        id: 'job-file-1',
        taskId: 'task-file-1',
        status: 'running',
      });
      const checkpoint = createRuntimeCheckpoint({
        id: 'ckpt-file-1',
        jobId: job.id,
        phase: 'terminal',
        completedStepIds: [],
        state: {
          taskId: job.taskId,
        },
      });

      await store.saveJob(job);
      await store.saveCheckpoint(checkpoint);

      await expect(store.getJob(job.id)).resolves.toEqual(job);
      await expect(store.listJobs()).resolves.toEqual([job]);
      await expect(store.listCheckpoints(job.id)).resolves.toEqual([checkpoint]);
      await expect(store.getLatestCheckpoint(job.id)).resolves.toEqual(checkpoint);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
