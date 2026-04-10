import type { ExecutionContext, SkillResult, TaskStep } from '../contracts';
import { SkillRegistry } from '../skills/SkillRegistry';

export interface StepExecutionOutcome {
  skillId: string;
  input: unknown;
  result: SkillResult;
  executedAt: string;
}

export const executePlannedStep = async (
  step: TaskStep,
  registry: SkillRegistry,
  context: ExecutionContext,
): Promise<StepExecutionOutcome> => {
  const skill = registry.get(step.skill);
  if (!skill) {
    throw new Error(`Unknown skill: ${step.skill}`);
  }

  const input = skill.inputSchema.parse(step.input);
  const result = await skill.execute(input, context);
  const validated = skill.resultSchema.parse(result);

  return {
    skillId: skill.id,
    input,
    result: validated,
    executedAt: new Date().toISOString(),
  };
};

