import { SkillRegistry } from '@agent-runtime/skills/SkillRegistry';
import { echoTextSkill } from '@agent-runtime/skills/mockSkills';

describe('SkillRegistry', () => {
  it('registers and retrieves a skill', () => {
    const reg = new SkillRegistry();
    reg.register(echoTextSkill);
    expect(reg.get('echo_text')).toBe(echoTextSkill);
  });

  it('throws on duplicate registration', () => {
    const reg = new SkillRegistry();
    reg.register(echoTextSkill);
    expect(() => reg.register(echoTextSkill)).toThrow();
  });

  it('lists all skills', () => {
    const reg = new SkillRegistry();
    reg.register(echoTextSkill);
    expect(reg.list()).toEqual([echoTextSkill]);
  });
});
