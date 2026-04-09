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
import type { RagOptions, ReasoningTraceEvent } from "./rag";
import type { PromptEvaluationRequest, PromptEvaluationResponse } from "./prompt-eval";
import type {
  AwarenessAnswerMode,
  AwarenessEvent,
  AwarenessQueryAnswer,
  AwarenessQueryRequest,
  ForegroundWindowSnapshot,
  ScreenAwarenessStatus,
  ScreenUiTreeSnapshot,
  StartAssistModeOptions
} from "./awareness";

export const IPC_CHANNELS = {
  appHealth: "app:health",
  modelHealth: "model:health",
  listModels: "model:list",
  sendChat: "chat:send",
  chatStream: "chat:stream",
  reasoningTrace: "chat:reasoning-trace",
  backgroundSync: "chat:background-sync",
  createConversation: "conversation:create",
  listConversations: "conversation:list",
  loadConversation: "conversation:load",
  clearConversation: "conversation:clear",
  deleteConversation: "conversation:delete",
  searchMemories: "memory:search",
  listMemories: "memory:list",
  deleteMemory: "memory:delete",
  contextPreview: "context:preview",
  promptEvaluationRun: "prompt-eval:run",
  awarenessQuery: "awareness:query",
  screenStatus: "screen:status",
  screenForegroundWindow: "screen:foreground-window",
  screenUiTree: "screen:ui-tree",
  screenLastEvents: "screen:last-events",
  screenStartAssist: "screen:start-assist",
  screenStopAssist: "screen:stop-assist"
} as const;

export interface SynAIBridge {
  getAppHealth(): Promise<AppHealth>;
  getModelHealth(modelOverride?: string): Promise<ModelHealth>;
  listAvailableModels(): Promise<string[]>;
  sendChat(payload: SendChatRequest): Promise<SendChatResponse>;
  subscribeChatStream(listener: (event: ChatStreamEvent) => void): () => void;
  subscribeReasoningTrace(listener: (event: ReasoningTraceEvent) => void): () => void;
  subscribeBackgroundSync(listener: (event: BackgroundSyncEvent) => void): () => void;
  createConversation(): Promise<ConversationWithMessages>;
  listConversations(): Promise<Conversation[]>;
  loadConversation(conversationId: string): Promise<ConversationWithMessages | null>;
  clearConversation(conversationId: string): Promise<ConversationWithMessages>;
  deleteConversation(conversationId: string): Promise<void>;
  searchMemories(query: string): Promise<MemoryEntry[]>;
  listMemories(): Promise<MemoryEntry[]>;
  deleteMemory(memoryId: string): Promise<void>;
  runPromptEvaluation(payload: PromptEvaluationRequest): Promise<PromptEvaluationResponse>;
  queryAwareness(request: AwarenessQueryRequest): Promise<AwarenessQueryAnswer | null>;
  getContextPreview(
    conversationId: string,
    latestUserMessage: string,
    awarenessAnswerMode?: AwarenessAnswerMode,
    ragOptions?: RagOptions
  ): Promise<ContextPreview>;
  getScreenStatus(): Promise<ScreenAwarenessStatus>;
  getScreenForegroundWindow(): Promise<ForegroundWindowSnapshot | null>;
  getScreenUiTree(): Promise<ScreenUiTreeSnapshot | null>;
  getScreenLastEvents(): Promise<AwarenessEvent[]>;
  startAssistMode(options?: StartAssistModeOptions): Promise<ScreenAwarenessStatus>;
  stopAssistMode(reason?: string): Promise<ScreenAwarenessStatus>;
}
