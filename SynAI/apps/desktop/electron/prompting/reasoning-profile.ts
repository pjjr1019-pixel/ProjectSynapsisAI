import type { PlanningPolicy, RagExecutionMode, ReasoningProfile, ResponseMode } from "@contracts";
import { DEFAULT_REASONING_PROFILE, isPlanningPolicy, isReasoningProfile } from "@contracts";
import type { PromptTaskClassificationResult } from "./task-classifier";

export interface ReasoningProfileBehavior {
  profile: ReasoningProfile;
  defaultPlanningPolicy: PlanningPolicy;
  retrievalMode: "light" | "balanced" | "deep";
  governedTaskPosture: "answer-first" | "research-grounded" | "governed-task-first";
  contextBudget: {
    maxChars: number;
    maxStableMemories: number;
    maxRetrievedMemories: number;
    maxRecentMessages: number;
    maxPromptBehaviorMemories: number;
    maxWorkspaceHits: number;
    maxWebResults: number;
  };
  retrieval: {
    semanticMemory: boolean;
    keywordMemoryLimit: number;
    semanticMemoryLimit: number;
    maxRetrievedMemories: number;
    stableMemoryLimit: number;
    promptBehaviorMemoryLimit: number;
    workspaceHitLimit: number;
    awarenessConfidenceThreshold: number;
    allowAwarenessWhenRelevant: boolean;
  };
  webSearch: {
    forceOnTimeSensitive: boolean;
  };
  reply: {
    defaultResponseMode: ResponseMode;
    conciseByDefault: boolean;
    taskOriented: boolean;
  };
  grounding: {
    runModelVerifier: boolean;
  };
  planning: {
    forceOnFirstTimeTask: boolean;
    forceOnRepoGroundedResearch: boolean;
  };
  governance: {
    clarifyBroadTargets: boolean;
    preferGovernedTaskFraming: boolean;
  };
}

export interface ResolvedReasoningProfileState {
  reasoningProfile: ReasoningProfile;
  planningPolicy: PlanningPolicy;
  planningReason: string;
  behavior: ReasoningProfileBehavior;
}

const PROFILE_BEHAVIORS: Record<ReasoningProfile, ReasoningProfileBehavior> = {
  chat: {
    profile: "chat",
    defaultPlanningPolicy: "off",
    retrievalMode: "light",
    governedTaskPosture: "answer-first",
    contextBudget: {
      maxChars: 5200,
      maxStableMemories: 4,
      maxRetrievedMemories: 4,
      maxRecentMessages: 8,
      maxPromptBehaviorMemories: 2,
      maxWorkspaceHits: 2,
      maxWebResults: 2
    },
    retrieval: {
      semanticMemory: false,
      keywordMemoryLimit: 4,
      semanticMemoryLimit: 2,
      maxRetrievedMemories: 4,
      stableMemoryLimit: 6,
      promptBehaviorMemoryLimit: 2,
      workspaceHitLimit: 2,
      awarenessConfidenceThreshold: 0.5,
      allowAwarenessWhenRelevant: false
    },
    webSearch: {
      forceOnTimeSensitive: false
    },
    reply: {
      defaultResponseMode: "balanced",
      conciseByDefault: true,
      taskOriented: false
    },
    grounding: {
      runModelVerifier: false
    },
    planning: {
      forceOnFirstTimeTask: false,
      forceOnRepoGroundedResearch: false
    },
    governance: {
      clarifyBroadTargets: false,
      preferGovernedTaskFraming: false
    }
  },
  research: {
    profile: "research",
    defaultPlanningPolicy: "auto",
    retrievalMode: "deep",
    governedTaskPosture: "research-grounded",
    contextBudget: {
      maxChars: 9000,
      maxStableMemories: 6,
      maxRetrievedMemories: 10,
      maxRecentMessages: 12,
      maxPromptBehaviorMemories: 6,
      maxWorkspaceHits: 8,
      maxWebResults: 6
    },
    retrieval: {
      semanticMemory: true,
      keywordMemoryLimit: 8,
      semanticMemoryLimit: 8,
      maxRetrievedMemories: 10,
      stableMemoryLimit: 10,
      promptBehaviorMemoryLimit: 6,
      workspaceHitLimit: 8,
      awarenessConfidenceThreshold: 0.3,
      allowAwarenessWhenRelevant: true
    },
    webSearch: {
      forceOnTimeSensitive: true
    },
    reply: {
      defaultResponseMode: "smart",
      conciseByDefault: false,
      taskOriented: false
    },
    grounding: {
      runModelVerifier: true
    },
    planning: {
      forceOnFirstTimeTask: true,
      forceOnRepoGroundedResearch: true
    },
    governance: {
      clarifyBroadTargets: false,
      preferGovernedTaskFraming: false
    }
  },
  action: {
    profile: "action",
    defaultPlanningPolicy: "forced",
    retrievalMode: "balanced",
    governedTaskPosture: "governed-task-first",
    contextBudget: {
      maxChars: 7000,
      maxStableMemories: 5,
      maxRetrievedMemories: 7,
      maxRecentMessages: 10,
      maxPromptBehaviorMemories: 4,
      maxWorkspaceHits: 4,
      maxWebResults: 3
    },
    retrieval: {
      semanticMemory: true,
      keywordMemoryLimit: 6,
      semanticMemoryLimit: 6,
      maxRetrievedMemories: 7,
      stableMemoryLimit: 8,
      promptBehaviorMemoryLimit: 4,
      workspaceHitLimit: 4,
      awarenessConfidenceThreshold: 0.4,
      allowAwarenessWhenRelevant: true
    },
    webSearch: {
      forceOnTimeSensitive: false
    },
    reply: {
      defaultResponseMode: "balanced",
      conciseByDefault: true,
      taskOriented: true
    },
    grounding: {
      runModelVerifier: true
    },
    planning: {
      forceOnFirstTimeTask: true,
      forceOnRepoGroundedResearch: false
    },
    governance: {
      clarifyBroadTargets: true,
      preferGovernedTaskFraming: true
    }
  }
};

