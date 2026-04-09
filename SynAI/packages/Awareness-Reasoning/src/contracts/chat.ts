import type { ContextPreview, WebSearchResult } from "./memory";
import type { ModelHealth } from "./health";
import type { GroundingMetadata } from "./grounding";
import type {
  RagContextPreview,
  RagOptions,
  ReasoningTraceSummary
} from "./rag";
import type {
  AwarenessAnswerCard,
  AwarenessAnswerMode,
  AwarenessConfidenceLevel,
  AwarenessIntentFamily,
  AwarenessStartupDigest
} from "./awareness";

export type ChatRole = "system" | "user" | "assistant";
export type ResponseMode = "fast" | "balanced" | "smart";
export type ChatRunMode = "interactive" | "evaluation";
export type ChatEvaluationSuiteMode = "chat-only" | "windows-awareness";
export type ChatDiagnosticRouteFamily = AwarenessIntentFamily | "generic-writing";

export const CHAT_REPLY_SOURCE_SCOPES = [
  "repo-wide",
  "readme-only",
  "docs-only",
  "workspace-only",
  "awareness-only",
  "time-sensitive-live"
] as const;

export const CHAT_REPLY_FORMAT_POLICIES = ["default", "preserve-exact-structure"] as const;
export const CHAT_REPLY_GROUNDING_POLICIES = ["default", "source-boundary", "awareness-direct"] as const;
export const CHAT_REPLY_ROUTING_POLICIES = [
  "default",
  "chat-first-source-scoped",
  "windows-explicit-only"
] as const;

export type ChatReplySourceScope = (typeof CHAT_REPLY_SOURCE_SCOPES)[number];
export type ChatReplyFormatPolicy = (typeof CHAT_REPLY_FORMAT_POLICIES)[number];
export type ChatReplyGroundingPolicy = (typeof CHAT_REPLY_GROUNDING_POLICIES)[number];
export type ChatReplyRoutingPolicy = (typeof CHAT_REPLY_ROUTING_POLICIES)[number];

export interface ChatReplyPolicy {
  sourceScope: ChatReplySourceScope;
  formatPolicy: ChatReplyFormatPolicy;
  groundingPolicy: ChatReplyGroundingPolicy;
  routingPolicy: ChatReplyRoutingPolicy;
}

export interface ChatRetrievedSourceSummary {
  memoryCount: number;
  workspaceHitCount: number;
  workspacePaths: string[];
  awarenessSourceCount: number;
  webResultCount: number;
}

export interface ChatExecutionDiagnostics {
  routeFamily: ChatDiagnosticRouteFamily | null;
  routeConfidence: number | null;
  rawRouteFamily: AwarenessIntentFamily | null;
  rawRouteConfidence: number | null;
  awarenessUsed: boolean;
  deterministicAwareness: boolean;
  genericWritingPromptSuppressed: boolean;
  sourceScope: ChatReplySourceScope | null;
  replyPolicy: ChatReplyPolicy | null;
  cleanupBypassed: boolean;
  routingSuppressionReason: string | null;
  retrievedSourceSummary: ChatRetrievedSourceSummary | null;
  reasoningMode: RagContextPreview["mode"] | null;
  evaluationSuiteMode: ChatEvaluationSuiteMode | null;
}

export interface ChatMessageAwarenessMetadata {
  intentFamily?: AwarenessIntentFamily | null;
  answerMode?: AwarenessAnswerMode | null;
  query?: string | null;
  refreshEveryMs?: number | null;
  lastRefreshedAt?: string | null;
  confidenceLevel?: AwarenessConfidenceLevel | null;
  card?: AwarenessAnswerCard | null;
  startupDigest?: AwarenessStartupDigest | null;
}

export interface ChatMessageMetadata {
  awareness?: ChatMessageAwarenessMetadata | null;
  rag?: {
    mode: RagContextPreview["mode"];
    triggerReason: string;
    retrieval: RagContextPreview["retrieval"];
    traceSummary: ReasoningTraceSummary | null;
  } | null;
  grounding?: GroundingMetadata | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: WebSearchResult[];
  metadata?: ChatMessageMetadata;
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
  runMode?: ChatRunMode;
  evaluationSuiteMode?: ChatEvaluationSuiteMode;
  useWebSearch?: boolean;
  modelOverride?: string;
  responseMode?: ResponseMode;
  awarenessAnswerMode?: AwarenessAnswerMode;
  ragOptions?: RagOptions;
  replyPolicy?: Partial<ChatReplyPolicy>;
}

export interface SendChatResponse {
  conversation: Conversation;
  assistantMessage: ChatMessage;
  messages: ChatMessage[];
  contextPreview: ContextPreview;
  modelStatus: ModelHealth;
  diagnostics?: ChatExecutionDiagnostics;
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
