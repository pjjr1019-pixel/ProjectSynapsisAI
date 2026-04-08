import type { ContextPreview, WebSearchResult } from "./memory";
import type { ModelHealth } from "./health";

export type ChatRole = "system" | "user" | "assistant";
export type ResponseMode = "fast" | "balanced" | "smart";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: WebSearchResult[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatRequest {
  conversationId: string;
  text: string;
  regenerate?: boolean;
  requestId?: string;
  useWebSearch?: boolean;
  modelOverride?: string;
  responseMode?: ResponseMode;
}

export interface SendChatResponse {
  conversation: Conversation;
  assistantMessage: ChatMessage;
  messages: ChatMessage[];
  contextPreview: ContextPreview;
  modelStatus: ModelHealth;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface ChatStreamEvent {
  requestId: string;
  conversationId: string;
  content: string;
}

export interface BackgroundSyncEvent {
  conversationId: string;
  conversations: Conversation[];
  modelStatus: ModelHealth;
}
