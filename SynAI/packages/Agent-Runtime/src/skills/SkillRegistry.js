export class SkillRegistry {
    skills = new Map();
    register(skill) {
        if (this.skills.has(skill.id)) {
            throw new Error(`Skill '${skill.id}' is already registered.`);
        }
        this.skills.set(skill.id, skill);
    }
    get(name) {
        return this.skills.get(name);
    }
    list() {
        return Array.from(this.skills.values());
    }
    findByCapability(capability) {
        return this.list().filter((skill) => skill.capability === capability);
    }
    findByRisk(risk) {
        return this.list().filter((skill) => skill.risk === risk);
    }
}
export * from './types';
