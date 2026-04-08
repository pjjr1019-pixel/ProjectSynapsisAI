import type { ChatMessage, ChatRole } from "../../../contracts/src/chat";
import type { WebSearchResult } from "../../../contracts/src/memory";
import { mutateDatabase, loadDatabase } from "./db";

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const listMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const db = await loadDatabase();
  return db.messages
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const addMessage = async (
  conversationId: string,
  role: ChatRole,
  content: string,
  sources?: WebSearchResult[]
): Promise<ChatMessage> => {
  const message: ChatMessage = {
    id: createId(),
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(sources && sources.length > 0 ? { sources } : {})
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
    const scoped = db.messages.filter((message) => message.conversationId === conversationId);
    const lastAssistant = [...scoped].reverse().find((message) => message.role === "assistant");
    if (!lastAssistant) {
      return db;
    }
    return {
      ...db,
      messages: db.messages.filter((message) => message.id !== lastAssistant.id)
    };
  });
};
