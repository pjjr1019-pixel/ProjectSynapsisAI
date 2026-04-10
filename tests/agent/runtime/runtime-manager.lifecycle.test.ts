import { createAgentTask } from '../../../src/agent/core';
import { InMemoryAuditStore } from '../../../src/agent/audit';
import { InMemoryAgentRuntimeStateStore } from '../../../src/agent/runtime/in-memory-runtime-state-store';
import { createAgentRuntimeService } from '../../../src/agent/runtime/runtime-manager';

describe('Agent runtime service lifecycle', () => {
  it('supports inspect, cancel, recover, and resume for persisted jobs', async () => {
    const stateStore = new InMemoryAgentRuntimeStateStore();
    const auditStore = new InMemoryAuditStore();
    const runtime = createAgentRuntimeService({
      stateStore,
      auditStore,
    });

    const blockedRun = await runtime.startTask(
      createAgentTask({
        id: 'lifecycle-blocked-task',
        title: 'Blocked lifecycle task',
        metadata: {
          policyBlock: true,
        },
      }),
    );

    const inspected = await runtime.inspectJob(blockedRun.job.id);
    expect(inspected?.job.status).toBe('blocked');
    expect(inspected?.result?.status).toBe('blocked');

    const cancelled = await runtime.cancelJob(blockedRun.job.id);
    expect(cancelled?.job.status).toBe('cancelled');

    const recovered = await runtime.recoverJob(blockedRun.job.id);
    expect(recovered?.latestCheckpoint?.phase).toBe('recovered');

    const resumed = await runtime.resumeJob(blockedRun.job.id);
    expect(resumed?.task.metadata?.['resumeOf']).toBe(blockedRun.job.id);
  });
});
