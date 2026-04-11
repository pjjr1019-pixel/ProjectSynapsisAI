import type { AgentTask, PromptIntentRuntimeBridge } from "@agent-runtime/contracts";
import { PROMPT_INTENT_BRIDGE_METADATA_KEY } from "@agent-runtime/contracts/prompt-intent-bridge.contracts";
import type {
  PromptIntentContract,
  PromptIntentAmbiguityFlag,
  PromptIntentRequiredCheck,
  RetrievedPromptBehaviorMemory
} from "@contracts";
import type { PromptTaskClassificationResult } from "./task-classifier";

const AMBIGUOUS_FIRST_TIME_FLAGS: PromptIntentAmbiguityFlag[] = [
  "low-route-confidence",
  "missing-evidence",
  "mixed-scope"
];

const hasRequiredCheck = (
  promptIntent: PromptIntentContract,
  check: PromptIntentRequiredCheck
): boolean => promptIntent.requiredChecks.includes(check);

export const isAmbiguousFirstTimeTaskPrompt = (promptIntent: PromptIntentContract): boolean =>
  hasRequiredCheck(promptIntent, "decompose-first-time-task") &&
  promptIntent.ambiguityFlags.some((flag) => AMBIGUOUS_FIRST_TIME_FLAGS.includes(flag));

export const shouldPersistResolvedPromptPattern = (
  promptIntent: PromptIntentContract,
  taskClassification: PromptTaskClassificationResult
): boolean => {
  if (taskClassification.categories.governed_action) {
    return false;
  }
  if (taskClassification.categories.time_sensitive) {
    return false;
  }
  if (taskClassification.categories.awareness_local_state) {
    return false;
  }
  return (
    promptIntent.intentFamily !== "windows-awareness" &&
    promptIntent.intentFamily !== "time-sensitive-live" &&
    promptIntent.intentFamily !== "workflow-governed" &&
    promptIntent.intentFamily !== "agent-runtime"
  );
};

export const buildPromptIntentRuntimeBridge = (
  promptIntent: PromptIntentContract,
  matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[]
): PromptIntentRuntimeBridge => {
  const preferenceIds = matchedPromptBehaviorMemories.map((entry) => entry.entry.id);
  const resolvedPatternId =
    matchedPromptBehaviorMemories.find((entry) => entry.entry.entryKind === "resolved_pattern")?.entry.id ?? null;
  const needsClarification = isAmbiguousFirstTimeTaskPrompt(promptIntent);

  return {
    version: 1,
    userGoal: promptIntent.userGoal,
    intentFamily: promptIntent.intentFamily,
    sourceScope: promptIntent.sourceScope,
    outputContract: {
      shape: promptIntent.outputContract.shape,
      length: promptIntent.outputContract.length,
      preserveExactStructure: promptIntent.outputContract.preserveExactStructure
    },
    ambiguityFlags: [...promptIntent.ambiguityFlags],
    requiredChecks: [...promptIntent.requiredChecks],
    clarification: {
      needed: needsClarification,
      questions: needsClarification
        ? [
            "Before running this first-time task, please confirm the exact target outcome and first step."
          ]
        : []
    },
    preferenceIds,
    resolvedPatternId
  };
};

export const attachPromptIntentBridgeToTask = (
  task: AgentTask,
  promptIntent: PromptIntentContract | null,
  matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[]
): AgentTask => {
  if (!promptIntent) {
    return task;
  }
  const metadata = task.metadata ?? {};
  if (metadata[PROMPT_INTENT_BRIDGE_METADATA_KEY]) {
    return task;
  }
  return {
    ...task,
    metadata: {
      ...metadata,
      [PROMPT_INTENT_BRIDGE_METADATA_KEY]: buildPromptIntentRuntimeBridge(
        promptIntent,
        matchedPromptBehaviorMemories
      )
    }
  };
};
