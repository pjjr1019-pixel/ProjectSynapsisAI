import type {
  ChatExecutionDiagnostics,
  ChatReplyPolicyDiagnostics,
  ChatRetrievedSourceSummary,
  ChatReplyPolicy,
  ContextRouteDecision,
  PromptIntentContract,
  RagContextPreview,
  ChatEvaluationSuiteMode,
  ChatGovernedTaskMetadata,
  RuntimeSelectionSummary
} from "@contracts";
import type { AwarenessQueryAnswer } from "@contracts";

type RouteLike = NonNullable<AwarenessQueryAnswer["intent"]>;

export interface BuildRetrievedSourceSummaryInput {
  memoryCount: number;
  workspaceHitCount: number;
  workspacePaths: string[];
  awarenessSourceCount: number;
  webResultCount: number;
}

export const buildRetrievedSourceSummary = (
  input: BuildRetrievedSourceSummaryInput
): ChatRetrievedSourceSummary => ({
  memoryCount: input.memoryCount,
  workspaceHitCount: input.workspaceHitCount,
  workspacePaths: input.workspacePaths,
  awarenessSourceCount: input.awarenessSourceCount,
  webResultCount: input.webResultCount
});

export interface BuildChatExecutionDiagnosticsInput {
  reasoningProfile: ChatExecutionDiagnostics["reasoningProfile"];
  planningPolicy: ChatExecutionDiagnostics["planningPolicy"];
  routeDecision?: ContextRouteDecision | null;
  runtimeSelection?: RuntimeSelectionSummary | null;
  intentRoute: RouteLike | null;
  rawIntentRoute: RouteLike | null;
  awarenessUsed: boolean;
  deterministicAwareness: boolean;
  genericWritingPromptSuppressed: boolean;
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

export const buildChatExecutionDiagnostics = ({
  reasoningProfile,
  planningPolicy,
  routeDecision,
  runtimeSelection,
  intentRoute,
  rawIntentRoute,
  awarenessUsed,
  deterministicAwareness,
  genericWritingPromptSuppressed,
  replyPolicy,
  policyDiagnostics,
  cleanupBypassed,
  routingSuppressionReason,
  retrievedSourceSummary,
  reasoningMode,
  evaluationSuiteMode,
  taskState,
  promptIntent
}: BuildChatExecutionDiagnosticsInput): ChatExecutionDiagnostics => ({
  reasoningProfile,
  planningPolicy,
  routeDecision: routeDecision ?? null,
  runtimeSelection: runtimeSelection ?? null,
  routeFamily: genericWritingPromptSuppressed ? "generic-writing" : intentRoute?.family ?? null,
  routeConfidence: genericWritingPromptSuppressed ? null : intentRoute?.confidence ?? null,
  rawRouteFamily: rawIntentRoute?.family ?? null,
  rawRouteConfidence: rawIntentRoute?.confidence ?? null,
  awarenessUsed,
  deterministicAwareness,
  genericWritingPromptSuppressed,
  sourceScope: replyPolicy?.sourceScope ?? null,
  replyPolicy,
  policyDiagnostics: policyDiagnostics ?? null,
  cleanupBypassed,
  routingSuppressionReason,
  retrievedSourceSummary,
  reasoningMode,
  evaluationSuiteMode,
  taskState,
  promptIntent: promptIntent ?? null
});
