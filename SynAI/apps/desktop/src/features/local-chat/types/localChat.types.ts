import type {
  AppHealth,
  ChatMessage,
  ContextPreview,
  Conversation,
  MemoryEntry,
  ModelHealth
} from "@contracts";

export type HealthCheckState = "idle" | "running" | "success" | "failure";

export interface LocalChatState {
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  contextPreview: ContextPreview | null;
  memories: MemoryEntry[];
  loading: boolean;
  pendingRequestId: string | null;
  pendingAssistantId: string | null;
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  error: string | null;
}
