import { SkillInputSchema, SkillResultSchema } from '../contracts';
import { SkillRegistry } from './SkillRegistry';
export const echoTextSkill = {
    id: 'echo_text',
    name: 'Echo text',
    description: 'Echoes the input text back as output.',
    capability: 'echo',
    risk: 'none',
    sideEffect: 'none',
    preconditions: [],
    inputSchema: SkillInputSchema,
    resultSchema: SkillResultSchema,
    async execute(input, context) {
        const text = input.text ?? input.metadata?.['text'];
        if (typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Invalid input for echo_text skill');
        }
        return {
            success: true,
            output: {
                echoed: text,
                skillId: 'echo_text',
                agentId: context.agentId,
            },
            metadata: {
                taskId: context.taskId ?? null,
            },
        };
    },
};
export const mockOpenAppSkill = {
    id: 'mock_open_app',
    name: 'Mock open app',
    description: 'Pretends to open an app without touching the OS.',
    capability: 'mock-open-app',
    risk: 'high',
    sideEffect: 'none',
    preconditions: [],
    inputSchema: SkillInputSchema,
    resultSchema: SkillResultSchema,
    async execute(input, context) {
        const target = input.text ?? String(input.metadata?.['target'] ?? 'unknown');
        return {
            success: true,
            output: {
                opened: false,
                target,
                simulated: true,
                agentId: context.agentId,
            },
            metadata: {
                taskId: context.taskId ?? null,
            },
        };
    },
};
export const createDefaultSkillRegistry = () => {
    const registry = new SkillRegistry();
    registry.register(echoTextSkill);
    registry.register(mockOpenAppSkill);
    return registry;
};
