import type {
  PromptIntentFamily,
  PromptIntentOutputLength,
  PromptIntentOutputShape,
  PromptIntentRequiredCheck
} from "./prompt-intent";
import type { ChatReplySourceScope } from "./chat";

export type PromptBehaviorEntryKind = "behavior_preference" | "resolved_pattern";

export interface PromptBehaviorResolution {
  intentFamily: PromptIntentFamily;
  sourceScope: ChatReplySourceScope;
  outputShape: PromptIntentOutputShape;
  outputLength: PromptIntentOutputLength;
  preserveExactStructure: boolean;
  requiredChecks: PromptIntentRequiredCheck[];
}

export interface PromptBehaviorMemoryBase {
  id: string;
  entryKind: PromptBehaviorEntryKind;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  confidence: number;
  lastAppliedAt: string | null;
  matchKey: string;
  matchHints: string[];
  summary: string;
  resolution: PromptBehaviorResolution;
}

export interface PromptBehaviorPreferenceMemory extends PromptBehaviorMemoryBase {
  entryKind: "behavior_preference";
  preferenceLabel: string;
}

export interface PromptBehaviorResolvedPatternMemory extends PromptBehaviorMemoryBase {
  entryKind: "resolved_pattern";
  patternSummary: string;
}

export type PromptBehaviorMemoryEntry =
  | PromptBehaviorPreferenceMemory
  | PromptBehaviorResolvedPatternMemory;

export interface RetrievedPromptBehaviorMemory {
  entry: PromptBehaviorMemoryEntry;
  score: number;
  reason: "keyword" | "intent";
}

