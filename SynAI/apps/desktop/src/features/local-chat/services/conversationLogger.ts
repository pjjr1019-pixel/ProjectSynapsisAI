/**
 * Conversation Logger Service
 * 
 * Captures and persists all chat conversations (prompts + replies) to a file.
 * Intended to run in the main process with file system access.
 */

import type { ChatMessage } from "@contracts";

export interface ConversationLogEntry {
  timestamp: string;
  conversationId: string;
  turn: number;
  userPrompt: string;
  assistantReply: string;
  model?: string;
  settings?: {
    responseMode?: string;
    ragEnabled?: boolean;
    webSearchEnabled?: boolean;
    codingModeEnabled?: boolean;
    highQualityModeEnabled?: boolean;
  };
  metadata?: {
    requestId?: string;
    tokens?: number;
    reasoningProfile?: string;
  };
}

export interface ConversationHistory {
  version: "1.0";
  createdAt: string;
  lastUpdated: string;
  totalTurns: number;
  entries: ConversationLogEntry[];
}

/**
 * Build a conversation log entry from messages
 */
export const buildConversationLogEntry = (
  conversationId: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  turn: number,
  model?: string,
  settings?: any,
  metadata?: any
): ConversationLogEntry => {
  return {
    timestamp: new Date().toISOString(),
    conversationId,
    turn,
    userPrompt: userMessage.content,
    assistantReply: assistantMessage.content,
    model,
    settings,
    metadata
  };
};

/**
 * Create an empty conversation history object
 */
export const createEmptyConversationHistory = (): ConversationHistory => ({
  version: "1.0",
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  totalTurns: 0,
  entries: []
});

/**
 * Add an entry to conversation history
 */
export const addConversationLogEntry = (
  history: ConversationHistory,
  entry: ConversationLogEntry
): ConversationHistory => {
  return {
    ...history,
    lastUpdated: new Date().toISOString(),
    totalTurns: history.entries.length + 1,
    entries: [...history.entries, entry]
  };
};

/**
 * Extract turn number from messages array
 */
export const extractTurnNumber = (messages: ChatMessage[]): number => {
  let userCount = 0;
  for (const msg of messages) {
    if (msg.role === "user") {
      userCount++;
    }
  }
  return userCount;
};

/**
 * Find matching user and assistant messages
 */
export const extractLatestExchange = (
  messages: ChatMessage[]
): { userMessage: ChatMessage | null; assistantMessage: ChatMessage | null } => {
  let userMessage: ChatMessage | null = null;
  let assistantMessage: ChatMessage | null = null;

  // Find the last user and assistant messages (in that order)
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && !assistantMessage) {
      assistantMessage = messages[i];
    }
    if (messages[i].role === "user" && !userMessage) {
      userMessage = messages[i];
    }
    if (userMessage && assistantMessage) {
      break;
    }
  }

  return { userMessage, assistantMessage };
};
