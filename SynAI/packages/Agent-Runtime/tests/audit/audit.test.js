import { createAuditEvent, InMemoryAuditStore } from '@agent-runtime/audit/audit';
describe('InMemoryAuditStore', () => {
    it('emits and retrieves audit events', () => {
        const store = new InMemoryAuditStore();
        const event = createAuditEvent({
            taskId: 'task-1',
            stage: 'executor',
            event: 'executed',
            details: { skill: 'echo_text', result: 'ok' },
        });
        store.emit(event);
        expect(store.getAll()).toEqual([event]);
    });
});
