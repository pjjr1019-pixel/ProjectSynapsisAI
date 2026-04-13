/**
 * Phase 2: Traceable Runtime Logging - Central Schema
 * 
 * Defines hierarchical trace structure:
 * - RuntimeTrace (root): Captures per-turn metadata and references all stages
 * - TraceStage (nested): Captures one execution phase with stage-specific metadata
 * - TraceEvent: Individual events within a stage (for fine-grained tracking)
 * 
 * All timestamps in milliseconds since epoch.
 * All durations in milliseconds.
 */

/**
 * Individual stage event (fine-grained trace point)
 */
export interface TraceEvent {
  eventId: string;
  timestamp: number;
  type: string; // e.g., "pattern-detected", "item-retrieved", "api-call"
  payload: Record<string, any>;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Metadata specific to each instrumentation area
 */
export interface RouterStageMetadata {
  rawInput?: string;
  normalizedInput?: string;
  detectedPatterns?: string[]; // e.g., "browser-task", "service-control"
  chosenRoute?: string;
  confidence?: number;
  escalationFlag?: boolean;
}

export interface CapabilitySelectionMetadata {
  selectedCapabilities?: Array<{
    id: string;
    name: string;
    method?: string;
  }>;
  candidateCapabilities?: Array<{
    id: string;
    name: string;
    score?: number;
  }>;
  selectionReason?: string;
  selectionMethod?: string; // e.g., "catalog", "similarity", "manual"
}

export interface MemoryRetrievalMetadata {
  query?: string;
  matchedPatterns?: Array<{
    pattern: string;
    type: string; // "preference", "personal_fact", "project", etc.
  }>;
  retrievedItems?: Array<{
    type: string;
    reference: string; // e.g., "memory:123", "fact:xyz"
    confidence?: number;
  }>;
  retrievalMethod?: string;
  itemCount?: number;
}

export interface ContextAssemblyMetadata {
  contextSize?: number;
  appliedSkills?: string[];
  appliedOverlays?: string[]; // Guardrails, grounding policies
  contextSummary?: string; // Brief description of assembled context
}

export interface ModelSetupMetadata {
  modelName?: string;
  modelVersion?: string;
  provider?: string; // "ollama", "escalation", etc.
  healthCheckPerformed?: boolean;
  healthCheckStatus?: "healthy" | "degraded" | "unhealthy";
  escalationDecision?: boolean;
  escalationReason?: string;
  requestOptions?: {
    taskClass?: string;
    reason?: string;
    codingMode?: boolean;
    highQualityMode?: boolean;
    visionUsed?: boolean;
  };
}

export interface GroundingMetadata {
  appliedPolicies?: string[]; // Policy names applied
  modifications?: Array<{
    type: string;
    reason: string;
    originalSnippet?: string;
    modifiedSnippet?: string;
  }>;
  guardrailsActive?: boolean;
  guardrailsApplied?: string[];
}

export interface ExecutionMetadata {
  promptSnapshotSize?: number;
  promptPreview?: string; // First 200 chars of prompt
  rawModelOutput?: string;
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  latency?: number; // ms
  streamingEnabled?: boolean;
  chunkCount?: number; // if streaming
}

export interface VerificationMetadata {
  checksPerformed?: Array<{
    checkType: string; // "file-exists", "service-state", "action-result"
    target?: string;
    passed: boolean;
    evidence?: string;
  }>;
  overallScore?: number;
  reasonsSummary?: string[];
  expectedStateSummary?: string;
}

export interface ImprovementAnalysisMetadata {
  analysisClassification?: string;
  eventsGenerated?: Array<{
    eventId: string;
    type: string;
    status?: string;
  }>;
  suggestedImprovements?: string[];
  analysisScore?: number;
}

/**
 * Unified TraceStage with discriminated union for metadata
 */
export type TraceStageMetadata =
  | ({ stageType: "router" } & RouterStageMetadata)
  | ({ stageType: "capability-selection" } & CapabilitySelectionMetadata)
  | ({ stageType: "memory-retrieval" } & MemoryRetrievalMetadata)
  | ({ stageType: "context-assembly" } & ContextAssemblyMetadata)
  | ({ stageType: "model-setup" } & ModelSetupMetadata)
  | ({ stageType: "grounding" } & GroundingMetadata)
  | ({ stageType: "chat-execution" } & ExecutionMetadata)
  | ({ stageType: "verification" } & VerificationMetadata)
  | ({ stageType: "improvement-analysis" } & ImprovementAnalysisMetadata);

/**
 * Nested trace stage with parent reference
 */
export interface TraceStage {
  stageId: string;
  parentTraceId: string;
  stageType: string; // "router", "memory-retrieval", "execution", etc.
  name: string; // Human-readable name
  
  startTime: number; // ms since epoch
  endTime?: number;
  duration?: number; // ms
  
  metadata: TraceStageMetadata;
  events?: TraceEvent[]; // Fine-grained events within stage
  
  status: "started" | "completed" | "errored";
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  
  result?: any; // Stage-specific result payload
}

/**
 * Root trace capturing complete turn from input to output
 */
export interface RuntimeTrace {
  traceId: string;
  conversationId: string;
  turnId: number;
  
  timestamp: number; // Creation time, ms since epoch
  completedAt?: number; // When finalized
  userId?: string;
  
  status: "active" | "completed" | "failed";
  
  // Raw input/output
  rawUserInput: string;
  finalOutput?: string;
  finalOutputType?: string; // "text", "command", "clarification"
  
  // Instrumented stages (keyed by stage type or index)
  stages: Record<string, TraceStage>;
  
  // Overall metadata
  model?: string;
  provider?: string;
  escalationUsed?: boolean;
  taskRoute?: string; // Route decision from router
  
  // Metrics
  totalDuration?: number; // ms
  stageCount?: number;
  
  // Error tracking
  errors?: Array<{
    stage: string;
    message: string;
    timestamp: number;
  }>;
  
  // Improvement events referenced
  relatedImprovementEventIds?: string[];
}

/**
 * Light summary for CONVERSATION-HISTORY.json
 * Embedded in ConversationLogEntry.trace
 */
export interface ConversationTraceSummary {
  traceId: string;
  status: "active" | "completed" | "failed";
  stageCount: number;
  errorCount: number;
  totalDuration: number;
  model?: string;
  taskRoute?: string;
}

/**
 * Trace error tracking (for resilience)
 */
export interface TraceError {
  type: "persistence" | "parse" | "io";
  message: string;
  timestamp: number;
  recoverable: boolean;
}

/**
 * Session-level trace statistics
 */
export interface TraceSessionStats {
  sessionId: string;
  tracesCreated: number;
  tracesCompleted: number;
  tracesFailed: number;
  persistenceErrors: number;
  parseErrors: number;
  ioErrors: number;
  startTime: number;
  lastActivity: number;
}
