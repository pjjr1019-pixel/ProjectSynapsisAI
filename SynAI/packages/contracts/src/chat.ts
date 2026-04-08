import type { ContextPreview } from "./memory";
import type { ModelHealth } from "./health";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
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
}

export interface SendChatResponse {
  conversation: Conversation;
  assistantMessage: ChatMessage;
  messages: ChatMessage[];
  contextPreview: ContextPreview;
  modelStatus: HealthStatus;
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
