import type { ChatMessage, PromptIntentContract } from "@contracts";
import { normalizePromptIntentContract } from "./intent-contract";

export interface PromptIntentPlannerInput {
  promptMessages: ChatMessage[];
  query: string;
  seedPromptIntent: PromptIntentContract;
}

export interface PromptIntentPlannerOptions extends PromptIntentPlannerInput {
  model?: string;
  runPlanner: (messages: ChatMessage[], options?: { model?: string }) => Promise<string>;
}

const extractJsonCandidate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

export const parsePromptIntentPlannerResponse = (
  plannerReply: string,
  fallback: PromptIntentContract
): PromptIntentContract => {
  const jsonCandidate = extractJsonCandidate(plannerReply);
  if (!jsonCandidate) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as Partial<PromptIntentContract>;
    return normalizePromptIntentContract(parsed, fallback);
  } catch {
    return fallback;
  }
};

export const createPromptIntentPlanningMessages = ({
  promptMessages,
  query,
  seedPromptIntent
}: PromptIntentPlannerInput): ChatMessage[] => [
  ...promptMessages,
  {
    id: "advanced-plan-system",
    conversationId: promptMessages[0]?.conversationId ?? "system",
    role: "system",
    createdAt: new Date().toISOString(),
    content: [
      "Refine the prompt intent before the final response.",
      "Use only retrieved evidence already in context.",
      "Return only one JSON object.",
      "Do not answer the user directly.",
      "Use this shape exactly:",
      JSON.stringify(seedPromptIntent, null, 2)
    ].join("\n")
  },
  {
    id: "advanced-plan-user",
    conversationId: promptMessages[0]?.conversationId ?? "system",
    role: "user",
    createdAt: new Date().toISOString(),
    content: [
      `Question to plan for: ${query}`,
      `Seed intent: ${JSON.stringify(seedPromptIntent)}`
    ].join("\n")
  }
];

export const planPromptIntent = async ({
  promptMessages,
  query,
  seedPromptIntent,
  model,
  runPlanner
}: PromptIntentPlannerOptions): Promise<PromptIntentContract> => {
  const plannerMessages = createPromptIntentPlanningMessages({
    promptMessages,
    query,
    seedPromptIntent
  });
  const plannerReply = await runPlanner(plannerMessages, model ? { model } : undefined);
  return parsePromptIntentPlannerResponse(plannerReply, seedPromptIntent);
};
