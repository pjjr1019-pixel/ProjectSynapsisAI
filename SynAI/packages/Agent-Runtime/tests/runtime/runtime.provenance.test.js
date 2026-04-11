import { createAgentTask } from '@agent-runtime/core';
import { runAgentTask } from '@agent-runtime/runtime/noop-runtime';
describe('Agent Runtime Provenance', () => {
    it('threads runtime provenance and metadata through the no-op runAgentTask flow', async () => {
        const environment = {
            runId: 'provenance-test-run',
            surface: 'jest',
        };
        const task = createAgentTask({
            id: 'provenance-task',
            title: 'Lock runtime provenance',
            metadata: { inputText: 'hello provenance' },
        });
        const { executionContext, job, policyDecision, checkpoint } = await runAgentTask(task, {
            environment,
        });
        expect(executionContext.environment).toEqual(environment);
        expect(executionContext.jobId).toBe(job.id);
        expect(policyDecision.contextId).toBe(executionContext.id);
        expect(checkpoint.jobId).toBe(job.id);
    });
});
