export const RAG_TOGGLE_MODES = ["inherit", "on", "off"] as const;

export type RagToggleMode = (typeof RAG_TOGGLE_MODES)[number];

export const WORKSPACE_INDEX_MODES = ["off", "incremental"] as const;

export type WorkspaceIndexMode = (typeof WORKSPACE_INDEX_MODES)[number];

export const REASONING_TRACE_STAGE_IDS = [
  "route",
  "retrieve-memory",
  "retrieve-workspace",
  "retrieve-awareness",
  "retrieve-web",
  "plan",
  "synthesize",
  "verify"
] as const;

export type ReasoningTraceStageId = (typeof REASONING_TRACE_STAGE_IDS)[number];

export const REASONING_TRACE_STAGE_STATUSES = ["pending", "running", "completed", "skipped", "error"] as const;

export type ReasoningTraceStageStatus = (typeof REASONING_TRACE_STAGE_STATUSES)[number];

export type RagExecutionMode = "fast" | "advanced";

export interface RagOptions {
  enabled?: RagToggleMode;
  useWeb?: RagToggleMode;
  showTrace?: RagToggleMode;
  defaultEnabled?: boolean;
  defaultUseWeb?: boolean;
  defaultShowTrace?: boolean;
  workspaceIndexingEnabled?: boolean;
}

export interface RetrievalSourceStats {
  memoryKeyword: number;
  memorySemantic: number;
  workspace: number;
  awareness: number;
  web: number;
  total: number;
}

export interface WorkspaceIndexStatus {
  enabled: boolean;
  ready: boolean;
  mode: WorkspaceIndexMode;
  workspaceRoot: string | null;
  indexPath: string | null;
  embeddingEnabled: boolean;
  fileCount: number;
  chunkCount: number;
  pendingFileCount: number;
  lastIndexedAt: string | null;
  detail: string | null;
}

export interface WorkspaceChunkHit {
  chunkId: string;
  path: string;
  relativePath: string;
  startLine: number;
  endLine: number;
  score: number;
  reason: "keyword" | "semantic" | "hybrid";
  excerpt: string;
}

export interface ReasoningTraceStageState {
  id: ReasoningTraceStageId;
  label: string;
  status: ReasoningTraceStageStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  summary: string | null;
  detail: string | null;
  sourceCount: number | null;
}

export interface ReasoningTraceSummary {
  mode: RagExecutionMode;
  triggerReason: string;
  confidence: "low" | "medium" | "high";
  totalDurationMs: number;
  retrieval: RetrievalSourceStats;
  groundedSourceCount: number;
  grounding?: import("./grounding").GroundingSummary | null;
  stages: ReasoningTraceStageState[];
}

export interface ReasoningTraceState {
  requestId: string;
  conversationId: string;
  mode: RagExecutionMode;
  triggerReason: string;
  visible: boolean;
  startedAt: string;
  completedAt: string | null;
  confidence: "low" | "medium" | "high";
  retrieval: RetrievalSourceStats;
  groundedSourceCount: number;
  grounding?: import("./grounding").GroundingSummary | null;
  stages: ReasoningTraceStageState[];
}

export interface ReasoningTraceEvent {
  requestId: string;
  conversationId: string;
  trace: ReasoningTraceState;
}

export interface RagContextPreview {
  enabled: boolean;
  mode: RagExecutionMode;
  triggerReason: string;
  retrieval: RetrievalSourceStats;
  traceSummary: ReasoningTraceSummary | null;
  workspaceIndex: WorkspaceIndexStatus | null;
  workspaceHits: WorkspaceChunkHit[];
}
