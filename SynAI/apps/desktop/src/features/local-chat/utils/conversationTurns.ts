import type { ChatMessage } from "@contracts";
import type { ConversationTurn } from "../types/localChat.types";

export const buildConversationTurns = (messages: ChatMessage[]): ConversationTurn[] => {
  const turns: ConversationTurn[] = [];
  let currentTurn: ConversationTurn | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      currentTurn = {
        index: turns.length,
        user: message,
        assistant: null
      };
      turns.push(currentTurn);
      continue;
    }

    if (message.role === "assistant") {
      if (!currentTurn) {
        currentTurn = {
          index: turns.length,
          user: null,
          assistant: message
        };
        turns.push(currentTurn);
        continue;
      }

      currentTurn.assistant = message;
    }
  }

  return turns;
};

export const getLatestConversationTurn = (messages: ChatMessage[]): ConversationTurn | null => {
  const turns = buildConversationTurns(messages);
  return turns.length > 0 ? turns[turns.length - 1] : null;
};
