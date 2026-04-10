import { createExecutionContext } from '@agent-runtime/core';
import { echoTextSkill } from '@agent-runtime/skills/mockSkills';

describe('echoTextSkill', () => {
  it('echoes input text', async () => {
    const result = await echoTextSkill.execute({ text: 'hello' }, createExecutionContext({ agentId: 'test-agent', taskId: 'skill-test' }));
    expect(result).toMatchObject({
      success: true,
      output: {
        echoed: 'hello',
      },
    });
  });
});
