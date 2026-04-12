import { routeGovernedChatTask } from '../router';
import type { GovernedChatRouterInput } from '../router';

describe('Phase 6 Router', () => {
  it('routes answer-only intent', async () => {
    const input: GovernedChatRouterInput = {
      request: {
        requestId: 'test-1',
        conversationId: 'conv-1',
        text: 'What is my CPU usage?',
        messages: [],
        workspaceRoot: '',
        desktopPath: '',
        documentsPath: ''
      }
    };
    process.env.PHASE_6_REQUEST_ROUTER_SHADOW = '1';
    const result = await routeGovernedChatTask(input);
    expect(result.decision).toBe('answer');
    expect(result.artifacts.phase6Trace).toBeDefined();
  });

  it('routes unsupported intent', async () => {
    const input: GovernedChatRouterInput = {
      request: {
        requestId: 'test-2',
        conversationId: 'conv-2',
        text: 'Delete C:/Windows',
        messages: [],
        workspaceRoot: '',
        desktopPath: '',
        documentsPath: ''
      }
    };
    process.env.PHASE_6_REQUEST_ROUTER_SHADOW = '1';
    const result = await routeGovernedChatTask(input);
    expect(result.decision).toBe('unsupported');
    expect(result.artifacts.phase6Trace).toBeDefined();
  });

  it('routes clarify intent', async () => {
    const input: GovernedChatRouterInput = {
      request: {
        requestId: 'test-3',
        conversationId: 'conv-3',
        text: 'Delete that file',
        messages: [],
        workspaceRoot: '',
        desktopPath: '',
        documentsPath: ''
      }
    };
    process.env.PHASE_6_REQUEST_ROUTER_SHADOW = '1';
    const result = await routeGovernedChatTask(input);
    expect(result.decision === 'clarify' || result.decision === 'unsupported').toBeTruthy();
    expect(result.artifacts.phase6Trace).toBeDefined();
  });
});
