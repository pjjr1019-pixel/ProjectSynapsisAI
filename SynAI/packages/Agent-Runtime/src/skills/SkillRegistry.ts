import type { SkillCapability, SkillDefinition, SkillRiskLevel } from './types';

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill '${skill.id}' is already registered.`);
    }
    this.skills.set(skill.id, skill);
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  findByCapability(capability: SkillCapability): SkillDefinition[] {
    return this.list().filter((skill) => skill.capability === capability);
  }

  findByRisk(risk: SkillRiskLevel): SkillDefinition[] {
    return this.list().filter((skill) => skill.risk === risk);
  }
}

export * from './types';
