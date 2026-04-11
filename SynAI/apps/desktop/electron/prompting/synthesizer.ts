import type { ChatMessage, PromptIntentContract } from "@contracts";

const buildSynthesisNote = (promptIntent: PromptIntentContract): string =>
  [
    "Working prompt intent:",
    `Goal: ${promptIntent.userGoal}`,
    `Source scope: ${promptIntent.sourceScope}`,
    `Output: ${promptIntent.outputContract.shape} | ${promptIntent.outputContract.length}`,
    promptIntent.constraints.length > 0 ? `Constraints: ${promptIntent.constraints.join(" | ")}` : null,
    promptIntent.missingEvidence.length > 0
      ? `Missing evidence: ${promptIntent.missingEvidence.join(" | ")}`
      : null,
    promptIntent.requiredChecks.length > 0
      ? `Required checks: ${promptIntent.requiredChecks.join(" | ")}`
      : null,
    "Follow this intent, but only present the final grounded answer."
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");

export const createSynthesisMessages = (
  promptMessages: ChatMessage[],
  promptIntent: PromptIntentContract | null
): ChatMessage[] =>
  !promptIntent
    ? promptMessages
    : [
        ...promptMessages,
        {
          id: "advanced-plan-note",
          conversationId: promptMessages[0]?.conversationId ?? "system",
          role: "system",
          createdAt: new Date().toISOString(),
          content: buildSynthesisNote(promptIntent)
        }
      ];
