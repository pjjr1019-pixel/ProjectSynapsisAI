import type { ContextBudget } from "../types";

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxChars: 6000,
  maxStableMemories: 4,
  maxRetrievedMemories: 6,
  maxRecentMessages: 10,
  maxPromptBehaviorMemories: 4,
  maxWorkspaceHits: 4,
  maxWebResults: 4
};

export const resolveContextBudget = (
  override?: Partial<ContextBudget> | null
): ContextBudget => ({
  ...DEFAULT_CONTEXT_BUDGET,
  ...(override ?? {})
});

export const MAX_WEB_RESULTS_IN_PROMPT = DEFAULT_CONTEXT_BUDGET.maxWebResults ?? 4;

export const clipByChars = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars - 3)}...`;
