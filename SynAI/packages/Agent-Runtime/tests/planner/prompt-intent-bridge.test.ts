import { createAgentTask } from '@agent-runtime/core';
import { planAgentTask } from '@agent-runtime/planner';
import { PROMPT_INTENT_BRIDGE_METADATA_KEY } from '@agent-runtime/contracts';

const createBridge = (overrides?: Partial<Record<string, unknown>>): Record<string, unknown> => ({
  version: 1,
  userGoal: 'Help me with a first-time setup task.',
  intentFamily: 'repo-grounded',
  sourceScope: 'repo-wide',
  outputContract: {
    shape: 'bullets',
    length: 'short',
    preserveExactStructure: false,
  },
  ambiguityFlags: ['missing-evidence'],
  requiredChecks: ['decompose-first-time-task'],
  clarification: {
    needed: true,
    questions: ['Please clarify which project area should be set up first.'],
  },
  preferenceIds: ['pref-1'],
  resolvedPatternId: null,
  ...(overrides ?? {}),
});

describe('planner prompt-intent bridge', () => {
  it('merges bridge clarification with operation clarification requirements', () => {
    const task = createAgentTask({
      id: 'bridge-clarify-desktop',
      title: 'Desktop action with prompt bridge',
      metadata: {
        desktopAction: {},
        [PROMPT_INTENT_BRIDGE_METADATA_KEY]: createBridge(),
      },
    });

    const planned = planAgentTask(task);

    expect(planned.plan.status).toBe('clarification_needed');
    expect(planned.plan.clarificationNeeded).toEqual([
      'Provide desktopAction.proposalId.',
      'Provide desktopAction.target.',
      'Please clarify which project area should be set up first.',
    ]);
    expect(planned.actionRequest.kind).toBe('desktop-action');
    expect(planned.actionRequest.actionId).toBe('desktop-action');
  });

  it('supports clarification_needed for ambiguous first-time skill tasks without changing action wiring', () => {
    const task = createAgentTask({
      id: 'bridge-clarify-skill',
      title: 'First time setup guidance',
      metadata: {
        skillId: 'echo_text',
        inputText: 'Please help with setup',
        [PROMPT_INTENT_BRIDGE_METADATA_KEY]: createBridge(),
      },
    });

    const planned = planAgentTask(task);

    expect(planned.plan.status).toBe('clarification_needed');
    expect(planned.plan.clarificationNeeded).toEqual([
      'Please clarify which project area should be set up first.',
    ]);
    expect(planned.actionRequest.kind).toBe('skill');
    expect(planned.actionRequest.actionId).toBe('echo_text');
  });

  it('ignores invalid bridge payloads and keeps existing planner behavior', () => {
    const task = createAgentTask({
      id: 'bridge-invalid',
      title: 'Invalid bridge data',
      metadata: {
        [PROMPT_INTENT_BRIDGE_METADATA_KEY]: {
          version: 'wrong',
        },
      },
    });

    const planned = planAgentTask(task);

    expect(planned.plan.status).toBe('planned');
    expect(planned.plan.clarificationNeeded).toEqual([]);
    expect(planned.actionRequest.kind).toBe('skill');
    expect(planned.actionRequest.actionId).toBe('echo_text');
  });
});

