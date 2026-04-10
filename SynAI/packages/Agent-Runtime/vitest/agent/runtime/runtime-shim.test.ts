import { describe, expect, it } from 'vitest';
import { InMemoryAgentRuntimeStateStore, runAgentTask } from '@synai-agent/runtime';

describe('agent runtime shim exports', () => {
  it('re-exports the root runtime surface', () => {
    expect(typeof runAgentTask).toBe('function');

    const store = new InMemoryAgentRuntimeStateStore();
    expect(typeof store.saveJob).toBe('function');
    expect(typeof store.saveCheckpoint).toBe('function');
  });
});
