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
import type { PromptIntentContract } from "./prompt-intent";
import type { PlanningPolicy, ReasoningProfile } from "./reasoning-profile";

export type ChatRole = "system" | "user" | "assistant";
export type ResponseMode = "fast" | "balanced" | "smart";
export type ChatRunMode = "interactive" | "evaluation";
export type ChatEvaluationSuiteMode = "chat-only" | "windows-awareness";
export type ChatDiagnosticRouteFamily = AwarenessIntentFamily | "generic-writing";

export const CHAT_GOVERNED_TASK_DECISIONS = [
  "allow",
  "allow_with_verification",
  "require_approval",
  "deny",
  "clarify",
  "plan_only"
] as const;
export type ChatGovernedTaskDecision = (typeof CHAT_GOVERNED_TASK_DECISIONS)[number];

export const CHAT_GOVERNED_TASK_RISK_TIERS = ["tier-0", "tier-1", "tier-2", "tier-3", "tier-4"] as const;
export type ChatGovernedTaskRiskTier = (typeof CHAT_GOVERNED_TASK_RISK_TIERS)[number];

export const CHAT_GOVERNED_TASK_EXECUTORS = [
  "answer-only",
  "workflow-orchestrator",
  "desktop-actions",
  "browser-session",
  "history-replay",
  "approval-queue",
  "ui-automation",
  "service-control",
  "registry-control",
  "browser-automation",
  "none"
] as const;
export type ChatGovernedTaskExecutor = (typeof CHAT_GOVERNED_TASK_EXECUTORS)[number];

export interface ChatGovernedTaskApprovalState {
  required: boolean;
  pending: boolean;
  reason: string | null;
  approver: string | null;
  tokenId: string | null;
  expiresAt: string | null;
}

export interface ChatGovernedTaskClarification {
  question: string;
  missingFields?: string[];
  options?: string[];
}

export type ChatGovernedExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "simulated"
  | "clarification_needed"
  | "blocked"
  | "failed"
  | "denied";

export interface ChatGovernedTaskArtifact {
  kind:
    | "workflow-plan"
    | "desktop-action"
    | "verification"
    | "rollback"
    | "gap-classification"
    | "remediation-plan"
    | "history"
    | "audit";
  summary: string;
  path?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatGovernedTaskMetadata {
  requestId: string;
  interpretedIntent: string;
  actionType: string | null;
  riskTier: ChatGovernedTaskRiskTier;
  decision: ChatGovernedTaskDecision;
  requiresExecution: boolean;
  approvalRequired: boolean;
  approvalReason: string | null;
  denialReason: string | null;
  clarificationNeeded: string[];
  executionAllowed: boolean;
  verificationRequired: boolean;
  recommendedExecutor: ChatGovernedTaskExecutor;
  policyRulesTriggered: string[];
  reasoningSummary: string;
  approvalState: ChatGovernedTaskApprovalState;
  executionStatus?: ChatGovernedExecutionStatus | null;
  clarification?: ChatGovernedTaskClarification | null;
  executionSummary: string | null;
  verificationSummary: string | null;
  rollbackSummary: string | null;
  gapClass: string | null;
  remediationSummary: string | null;
  reportMarkdown?: string | null;
  reportSummary?: string | null;
  artifacts: ChatGovernedTaskArtifact[];
}

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
export const CHAT_REPLY_CLASSIFIER_CATEGORIES = [
  "repo_grounded",
  "exact_format",
  "awareness_local_state",
  "time_sensitive",
  "governed_action",
  "generic_writing",
  "first_time_task",
  "open_ended"
] as const;

export type ChatReplySourceScope = (typeof CHAT_REPLY_SOURCE_SCOPES)[number];
export type ChatReplyFormatPolicy = (typeof CHAT_REPLY_FORMAT_POLICIES)[number];
export type ChatReplyGroundingPolicy = (typeof CHAT_REPLY_GROUNDING_POLICIES)[number];
export type ChatReplyRoutingPolicy = (typeof CHAT_REPLY_ROUTING_POLICIES)[number];
export type ChatReplyClassifierCategory = (typeof CHAT_REPLY_CLASSIFIER_CATEGORIES)[number];
export type ChatReplyRepoGroundingSubtype = Extract<
  ChatReplySourceScope,
  "repo-wide" | "readme-only" | "docs-only" | "workspace-only"
>;

export interface ChatReplyPolicy {
  sourceScope: ChatReplySourceScope;
  formatPolicy: ChatReplyFormatPolicy;
  groundingPolicy: ChatReplyGroundingPolicy;
  routingPolicy: ChatReplyRoutingPolicy;
}

export type ChatReplyClassifierCategoryMap = Record<ChatReplyClassifierCategory, boolean>;

export interface ChatReplyTaskClassifierResult {
  categories: ChatReplyClassifierCategoryMap;
  repoGroundingSubtype: ChatReplyRepoGroundingSubtype;
}

export interface ChatReplyPolicyDiagnostics {
  rawSignals: string[];
  fallbackSignals: string[];
  classifier: ChatReplyTaskClassifierResult;
  chosenPolicy: ChatReplyPolicy;
  suppressionReasons: string[];
}

export interface ChatRetrievedSourceSummary {
  memoryCount: number;
  workspaceHitCount: number;
  workspacePaths: string[];
  awarenessSourceCount: number;
  webResultCount: number;
}

export interface ChatExecutionDiagnostics {
  reasoningProfile: ReasoningProfile;
  planningPolicy: PlanningPolicy | null;
  routeFamily: ChatDiagnosticRouteFamily | null;
  routeConfidence: number | null;
  rawRouteFamily: AwarenessIntentFamily | null;
  rawRouteConfidence: number | null;
  awarenessUsed: boolean;
  deterministicAwareness: boolean;
  genericWritingPromptSuppressed: boolean;
  sourceScope: ChatReplySourceScope | null;
  replyPolicy: ChatReplyPolicy | null;
  policyDiagnostics?: ChatReplyPolicyDiagnostics | null;
  cleanupBypassed: boolean;
  routingSuppressionReason: string | null;
  retrievedSourceSummary: ChatRetrievedSourceSummary | null;
  reasoningMode: RagContextPreview["mode"] | null;
  evaluationSuiteMode: ChatEvaluationSuiteMode | null;
  taskState?: ChatGovernedTaskMetadata | null;
  promptIntent?: PromptIntentContract | null;
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
  task?: ChatGovernedTaskMetadata | null;
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
  reasoningProfile?: ReasoningProfile;
  planningPolicy?: PlanningPolicy;
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
  taskState?: ChatGovernedTaskMetadata | null;
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