export const normalizeReasoningProfile = (
  value: ReasoningProfile | string | null | undefined
): ReasoningProfile => (isReasoningProfile(value) ? value : DEFAULT_REASONING_PROFILE);

export const normalizePlanningPolicy = (
  value: PlanningPolicy | string | null | undefined
): PlanningPolicy | null => (isPlanningPolicy(value) ? value : null);

export const getReasoningProfileBehavior = (
  profile: ReasoningProfile | string | null | undefined
): ReasoningProfileBehavior => PROFILE_BEHAVIORS[normalizeReasoningProfile(profile)];

export interface ResolveReasoningProfileStateInput {
  reasoningProfile: ReasoningProfile | string | null | undefined;
  requestedPlanningPolicy?: PlanningPolicy | string | null;
  reasoningMode: RagExecutionMode;
  taskClassification: PromptTaskClassificationResult;
}

export const resolveReasoningProfileState = (
  input: ResolveReasoningProfileStateInput
): ResolvedReasoningProfileState => {
  const reasoningProfile = normalizeReasoningProfile(input.reasoningProfile);
  const behavior = getReasoningProfileBehavior(reasoningProfile);
  const explicitPlanningPolicy = normalizePlanningPolicy(input.requestedPlanningPolicy);
  if (explicitPlanningPolicy) {
    return {
      reasoningProfile,
      behavior,
      planningPolicy: explicitPlanningPolicy,
      planningReason: "request-override"
    };
  }

  if (behavior.defaultPlanningPolicy === "forced") {
    return {
      reasoningProfile,
      behavior,
      planningPolicy: "forced",
      planningReason: "profile-default-forced"
    };
  }

  if (
    behavior.planning.forceOnFirstTimeTask &&
    input.taskClassification.categories.first_time_task
  ) {
    return {
      reasoningProfile,
      behavior,
      planningPolicy: "forced",
      planningReason: "first-time-task"
    };
  }

  if (
    behavior.planning.forceOnRepoGroundedResearch &&
    input.reasoningMode === "advanced" &&
    input.taskClassification.categories.repo_grounded
  ) {
    return {
      reasoningProfile,
      behavior,
      planningPolicy: "forced",
      planningReason: "repo-grounded-research"
    };
  }

  if (
    reasoningProfile === "chat" &&
    input.reasoningMode === "advanced" &&
    (input.taskClassification.categories.open_ended ||
      input.taskClassification.categories.first_time_task) &&
    !input.taskClassification.categories.generic_writing
  ) {
    return {
      reasoningProfile,
      behavior,
      planningPolicy: "auto",
      planningReason: "complex-chat-auto"
    };
  }

  return {
    reasoningProfile,
    behavior,
    planningPolicy: behavior.defaultPlanningPolicy,
    planningReason: "profile-default"
  };
};

export const shouldRunPlanningStage = (
  planningPolicy: PlanningPolicy,
  reasoningMode: RagExecutionMode
): boolean =>
  planningPolicy === "forced" || (planningPolicy === "auto" && reasoningMode === "advanced");

export interface ResolveProfileAwareWebSearchInput {
  resolvedUseWeb: boolean;
  taskClassification: PromptTaskClassificationResult;
  behavior: ReasoningProfileBehavior;
}

export const resolveProfileAwareWebSearch = (
  input: ResolveProfileAwareWebSearchInput
): boolean =>
  input.resolvedUseWeb ||
  (input.behavior.webSearch.forceOnTimeSensitive && input.taskClassification.categories.time_sensitive);

export interface ResolveAwarenessRoutingInput {
  explicitWindowsAwarenessPrompt: boolean;
  routeConfidence: number;
  hasRouteSignals: boolean;
  awarenessAnswerMode: "evidence-first" | "llm-primary";
  isEvaluationChatOnly: boolean;
  genericWritingPromptSuppressed: boolean;
  routingSuppressionReason: string | null;
  behavior: ReasoningProfileBehavior;
}

export const resolveAwarenessRouting = (input: ResolveAwarenessRoutingInput): {
  shouldQueryAwareness: boolean;
  shouldRefreshAwareness: boolean;
} => {
  if (
    input.isEvaluationChatOnly ||
    input.genericWritingPromptSuppressed ||
    input.routingSuppressionReason !== null
  ) {
    return {
      shouldQueryAwareness: false,
      shouldRefreshAwareness: false
    };
  }

  const routeRelevant =
    input.explicitWindowsAwarenessPrompt ||
    input.routeConfidence >= input.behavior.retrieval.awarenessConfidenceThreshold;
  const shouldQueryAwareness =
    routeRelevant &&
    (input.explicitWindowsAwarenessPrompt ||
      input.behavior.retrieval.allowAwarenessWhenRelevant ||
      input.awarenessAnswerMode === "evidence-first");
  const shouldRefreshAwareness =
    shouldQueryAwareness &&
    (input.explicitWindowsAwarenessPrompt || input.routeConfidence >= 0.45 || input.hasRouteSignals);

  return {
    shouldQueryAwareness,
    shouldRefreshAwareness
  };
};
