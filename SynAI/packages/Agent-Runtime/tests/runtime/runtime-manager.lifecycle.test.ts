import { createAgentTask } from '@agent-runtime/core';
import { InMemoryAuditStore } from '@agent-runtime/audit';
import { InMemoryAgentRuntimeStateStore } from '@agent-runtime/runtime/in-memory-runtime-state-store';
import { createAgentRuntimeService } from '@agent-runtime/runtime/runtime-manager';

describe('Agent runtime service lifecycle', () => {
  it('supports inspect, cancel, recover, and resume from persisted checkpoints without rerunning', async () => {
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
    expect(inspected?.latestCheckpoint?.continuation?.mode).toBe('reconstructed');
    expect(inspected?.latestCheckpoint?.continuation?.resumable).toBe(false);

    const cancelled = await runtime.cancelJob(blockedRun.job.id);
    expect(cancelled?.job.status).toBe('cancelled');
    expect(cancelled?.job.checkpointIds).toHaveLength(2);
    expect(cancelled?.latestCheckpoint?.phase).toBe('cancelled');
    expect(cancelled?.latestCheckpoint?.continuation?.mode).toBe('reconstructed');
    expect(cancelled?.latestCheckpoint?.continuation?.resumable).toBe(false);

    const recovered = await runtime.recoverJob(blockedRun.job.id);
    expect(recovered?.latestCheckpoint?.phase).toBe('recovered');
    expect(recovered?.job.checkpointIds).toHaveLength(3);
    expect(recovered?.latestCheckpoint?.continuation?.mode).toBe('reconstructed');

    const resumed = await runtime.resumeJob(blockedRun.job.id);
    expect(resumed?.task.metadata?.['resumeOf']).toBe(blockedRun.job.id);
    expect(resumed?.job.resumeCount).toBe(1);
    expect(resumed?.job.checkpointIds).toHaveLength(4);
    expect(resumed?.result.continuation?.mode).toBe('reconstructed');
    expect(resumed?.result.continuation?.resumable).toBe(false);
    expect(resumed?.result.summary).toContain('Resumed from checkpoint');
    expect(resumed?.executionAttempts).toHaveLength(blockedRun.executionAttempts.length);
    expect(resumed?.auditTrail.map((event) => `${event.stage}:${event.event}`)).toEqual(
      expect.arrayContaining(['runtime:resumed', 'checkpoint:saved']),
    );
  });
});
