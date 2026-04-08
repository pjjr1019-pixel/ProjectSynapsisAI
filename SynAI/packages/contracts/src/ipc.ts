import type {
  BackgroundSyncEvent,
  ChatStreamEvent,
  Conversation,
  ConversationWithMessages,
  SendChatRequest,
  SendChatResponse
} from "./chat";
import type { AppHealth, ModelHealth } from "./health";
import type { ContextPreview, MemoryEntry } from "./memory";

export const IPC_CHANNELS = {
  appHealth: "app:health",
  modelHealth: "model:health",
  sendChat: "chat:send",
  chatStream: "chat:stream",
  backgroundSync: "chat:background-sync",
  createConversation: "conversation:create",
  listConversations: "conversation:list",
  loadConversation: "conversation:load",
  clearConversation: "conversation:clear",
  deleteConversation: "conversation:delete",
  searchMemories: "memory:search",
  listMemories: "memory:list",
  deleteMemory: "memory:delete",
  contextPreview: "context:preview"
} as const;

export interface SynAIBridge {
  getAppHealth(): Promise<AppHealth>;
  getModelHealth(): Promise<ModelHealth>;
  sendChat(payload: SendChatRequest): Promise<SendChatResponse>;
  subscribeChatStream(listener: (event: ChatStreamEvent) => void): () => void;
  subscribeBackgroundSync(listener: (event: BackgroundSyncEvent) => void): () => void;
  createConversation(): Promise<ConversationWithMessages>;
  listConversations(): Promise<Conversation[]>;
  loadConversation(conversationId: string): Promise<ConversationWithMessages | null>;
  clearConversation(conversationId: string): Promise<ConversationWithMessages>;
  deleteConversation(conversationId: string): Promise<void>;
  searchMemories(query: string): Promise<MemoryEntry[]>;
  listMemories(): Promise<MemoryEntry[]>;
  deleteMemory(memoryId: string): Promise<void>;
  getContextPreview(conversationId: string, latestUserMessage: string): Promise<ContextPreview>;
}
