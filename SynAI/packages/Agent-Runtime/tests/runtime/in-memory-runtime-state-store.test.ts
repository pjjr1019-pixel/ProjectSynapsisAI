import { createRuntimeCheckpoint, createRuntimeJob } from '@agent-runtime/core';
import { InMemoryAgentRuntimeStateStore } from '@agent-runtime/runtime/in-memory-runtime-state-store';

describe('InMemoryAgentRuntimeStateStore', () => {
  it('saves, retrieves, and lists jobs by id', () => {
    const store = new InMemoryAgentRuntimeStateStore();
    const job = createRuntimeJob({
      id: 'job-1',
      taskId: 'task-1',
      status: 'running',
      stepIds: ['step-1'],
      metadata: { source: 'test' },
    });

    const saved = store.saveJob(job);

    expect(saved).toEqual(job);
    expect(store.getJob('job-1')).toEqual(job);
    expect(store.listJobs()).toEqual([job]);
  });

  it('clones jobs on write and read', () => {
    const store = new InMemoryAgentRuntimeStateStore();
    const job = createRuntimeJob({
      id: 'job-2',
      taskId: 'task-2',
      status: 'queued',
      metadata: { nested: { flag: true } },
    });

    store.saveJob(job);
    job.metadata = { nested: { flag: false } };

    const stored = store.getJob('job-2');
    expect(stored?.metadata).toEqual({ nested: { flag: true } });

    if (!stored) {
      throw new Error('Expected stored job to exist.');
    }

    stored.metadata = { nested: { flag: 'mutated' } };
    expect(store.getJob('job-2')?.metadata).toEqual({ nested: { flag: true } });
  });

  it('saves, filters, and returns the latest checkpoint for a job', () => {
    const store = new InMemoryAgentRuntimeStateStore();
    const first = createRuntimeCheckpoint({
      id: 'ckpt-1',
      jobId: 'job-3',
      createdAt: '2026-01-01T00:00:00.000Z',
      state: { phase: 'first' },
    });
    const second = createRuntimeCheckpoint({
      id: 'ckpt-2',
      jobId: 'job-3',
      createdAt: '2025-12-31T23:59:59.000Z',
      state: { phase: 'second' },
    });

    store.saveCheckpoint(first);
    store.saveCheckpoint(second);

    expect(store.listCheckpoints('job-3')).toEqual([first, second]);
    expect(store.getLatestCheckpoint('job-3')).toEqual(second);
  });

  it('clones checkpoints on write and read', () => {
    const store = new InMemoryAgentRuntimeStateStore();
    const checkpoint = createRuntimeCheckpoint({
      id: 'ckpt-3',
      jobId: 'job-4',
      continuation: {
        mode: 'reconstructed',
        resumable: false,
        sourceCheckpointId: 'ckpt-3',
        limitation: 'In-memory checkpoint clone test.',
      },
      state: { nested: { value: 1 } },
    });

    store.saveCheckpoint(checkpoint);
    checkpoint.state = { nested: { value: 2 } };

    const stored = store.getLatestCheckpoint('job-4');
    expect(stored?.state).toEqual({ nested: { value: 1 } });

    if (!stored) {
      throw new Error('Expected stored checkpoint to exist.');
    }

    stored.state = { nested: { value: 3 } };
    expect(store.listCheckpoints('job-4')[0].state).toEqual({ nested: { value: 1 } });
  });
});
