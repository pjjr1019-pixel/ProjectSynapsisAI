import type {
  AppHealth,
  ChatMessage,
  ContextPreview,
  Conversation,
  MemoryEntry,
  ModelHealth,
  ResponseMode,
  ScreenAwarenessStatus
} from "@contracts";

export type HealthCheckState = "idle" | "running" | "success" | "failure";
export type WorkspaceTab = "chat" | "history" | "tools" | "settings";
export type WorkspaceToolTab = "model" | "actions" | "memory" | "context" | "search";

export interface ChatSettingsState {
  selectedModel: string;
  defaultWebSearch: boolean;
  responseMode: ResponseMode;
}

export interface ConversationTurn {
  index: number;
  user: ChatMessage | null;
  assistant: ChatMessage | null;
}

export interface LocalChatState {
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  availableModels: string[];
  settings: ChatSettingsState;
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
