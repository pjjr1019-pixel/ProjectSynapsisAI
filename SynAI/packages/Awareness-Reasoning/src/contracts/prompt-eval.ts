import type {
  ChatDiagnosticRouteFamily,
  ChatReplyClassifierCategory,
  ChatReplyPolicyDiagnostics,
  ChatEvaluationSuiteMode,
  ChatReplyFormatPolicy,
  ChatReplyPolicy,
  ChatReplySourceScope,
  ChatRetrievedSourceSummary,
  ResponseMode
} from "./chat";
import type { AwarenessAnswerMode, AwarenessIntentFamily } from "./awareness";
import type { ModelHealth } from "./health";
import type {
  RagExecutionMode,
  RagOptions,
  ReasoningTraceSummary,
  RequestRouteMode,
  ToggleMode
} from "./rag";
import type { PlanningPolicy, ReasoningProfile } from "./reasoning-profile";

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
  "sentence-count",
  "line-prefixes"
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
  routeMode?: RequestRouteMode;
  awarenessUsed?: boolean;
  deterministicAwareness?: boolean;
  genericWritingPromptSuppressed?: boolean;
  codingMode?: boolean;
  highQualityMode?: boolean;
  selectedTaskSkillIds?: string[];
  reasoningProfile?: ReasoningProfile;
  planningPolicy?: PlanningPolicy;
  classifierCategories?: Partial<Record<ChatReplyClassifierCategory, boolean>>;
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
  reasoningProfile?: ReasoningProfile;
  planningPolicy?: PlanningPolicy;
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
  reasoningProfile: ReasoningProfile;
  planningPolicy: PlanningPolicy;
  responseMode: ResponseMode;
  awarenessAnswerMode: AwarenessAnswerMode;
  codingModeEnabled: boolean;
  highQualityModeEnabled: boolean;
  ragEnabled: boolean;
  useWebSearch: boolean;
  showTrace: boolean;
  workspaceIndexingEnabled: boolean;
}

export interface PromptEvaluationRequest {
  suiteName?: string;
  suiteMode?: ChatEvaluationSuiteMode;
  cases: PromptEvaluationCaseInput[];
  reasoningProfile?: ReasoningProfile;
  planningPolicy?: PlanningPolicy;
  modelOverride?: string;
  responseMode?: ResponseMode;
  awarenessAnswerMode?: AwarenessAnswerMode;
  codingMode?: ToggleMode;
  highQualityMode?: ToggleMode;
  useWebSearch?: boolean;
  ragOptions?: RagOptions;
}

export interface PromptEvaluationRoutingReport {
  reasoningProfile: ReasoningProfile;
  planningPolicy: PlanningPolicy | null;
  routeFamily: PromptEvaluationDiagnosticRouteFamily;
  routeMode: RequestRouteMode | null;
  routeConfidence: number | null;
  rawRouteFamily: AwarenessIntentFamily | "none";
  rawRouteConfidence: number | null;
  awarenessUsed: boolean;
  deterministicAwareness: boolean;
  genericWritingPromptSuppressed: boolean;
  codingMode: boolean;
  highQualityMode: boolean;
  selectedTaskSkillIds: string[];
  sourceScope: ChatReplySourceScope | null;
  replyPolicy: ChatReplyPolicy | null;
  policyDiagnostics?: ChatReplyPolicyDiagnostics | null;
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
