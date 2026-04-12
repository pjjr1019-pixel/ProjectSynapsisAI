// Phase 6: Attach RequestUnderstandingTrace to message metadata
import type { RequestUnderstandingTrace } from "../../../Governance-Execution/src/governed-chat/types";

import type { ChatMessage, ChatRole } from "../../contracts/chat";
import type { WebSearchResult } from "../../contracts/memory";
import { mutateDatabase, readDatabaseValue } from "./db";

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const listMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  return readDatabaseValue((db) =>
    db.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  );
};

export const addMessage = async (
  conversationId: string,
  role: ChatRole,
  content: string,
  sources?: WebSearchResult[],
  metadata?: ChatMessage["metadata"],
  phase6Trace?: RequestUnderstandingTrace
): Promise<ChatMessage> => {
  const message: ChatMessage = {
    id: createId(),
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(sources && sources.length > 0 ? { sources } : {}),
    ...(metadata ? { metadata } : {}),
    ...(phase6Trace ? { phase6Trace } : {})
  };
  await mutateDatabase((db) => ({
    ...db,
    messages: [...db.messages, message]
  }));
  return message;
};

export const clearMessages = async (conversationId: string): Promise<void> => {
  await mutateDatabase((db) => ({
    ...db,
    messages: db.messages.filter((message) => message.conversationId !== conversationId)
  }));
};

export const removeLastAssistantMessage = async (conversationId: string): Promise<void> => {
  await mutateDatabase((db) => {
    let lastAssistantIndex = -1;
    for (let index = db.messages.length - 1; index >= 0; index -= 1) {
      const message = db.messages[index];
      if (message.conversationId === conversationId && message.role === "assistant") {
        lastAssistantIndex = index;
        break;
      }
    }

    if (lastAssistantIndex < 0) {
      return db;
    }

    return {
      ...db,
      messages: [
        ...db.messages.slice(0, lastAssistantIndex),
        ...db.messages.slice(lastAssistantIndex + 1)
      ]
    };
  });
};

