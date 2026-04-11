import type {
  AwarenessAnswerMode,
  AppHealth,
  ChatMessage,
  ContextPreview,
  Conversation,
  MemoryEntry,
  ModelHealth,
  PromptEvaluationResponse,
  ReasoningProfile,
  ReasoningTraceState,
  ResponseMode,
  ScreenAwarenessStatus
} from "@contracts";

export type HealthCheckState = "idle" | "running" | "success" | "failure";
export type WorkspaceTab = "chat" | "history" | "tools" | "settings";
export type WorkspaceToolTab = "model" | "actions" | "workflows" | "memory" | "context" | "search";

export interface ChatSettingsState {
  reasoningProfile: ReasoningProfile;
  selectedModel: string;
  defaultWebSearch: boolean;
  advancedRagEnabled: boolean;
  workspaceIndexingEnabled: boolean;
  webInRagEnabled: boolean;
  liveTraceVisible: boolean;
  responseMode: ResponseMode;
  awarenessAnswerMode: AwarenessAnswerMode;
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
  pendingReasoningTrace: ReasoningTraceState | null;
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  promptEvaluationRunning: boolean;
  promptEvaluationResult: PromptEvaluationResponse | null;
  promptEvaluationError: string | null;
  error: string | null;
}
