import type { ChatMessage } from "../../../contracts/src/chat";

export interface RollingSummaryResult {
  summary: string;
  summarizedCount: number;
}

export const buildRollingSummary = (
  messages: ChatMessage[],
  keepRecentMessages = 10
): RollingSummaryResult => {
  if (messages.length <= keepRecentMessages + 2) {
    return { summary: "", summarizedCount: 0 };
  }

  const cutoff = messages.length - keepRecentMessages;
  const older = messages.slice(0, cutoff);
  const lines = older.slice(-24).map((message) => {
    const role = message.role === "assistant" ? "Assistant" : "User";
    const text = message.content.replace(/\s+/g, " ").trim();
    return `- ${role}: ${text.slice(0, 180)}`;
  });

  return {
    summary: lines.join("\n"),
    summarizedCount: older.length
  };
};
