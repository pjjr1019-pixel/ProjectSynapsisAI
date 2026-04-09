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
import type { RagContextPreview } from "./rag";

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

export interface WebSearchResult {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: string | null;
}

export interface WebSearchContext {
  status: WebSearchStatus;
  query: string;
  results: WebSearchResult[];
  error?: string;
}

export interface ContextPreview {
  systemInstruction: string;
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
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
  rag?: RagContextPreview | null;
  grounding?: GroundingSummary | null;
  retrievalEval?: RetrievalEvalSummary | null;
  replyPolicy?: ChatReplyPolicy | null;
}
