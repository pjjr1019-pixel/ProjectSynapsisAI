import type {
  ChatDiagnosticRouteFamily,
  ChatEvaluationSuiteMode,
  ChatReplyFormatPolicy,
  ChatReplyPolicy,
  ChatReplySourceScope,
  ChatRetrievedSourceSummary,
  ResponseMode
} from "./chat";
import type { AwarenessAnswerMode, AwarenessIntentFamily } from "./awareness";
import type { ModelHealth } from "./health";
import type { RagExecutionMode, RagOptions, ReasoningTraceSummary } from "./rag";

export const PROMPT_EVAL_DIFFICULTIES = ["easy", "medium", "hard", "edge"] as const;
export const PROMPT_EVAL_QUALITY_STATUSES = ["passed", "needs-review"] as const;
export const PROMPT_EVAL_CHECK_CATEGORIES = [
  "content",
  "format",
  "routing",
  "source-scope",
  "grounding",
  "unsupported-claim"
] as const;

export type PromptEvalDifficulty = (typeof PROMPT_EVAL_DIFFICULTIES)[number];
export type PromptEvaluationQualityStatus = (typeof PROMPT_EVAL_QUALITY_STATUSES)[number];
export type PromptEvaluationCheckCategory = (typeof PROMPT_EVAL_CHECK_CATEGORIES)[number];

export const PROMPT_EVAL_CHECK_KINDS = [
  "includes-all",
  "includes-any",
  "excludes-all",
  "bullet-count",
  "sentence-count"
] as const;

export type PromptEvaluationCheckKind = (typeof PROMPT_EVAL_CHECK_KINDS)[number];
export type PromptEvaluationDiagnosticRouteFamily = ChatDiagnosticRouteFamily | "none";

export interface PromptEvaluationCheck {
  id: string;
  kind: PromptEvaluationCheckKind;
  description: string;
  category?: PromptEvaluationCheckCategory;
  values?: string[];
  exact?: number;
  min?: number;
  max?: number;
}

export interface PromptEvaluationRoutingExpectations {
  routeFamily?: PromptEvaluationDiagnosticRouteFamily;
  awarenessUsed?: boolean;
  deterministicAwareness?: boolean;
  genericWritingPromptSuppressed?: boolean;
}

export interface PromptEvaluationGroundingExpectations {
  minGroundedClaims?: number;
  maxUnsupportedClaims?: number;
  maxConflictedClaims?: number;
  minCitationCoverage?: number;
}

export interface PromptEvaluationCaseInput {
  id: string;
  label: string;
  difficulty: PromptEvalDifficulty;
  prompt: string;
  sourceScopeHint?: ChatReplySourceScope;
  formatPolicy?: ChatReplyFormatPolicy;
  replyPolicy?: Partial<ChatReplyPolicy>;
  checks?: PromptEvaluationCheck[];
  routingExpectations?: PromptEvaluationRoutingExpectations;
  groundingExpectations?: PromptEvaluationGroundingExpectations;
}

export interface PromptEvaluationSettingsSnapshot {
  suiteMode: ChatEvaluationSuiteMode;
  model: string | null;
  responseMode: ResponseMode;
  awarenessAnswerMode: AwarenessAnswerMode;
  ragEnabled: boolean;
  useWebSearch: boolean;
  showTrace: boolean;
  workspaceIndexingEnabled: boolean;
}

export interface PromptEvaluationRequest {
  suiteName?: string;
  suiteMode?: ChatEvaluationSuiteMode;
  cases: PromptEvaluationCaseInput[];
  modelOverride?: string;
  responseMode?: ResponseMode;
  awarenessAnswerMode?: AwarenessAnswerMode;
  useWebSearch?: boolean;
  ragOptions?: RagOptions;
}

export interface PromptEvaluationRoutingReport {
  routeFamily: PromptEvaluationDiagnosticRouteFamily;
  routeConfidence: number | null;
  rawRouteFamily: AwarenessIntentFamily | "none";
  rawRouteConfidence: number | null;
  awarenessUsed: boolean;
  deterministicAwareness: boolean;
  genericWritingPromptSuppressed: boolean;
  sourceScope: ChatReplySourceScope | null;
  replyPolicy: ChatReplyPolicy | null;
  cleanupBypassed: boolean;
  routingSuppressionReason: string | null;
  retrievedSourceSummary: ChatRetrievedSourceSummary | null;
  reasoningMode: RagExecutionMode | null;
}

export interface PromptEvaluationCheckResult {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
  category?: PromptEvaluationCheckCategory;
}

export interface PromptEvaluationCaseResult extends PromptEvaluationCaseInput {
  reply: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "success" | "error";
  qualityStatus: PromptEvaluationQualityStatus;
  modelStatus: ModelHealth;
  traceSummary: ReasoningTraceSummary | null;
  routing: PromptEvaluationRoutingReport;
  checkResults: PromptEvaluationCheckResult[];
}

export interface PromptEvaluationSummary {
  total: number;
  successCount: number;
  errorCount: number;
  qualityPassCount: number;
  qualityNeedsReviewCount: number;
}

export type PromptEvaluationCaseChangeKind = "new" | "improved" | "regressed" | "unchanged";

export interface PromptEvaluationCaseComparison {
  caseId: string;
  label: string;
  previousLabel: string | null;
  qualityChange: PromptEvaluationCaseChangeKind;
  durationDeltaMs: number | null;
  previousRouteFamily: PromptEvaluationDiagnosticRouteFamily | null;
  currentRouteFamily: PromptEvaluationDiagnosticRouteFamily;
  routeChanged: boolean;
  replyChanged: boolean;
}

export interface PromptEvaluationRemovedCase {
  caseId: string;
  label: string;
}

export interface PromptEvaluationComparison {
  previousGeneratedAt: string;
  previousReportFileName: string;
  previousReportPath: string;
  summaryDelta: {
    total: number;
    successCount: number;
    errorCount: number;
    qualityPassCount: number;
    qualityNeedsReviewCount: number;
  };
  cases: PromptEvaluationCaseComparison[];
  removedCases: PromptEvaluationRemovedCase[];
}

export interface PromptEvaluationResponse {
  suiteName: string;
  generatedAt: string;
  reportPath: string;
  reportFileName: string;
  workspaceRoot: string;
  settings: PromptEvaluationSettingsSnapshot;
  cases: PromptEvaluationCaseResult[];
  summary: PromptEvaluationSummary;
  comparison: PromptEvaluationComparison | null;
}
