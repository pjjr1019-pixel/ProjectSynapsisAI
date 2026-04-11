import type { AwarenessIntentFamily } from "./awareness";
import type { ChatReplySourceScope } from "./chat";

export const PROMPT_INTENT_FAMILIES = [
  "general-chat",
  "generic-writing",
  "repo-grounded",
  "windows-awareness",
  "time-sensitive-live",
  "workflow-governed",
  "agent-runtime"
] as const;

export const PROMPT_INTENT_OUTPUT_SHAPES = [
  "direct-answer",
  "bullets",
  "labeled-sections",
  "exact-user-structure"
] as const;

export const PROMPT_INTENT_OUTPUT_LENGTHS = ["very-short", "short", "medium"] as const;

export const PROMPT_INTENT_AMBIGUITY_FLAGS = [
  "format-sensitive",
  "time-sensitive",
  "mixed-scope",
  "low-route-confidence",
  "missing-evidence"
] as const;

export const PROMPT_INTENT_MISSING_EVIDENCE = [
  "repo-evidence",
  "workspace-evidence",
  "awareness-evidence",
  "official-windows-evidence",
  "live-web-evidence"
] as const;

export const PROMPT_INTENT_REQUIRED_CHECKS = [
  "respect-source-scope",
  "preserve-user-structure",
  "state-uncertainty-when-evidence-is-missing",
  "cite-live-sources-when-helpful",
  "verify-local-machine-state",
  "avoid-awareness-routing",
  "decompose-first-time-task",
  "structure-open-ended-request"
] as const;

export type PromptIntentFamily =
  | (typeof PROMPT_INTENT_FAMILIES)[number]
  | AwarenessIntentFamily;
export type PromptIntentOutputShape = (typeof PROMPT_INTENT_OUTPUT_SHAPES)[number];
export type PromptIntentOutputLength = (typeof PROMPT_INTENT_OUTPUT_LENGTHS)[number];
export type PromptIntentAmbiguityFlag = (typeof PROMPT_INTENT_AMBIGUITY_FLAGS)[number];
export type PromptIntentMissingEvidence = (typeof PROMPT_INTENT_MISSING_EVIDENCE)[number];
export type PromptIntentRequiredCheck = (typeof PROMPT_INTENT_REQUIRED_CHECKS)[number];

export interface PromptIntentOutputContract {
  shape: PromptIntentOutputShape;
  length: PromptIntentOutputLength;
  preserveExactStructure: boolean;
}

export interface PromptIntentContract {
  intentFamily: PromptIntentFamily;
  userGoal: string;
  constraints: string[];
  sourceScope: ChatReplySourceScope;
  outputContract: PromptIntentOutputContract;
  ambiguityFlags: PromptIntentAmbiguityFlag[];
  missingEvidence: PromptIntentMissingEvidence[];
  requiredChecks: PromptIntentRequiredCheck[];
}
