import { createAgentTask } from '../../../src/agent/core';
import { runAgentTask } from '../../../src/agent/runtime/noop-runtime';
import type { AgentRuntimeStateStore } from '../../../src/agent/runtime/runtime-state';

describe('runAgentTask state integration', () => {
  it('persists terminal runtime state into an optional runtime store', async () => {
    const savedJobs: Array<{ id: string; status: string }> = [];
    const savedCheckpoints: Array<{ id: string; jobId: string }> = [];

    const stateStore: AgentRuntimeStateStore = {
      saveJob(job) {
        savedJobs.push({ id: job.id, status: job.status });
        return job;
      },
      saveCheckpoint(checkpoint) {
        savedCheckpoints.push({ id: checkpoint.id, jobId: checkpoint.jobId });
        return checkpoint;
      },
    };

    const { job, checkpoint } = await runAgentTask(
      createAgentTask({
        id: 'runtime-state-task',
        title: 'Persist runtime state',
        metadata: {
          inputText: 'hello',
        },
      }),
      {
        stateStore,
      },
    );

    expect(savedJobs).toEqual([{ id: job.id, status: job.status }]);
    expect(savedCheckpoints).toEqual([{ id: checkpoint.id, jobId: job.id }]);
  });
});
