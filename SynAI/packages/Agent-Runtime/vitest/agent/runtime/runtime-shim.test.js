import { describe, expect, it } from 'vitest';
import { InMemoryAgentRuntimeStateStore as CanonicalStateStore, runAgentTask as canonicalRunAgentTask } from '@agent-runtime/runtime';
import { InMemoryAgentRuntimeStateStore, runAgentTask } from '@synai-agent/runtime';
describe('agent runtime shim exports', () => {
    it('re-exports the canonical runtime surface without divergence', () => {
        expect(runAgentTask).toBe(canonicalRunAgentTask);
        expect(typeof runAgentTask).toBe('function');
        expect(typeof canonicalRunAgentTask).toBe('function');
        const store = new InMemoryAgentRuntimeStateStore();
        const canonicalStore = new CanonicalStateStore();
        expect(typeof store.saveJob).toBe('function');
        expect(typeof store.saveCheckpoint).toBe('function');
        expect(typeof canonicalStore.saveJob).toBe('function');
        expect(typeof canonicalStore.saveCheckpoint).toBe('function');
    });
});
