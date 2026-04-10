import { createExecutionContext } from '../../../src/agent/core';
import { echoTextSkill } from '../../../src/agent/skills/mockSkills';

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
