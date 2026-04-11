import { mkdtemp, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileAuditStore, createAuditEvent } from '@agent-runtime/audit';
describe('FileAuditStore', () => {
    it('appends, retrieves, and filters audit events from disk', async () => {
        const rootDir = await mkdtemp(path.join(os.tmpdir(), 'agent-audit-store-'));
        try {
            const store = new FileAuditStore(rootDir);
            const runtimeEvent = {
                ...createAuditEvent({
                    taskId: 'task-audit-1',
                    jobId: 'job-audit-1',
                    stage: 'runtime',
                    event: 'started',
                }),
                id: 'audit-runtime-1',
                occurredAt: '2026-04-10T00:00:00.000Z',
            };
            const executorEvent = {
                ...createAuditEvent({
                    taskId: 'task-audit-1',
                    jobId: 'job-audit-1',
                    stage: 'executor',
                    event: 'executed',
                }),
                id: 'audit-executor-1',
                occurredAt: '2026-04-10T00:00:01.000Z',
            };
            const policyEvent = {
                ...createAuditEvent({
                    taskId: 'task-audit-2',
                    jobId: 'job-audit-2',
                    stage: 'policy',
                    event: 'allow',
                }),
                id: 'audit-policy-1',
                occurredAt: '2026-04-10T00:00:02.000Z',
            };
            await store.emit(runtimeEvent);
            await store.emit(executorEvent);
            await store.emit(policyEvent);
            await expect(store.getAll()).resolves.toEqual([runtimeEvent, executorEvent, policyEvent]);
            await expect(store.query({ taskId: 'task-audit-1' })).resolves.toEqual([
                runtimeEvent,
                executorEvent,
            ]);
            await expect(store.query({ jobId: 'job-audit-1', stage: 'executor' })).resolves.toEqual([
                executorEvent,
            ]);
            await expect(store.query({ stage: 'policy', limit: 1 })).resolves.toEqual([policyEvent]);
        }
        finally {
            await rm(rootDir, { recursive: true, force: true });
        }
    });
});
