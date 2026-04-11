import { createAgentTask } from '@agent-runtime/core';
import { runAgentTask } from '@agent-runtime/runtime/noop-runtime';
describe('runAgentTask state integration', () => {
    it('persists terminal runtime state into an optional runtime store', async () => {
        const savedJobs = [];
        const savedCheckpoints = [];
        const stateStore = {
            saveJob(job) {
                savedJobs.push({ id: job.id, status: job.status });
                return job;
            },
            getJob(jobId) {
                return undefined;
            },
            listJobs() {
                return [];
            },
            saveCheckpoint(checkpoint) {
                savedCheckpoints.push({ id: checkpoint.id, jobId: checkpoint.jobId });
                return checkpoint;
            },
            listCheckpoints(jobId) {
                return [];
            },
            getLatestCheckpoint(jobId) {
                return undefined;
            },
        };
        const { job, checkpoint } = await runAgentTask(createAgentTask({
            id: 'runtime-state-task',
            title: 'Persist runtime state',
            metadata: {
                inputText: 'hello',
            },
        }), {
            stateStore,
        });
        expect(savedJobs).toEqual([{ id: job.id, status: job.status }]);
        expect(savedCheckpoints).toEqual([{ id: checkpoint.id, jobId: job.id }]);
    });
});
