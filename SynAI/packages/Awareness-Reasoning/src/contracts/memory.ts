import type {
  AwarenessAnswerMode,
  AwarenessConfidenceLevel,
  AwarenessDigest,
  AwarenessGroundingStatus,
  OfficialKnowledgeContext,
  AwarenessQueryAnswer,
  AwarenessStartupDigest,
  FileAwarenessSummary,
  MachineAwarenessSummary,
  ScreenAwarenessSummary
} from "./awareness";
import type { ChatReplyPolicy } from "./chat";
import type { GroundingSummary, RetrievalEvalSummary } from "./grounding";
import type { AwarenessRuntimeHealth } from "./health";
import type { PromptIntentContract } from "./prompt-intent";
import type { RetrievedPromptBehaviorMemory } from "./prompt-preferences";
import type { RagContextPreview } from "./rag";
import type { PlanningPolicy, ReasoningProfile } from "./reasoning-profile";
import type {
  PolicyDecisionType,
  RuntimeContinuationMode,
  RuntimeJobStatus,
  RuntimeOutcomeStatus,
  VerificationStatus
} from "@agent-runtime/contracts/agent-runtime.contracts";

export type MemoryCategory =
  | "preference"
  | "personal_fact"
  | "project"
  | "goal"
  | "constraint"
  | "decision"
  | "note";

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  text: string;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
  importance: number;
  archived: boolean;
  keywords: string[];
  provenance?: {
    sourceConversationId: string;
    sourceKind: "conversation" | "replay" | "manual";
    capturedAt: string;
    sourceMessageCount: number | null;
  } | null;
  lifecycle?: {
    status: "active" | "archived";
    reviewStatus: "unreviewed" | "reviewed" | "promoted" | "suppressed";
    archivedAt: string | null;
  } | null;
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  text: string;
  sourceMessageCount: number;
  updatedAt: string;
}

export interface RetrievedMemory {
  memory: MemoryEntry;
  score: number;
  reason: "keyword" | "semantic";
}

export type WebSearchStatus = "off" | "used" | "no_results" | "error";

export const WEB_SEARCH_SOURCE_FAMILIES = [
  "news",
  "web",
  "official-doc",
  "authoritative"
] as const;

export type WebSearchSourceFamily = (typeof WEB_SEARCH_SOURCE_FAMILIES)[number];

export interface WebSearchResult {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: string | null;
  sourceFamily?: WebSearchSourceFamily | null;
}

export interface WebSearchContext {
  status: WebSearchStatus;
  query: string;
  results: WebSearchResult[];
  error?: string;
}

export interface AgentRuntimePreviewSummary {
  jobId: string;
  taskId: string;
  taskTitle: string;
  jobStatus: RuntimeJobStatus;
  resultStatus?: RuntimeOutcomeStatus | null;
  plannedStepCount: number;
  attemptCount: number;
  resumeCount: number;
  recoverable: boolean;
  cancellable: boolean;
  policyDecisionType?: PolicyDecisionType | null;
  verificationStatus?: VerificationStatus | null;
  checkpointId?: string | null;
  checkpointSummary?: string | null;
  latestObservationSummary?: string | null;
  bindingHash?: string | null;
  continuationMode?: RuntimeContinuationMode | null;
  continuationResumable?: boolean | null;
  auditEventCount: number;
  updatedAt: string;
}

export interface ContextPreview {
  reasoningProfile?: ReasoningProfile | null;
  planningPolicy?: PlanningPolicy | null;
  reasoningProfileDiagnostics?: {
    planningReason: string | null;
    retrievalMode: "light" | "balanced" | "deep";
    governedTaskPosture: "answer-first" | "research-grounded" | "governed-task-first";
  } | null;
  systemInstruction: string;
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
  promptBehaviorMemories?: RetrievedPromptBehaviorMemory[];
  workspaceHits?: RagContextPreview["workspaceHits"];
  summarySnippet: string;
  recentMessagesCount: number;
  estimatedChars: number;
  webSearch: WebSearchContext;
  awareness?: AwarenessDigest | null;
  awarenessQuery?: AwarenessQueryAnswer | null;
  awarenessAnswerMode?: AwarenessAnswerMode | null;
  awarenessGrounding?: {
    status: AwarenessGroundingStatus;
    confidenceLevel: AwarenessConfidenceLevel;
    isFresh: boolean;
    ageMs: number;
    traceCount: number;
  } | null;
  officialKnowledge?: OfficialKnowledgeContext | null;
  machineAwareness?: MachineAwarenessSummary | null;
  fileAwareness?: FileAwarenessSummary | null;
  screenAwareness?: ScreenAwarenessSummary | null;
  startupDigest?: AwarenessStartupDigest | null;
  awarenessRuntime?: AwarenessRuntimeHealth | null;
  runtimePreview?: AgentRuntimePreviewSummary | null;
  rag?: RagContextPreview | null;
  grounding?: GroundingSummary | null;
  retrievalEval?: RetrievalEvalSummary | null;
  replyPolicy?: ChatReplyPolicy | null;
  promptIntent?: PromptIntentContract | null;
}
