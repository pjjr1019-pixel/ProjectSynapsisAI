import type { z } from 'zod';
import type {
  ExecutionContext,
  SkillCapability,
  SkillInput,
  SkillResult,
  SkillRiskLevel,
  SkillSideEffect,
  SkillSpec,
} from '../contracts';

export type { SkillCapability, SkillInput, SkillResult, SkillRiskLevel, SkillSideEffect, SkillSpec };

export interface SkillDefinition<
  Input extends SkillInput = SkillInput,
  Result extends SkillResult = SkillResult,
> extends SkillSpec {
  capability: SkillCapability;
  risk: SkillRiskLevel;
  sideEffect: SkillSideEffect;
  preconditions: string[];
  inputSchema: z.ZodType<Input>;
  resultSchema: z.ZodType<Result>;
  execute: (input: Input, context: ExecutionContext) => Promise<Result>;
}

