import { z } from 'zod';

export const PROMPT_INTENT_BRIDGE_METADATA_KEY = 'promptIntentBridge';

export const PromptIntentBridgeSourceScopeSchema = z.enum([
  'repo-wide',
  'readme-only',
  'docs-only',
  'workspace-only',
  'awareness-only',
  'time-sensitive-live',
]);
export type PromptIntentBridgeSourceScope = z.infer<typeof PromptIntentBridgeSourceScopeSchema>;

export const PromptIntentBridgeOutputShapeSchema = z.enum([
  'direct-answer',
  'bullets',
  'labeled-sections',
  'exact-user-structure',
]);
export type PromptIntentBridgeOutputShape = z.infer<typeof PromptIntentBridgeOutputShapeSchema>;

export const PromptIntentBridgeOutputLengthSchema = z.enum(['very-short', 'short', 'medium']);
export type PromptIntentBridgeOutputLength = z.infer<typeof PromptIntentBridgeOutputLengthSchema>;

export const PromptIntentBridgeIntentFamilySchema = z.enum([
  'general-chat',
  'generic-writing',
  'repo-grounded',
  'windows-awareness',
  'time-sensitive-live',
  'workflow-governed',
  'agent-runtime',
]);
export type PromptIntentBridgeIntentFamily = z.infer<typeof PromptIntentBridgeIntentFamilySchema>;

export const PromptIntentBridgeAmbiguityFlagSchema = z.enum([
  'format-sensitive',
  'time-sensitive',
  'mixed-scope',
  'low-route-confidence',
  'missing-evidence',
]);
export type PromptIntentBridgeAmbiguityFlag = z.infer<typeof PromptIntentBridgeAmbiguityFlagSchema>;

export const PromptIntentBridgeRequiredCheckSchema = z.enum([
  'respect-source-scope',
  'preserve-user-structure',
  'state-uncertainty-when-evidence-is-missing',
  'cite-live-sources-when-helpful',
  'verify-local-machine-state',
  'avoid-awareness-routing',
  'decompose-first-time-task',
  'structure-open-ended-request',
]);
export type PromptIntentBridgeRequiredCheck = z.infer<typeof PromptIntentBridgeRequiredCheckSchema>;

export const PromptIntentRuntimeBridgeSchema = z
  .object({
    version: z.literal(1),
    userGoal: z.string().min(1),
    intentFamily: PromptIntentBridgeIntentFamilySchema,
    sourceScope: PromptIntentBridgeSourceScopeSchema,
    outputContract: z
      .object({
        shape: PromptIntentBridgeOutputShapeSchema,
        length: PromptIntentBridgeOutputLengthSchema,
        preserveExactStructure: z.boolean(),
      })
      .strict(),
    ambiguityFlags: z.array(PromptIntentBridgeAmbiguityFlagSchema).default([]),
    requiredChecks: z.array(PromptIntentBridgeRequiredCheckSchema).default([]),
    clarification: z
      .object({
        needed: z.boolean(),
        questions: z.array(z.string().min(1)).default([]),
      })
      .strict(),
    preferenceIds: z.array(z.string().min(1)).default([]),
    resolvedPatternId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type PromptIntentRuntimeBridge = z.infer<typeof PromptIntentRuntimeBridgeSchema>;

export const AgentTaskPromptIntentBridgeMetadataSchema = z
  .object({
    [PROMPT_INTENT_BRIDGE_METADATA_KEY]: PromptIntentRuntimeBridgeSchema.optional(),
  })
  .passthrough();
export type AgentTaskPromptIntentBridgeMetadata = z.infer<typeof AgentTaskPromptIntentBridgeMetadataSchema>;
