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
  CapabilityRunExportResult,
  CapabilityRunSnapshot,
  CapabilityRunStartRequest,
  CapabilityRunRecord,
  CapabilityRunnerCatalogSummary,
  CapabilityEventRecord
} from "./capability-runner";
import type {
  AwarenessAnswerMode,
  AwarenessEvent,
  AwarenessQueryAnswer,
  AwarenessQueryRequest,
  ForegroundWindowSnapshot,
  ScreenAwarenessStatus,
  ScreenUiTreeSnapshot,
  OfficialKnowledgeSourceStatus,
  StartAssistModeOptions
} from "./awareness";
import type { ReasoningProfile } from "./reasoning-profile";
import type { OfficialKnowledgeStatus } from "../official-knowledge";
import type {
  AgentRuntimeInspection,
  AgentRuntimeRunResult,
  AgentTask,
  RuntimeJob,
  RuntimeProgressEvent,
} from "@agent-runtime/contracts/agent-runtime.contracts";

export type { OfficialKnowledgeStatus } from "../official-knowledge";

export const ACTION_SCOPES = [
  "application",
  "window",
  "file",
  "folder",
  "workspace",
  "process",
  "settings",
  "control-panel",
  "task-manager",
  "system"
] as const;

export type ActionScope = (typeof ACTION_SCOPES)[number];

export const DESKTOP_ACTION_KINDS = [
  "launch-program",
  "focus-window",
  "open-file",
  "open-folder",
  "create-file",
  "create-folder",
  "rename-item",
  "move-item",
  "delete-file",
  "delete-folder",
  "open-settings",
  "open-startup-apps",
  "open-storage-settings",
  "open-control-panel",
  "open-add-remove-programs",
  "open-registry-editor",
  "open-task-manager",
  "inspect-process",
  "terminate-process",
  "close-app",
  "uninstall-app",
  "ui-click",
  "ui-type",
  "ui-hotkey",
  "start-service",
  "stop-service",
  "restart-service",
  "set-registry-value",
  "delete-registry-value"
] as const;

export type DesktopActionKind = (typeof DESKTOP_ACTION_KINDS)[number];

export const DESKTOP_ACTION_TARGET_KINDS = [
  "path",
  "directory",
  "process-id",
  "process-name",
  "window-title",
  "ui-element",
  "service-name",
  "registry-key",
  "registry-value",
  "installed-app",
  "uri",
  "program",
  "command"
] as const;

export type DesktopActionTargetKind = (typeof DESKTOP_ACTION_TARGET_KINDS)[number];

export const DESKTOP_ACTION_RISK_CLASSES = ["low", "medium", "high", "critical"] as const;

export type DesktopActionRiskClass = (typeof DESKTOP_ACTION_RISK_CLASSES)[number];

export interface ApprovalToken {
  tokenId: string;
  commandHash: string;
  approver: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export interface DesktopActionProposal {
  id: string;
  title: string;
  description: string;
  kind: DesktopActionKind;
  scope: ActionScope;
  targetKind: DesktopActionTargetKind;
  targetPlaceholder: string;
  defaultTarget: string | null;
  commandPreview: string;
  riskClass: DesktopActionRiskClass;
  approvalRequired: boolean;
  preconditions: string[];
  aliases: string[];
  metadata?: Record<string, unknown>;
}

export interface DesktopActionRequest {
  proposalId: string;
  kind: DesktopActionKind;
  scope: ActionScope;
  targetKind: DesktopActionTargetKind;
  target: string;
  destinationTarget?: string | null;
  args?: string[];
  workingDirectory?: string | null;
  workspaceRoot?: string | null;
  allowedRoots?: string[] | null;
  riskClass: DesktopActionRiskClass;
  destructive: boolean;
  dryRun?: boolean;
  approvedBy?: string | null;
  approvalToken?: ApprovalToken | null;
  metadata?: Record<string, unknown>;
}

export interface ExecutionVerificationRecord {
  passed: boolean;
  summary: string;
  evidence?: string[] | null;
  observedState?: unknown;
  expectedStateSummary?: string | null;
}

export interface DesktopActionResult {
  proposalId: string;
  kind: DesktopActionKind;
  scope: ActionScope;
  targetKind: DesktopActionTargetKind;
  target: string;
  status: "executed" | "simulated" | "blocked" | "clarification_needed" | "denied" | "failed";
  commandId: string | null;
  commandHash: string | null;
  preview: string;
  summary: string;
  riskClass: DesktopActionRiskClass;
  approvalRequired: boolean;
  approvedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  output?: unknown;
  rollback?: ExecutionRollbackRecord | null;
  verification?: ExecutionVerificationRecord | null;
  error?: string;
  reason?: string;
  message?: string;
  clarification?: {
    question: string;
    missingFields?: string[];
    options?: string[];
  };
}

export interface ExecutionRollbackRecord {
  possible: boolean;
  kind: string;
  target: string;
  destination?: string | null;
  backupPath?: string | null;
  reason?: string | null;
  summary: string;
  reversible?: boolean;
  compensationSummary?: string | null;
  metadata?: Record<string, unknown>;
}

export const WORKFLOW_FAMILIES = [
  "research-report",
  "computer-health-report",
  "browser-playback",
  "browser-interaction",
  "file-management",
  "application-management",
  "window-control",
  "system-navigation",
  "process-control",
  "app-uninstall",
  "service-control",
  "registry-control",
  "ui-automation",
  "maintenance-review",
  "general"
] as const;

export type WorkflowFamily = (typeof WORKFLOW_FAMILIES)[number];

export const WORKFLOW_STEP_KINDS = [
  "collect-web",
  "collect-machine",
  "collect-file",
  "collect-screen",
  "browser-open",
  "browser-search",
  "browser-extract",
  "browser-play",
  "browser-interact",
  "desktop-action",
  "service-action",
  "registry-action",
  "ui-action",
  "write-markdown",
  "resolve-installed-app",
  "confirm-approval"
] as const;

export type WorkflowStepKind = (typeof WORKFLOW_STEP_KINDS)[number];

export const WORKFLOW_SAVE_LOCATIONS = ["desktop", "documents", "workspace", "none"] as const;

export type WorkflowSaveLocation = (typeof WORKFLOW_SAVE_LOCATIONS)[number];

export interface WorkflowEvidence {
  source: "web" | "machine" | "file" | "screen" | "desktop-action" | "browser";
  label: string;
  summary: string;
  url?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WorkflowArtifactPlan {
  id: string;
  kind: "markdown" | "text" | "json" | "browser";
  label: string;
  saveTo: WorkflowSaveLocation;
  fileName: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStepPlan {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  summary: string;
  approvalRequired: boolean;
  riskClass: DesktopActionRiskClass;
  target?: string | null;
  destination?: string | null;
  url?: string | null;
  query?: string | null;
  saveTo?: WorkflowSaveLocation | null;
  fileName?: string | null;
  actionId?: DesktopActionKind | null;
  metadata?: Record<string, unknown>;
}

export interface WorkflowPlan {
  requestId: string;
  prompt: string;
  normalizedPrompt: string;
  family: WorkflowFamily;
  summary: string;
  steps: WorkflowStepPlan[];
  evidence: WorkflowEvidence[];
  artifacts: WorkflowArtifactPlan[];
  clarificationNeeded: string[];
  approvalRequired: boolean;
  approvalReason: string | null;
  workflowHash: string;
  targetPaths: string[];
  createdAt: string;
}

export interface WorkflowStepResult {
  id: string;
  kind: WorkflowStepKind;
  status: "executed" | "simulated" | "clarification_needed" | "blocked" | "denied" | "failed" | "skipped";
  summary: string;
  startedAt: string;
  completedAt: string;
  output?: unknown;
  rollback?: ExecutionRollbackRecord | null;
  verification?: ExecutionVerificationRecord | null;
  error?: string;
  clarification?: {
    question: string;
    missingFields?: string[];
    options?: string[];
  } | null;
}

export interface WorkflowProgressEvent {
  workflowId: string;
  workflowHash: string;
  plan: WorkflowPlan;
  status: "queued" | "running" | "executed" | "simulated" | "clarification_needed" | "blocked" | "denied" | "failed";
  currentStepId: string | null;
  currentStepIndex: number;
  stepCount: number;
  completedStepIds: string[];
  stepResults: WorkflowStepResult[];
  artifactPaths: string[];
  summary: string;
}

export interface WorkflowExecutionRequest {
  prompt: string;
  plan?: WorkflowPlan | null;
  dryRun?: boolean;
  approvedBy?: string | null;
  approvalToken?: ApprovalToken | null;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  workflowHash: string;
  plan: WorkflowPlan;
  status: "executed" | "simulated" | "clarification_needed" | "blocked" | "denied" | "failed";
  summary: string;
  reportMarkdown?: string | null;
  reportSummary?: string | null;
  approvalRequired: boolean;
  approvedBy: string | null;
  commandId: string | null;
  commandHash: string | null;
  startedAt: string | null;
  completedAt: string | null;
  currentStepId: string | null;
  completedStepIds: string[];
  stepResults: WorkflowStepResult[];
  artifactPaths: string[];
  rollback?: ExecutionRollbackRecord[] | null;
  compensation?: WorkflowStepResult[] | null;
  verification?: ExecutionVerificationRecord | null;
  error?: string;
  clarification?: {
    question: string;
    missingFields?: string[];
    options?: string[];
  } | null;
}

export interface GovernancePendingApprovalRecord {
  conversationId: string;
  requestId: string;
  actionType: string | null;
  decision: string;
  approvalReason: string | null;
  approver: string | null;
  tokenId: string | null;
  expiresAt: string | null;
  summary: string;
}

export const GOVERNANCE_APPROVAL_QUEUE_STATUSES = [
  "pending",
  "approved",
  "consumed",
  "denied",
  "blocked",
  "revoked",
  "expired"
] as const;

export type GovernanceApprovalQueueStatus = (typeof GOVERNANCE_APPROVAL_QUEUE_STATUSES)[number];

export interface GovernanceApprovalQueueRecord {
  id: string;
  source: "governed-chat" | "workflow" | "desktop-actions" | "operator-cli";
  commandId: string | null;
  commandHash: string;
  commandName: string;
  actionType: string | null;
  riskClass: DesktopActionRiskClass;
  scope: ActionScope | null;
  targetKind: DesktopActionTargetKind | null;
  status: GovernanceApprovalQueueStatus;
  approvedBy: string | null;
  tokenId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

export interface GovernanceApprovalQueueSnapshot {
  capturedAt: string;
  totals: {
    total: number;
    pending: number;
    approved: number;
    consumed: number;
    denied: number;
    blocked: number;
    revoked: number;
    expired: number;
  };
  records: GovernanceApprovalQueueRecord[];
}

export interface GovernanceAuditEntry {
  source: "governed-chat" | "workflow" | "desktop-actions" | "agent-runtime";
  timestamp: string;
  commandName: string;
  status: string;
  summary: string;
  commandId?: string | null;
  commandHash?: string | null;
  details?: Record<string, unknown> | null;
  provenance?: {
    sourceFile: string;
    capturedAt: string;
  } | null;
  lifecycle?: {
    status: "live" | "archived";
  } | null;
}

export interface GovernanceAuditQuery {
  sources?: Array<GovernanceAuditEntry["source"]>;
  commandNameIncludes?: string | null;
  statusIncludes?: string | null;
  summaryIncludes?: string | null;
  limit?: number | null;
}

export interface CapabilityRegistryEntry {
  id: string;
  kind:
    | "desktop-action"
    | "workflow-family"
    | "workflow-step"
    | "browser-capability"
    | "executor"
    | "skill"
    | "system-surface";
  title: string;
  description: string;
  status: "active" | "partial" | "planned" | "blocked";
  riskClass: DesktopActionRiskClass;
  approvalRequired: boolean;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeCapabilityPluginCapability {
  id: string;
  kind: CapabilityRegistryEntry["kind"];
  title: string;
  description: string;
  status?: CapabilityRegistryEntry["status"];
  riskClass?: DesktopActionRiskClass;
  approvalRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RuntimeCapabilityPluginManifest {
  id: string;
  title: string;
  version: string;
  description: string;
  enabled: boolean;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  entrypoint: string | null;
  capabilities: RuntimeCapabilityPluginCapability[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeCapabilityPluginRecord {
  manifest: RuntimeCapabilityPluginManifest;
  manifestPath: string;
  loaded: boolean;
  loadError: string | null;
  capabilities: CapabilityRegistryEntry[];
}

export interface CapabilityRegistrySnapshot {
  capturedAt: string;
  totals: {
    total: number;
    active: number;
    partial: number;
    planned: number;
    blocked: number;
  };
  executors: string[];
  entries: CapabilityRegistryEntry[];
  plugins: RuntimeCapabilityPluginRecord[];
}

export interface GovernanceCapabilitySummary {
  runId: string;
  totals: {
    total: number;
    passed: number;
    failed: number;
  };
  artifactRoot: string;
  latestFailedCardIds: string[];
}

export interface GovernanceHistoryBacklogSummary {
  startedAt: string;
  conversationCount: number;
  findingCount: number;
  draftCount: number;
  topFindings: Array<{
    recoveredIntent: string;
    repeatedRequestCount: number;
    suggestedGap: string;
    userImpactScore: number;
    suggestedExecutor: string;
  }>;
  candidateCardIds: string[];
}

export interface GovernanceDashboardSnapshot {
  capturedAt: string;
  capabilitySummary: GovernanceCapabilitySummary | null;
  historyBacklog: GovernanceHistoryBacklogSummary | null;
  pendingApprovals: GovernancePendingApprovalRecord[];
  approvalQueue: GovernanceApprovalQueueSnapshot | null;
  recentAuditEntries: GovernanceAuditEntry[];
  capabilityRegistry: CapabilityRegistrySnapshot | null;
  officialKnowledge: OfficialKnowledgeStatus | null;
}

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
  desktopActionCatalog: "desktop-actions:list",
  desktopActionSuggest: "desktop-actions:suggest",
  desktopActionApprove: "desktop-actions:approve",
  desktopActionExecute: "desktop-actions:execute",
  rollbackDesktopAction: "desktop-actions:rollback",
  workflowPlanSuggest: "workflow:plan",
  workflowApprove: "workflow:approve",
  workflowExecute: "workflow:execute",
  workflowProgress: "workflow:progress",
  governanceDashboard: "governance:dashboard",
  governanceApprovalQueue: "governance:approvals",
  governanceAuditQuery: "governance:audit-query",
  contextPreview: "context:preview",
  promptEvaluationRun: "prompt-eval:run",
  awarenessQuery: "awareness:query",
  officialKnowledgeSources: "knowledge:sources",
  officialKnowledgeSourceUpdate: "knowledge:source-update",
  officialKnowledgeSourceRefresh: "knowledge:source-refresh",
  screenStatus: "screen:status",
  screenForegroundWindow: "screen:foreground-window",
  screenUiTree: "screen:ui-tree",
  screenLastEvents: "screen:last-events",
  screenStartAssist: "screen:start-assist",
  screenStopAssist: "screen:stop-assist",
  agentRuntimeRun: "agent-runtime:run",
  agentRuntimeList: "agent-runtime:list",
  agentRuntimeInspect: "agent-runtime:inspect",
  agentRuntimeResume: "agent-runtime:resume",
  agentRuntimeCancel: "agent-runtime:cancel",
  agentRuntimeRecover: "agent-runtime:recover",
  agentRuntimeProgress: "agent-runtime:progress",
  capabilityRunnerCatalog: "capability-runner:catalog",
  capabilityRunnerRuns: "capability-runner:runs",
  capabilityRunnerSnapshot: "capability-runner:snapshot",
  capabilityRunnerStart: "capability-runner:start",
  capabilityRunnerPause: "capability-runner:pause",
  capabilityRunnerResume: "capability-runner:resume",
  capabilityRunnerStop: "capability-runner:stop",
  capabilityRunnerRerunFailed: "capability-runner:rerun-failed",
  capabilityRunnerExport: "capability-runner:export",
  capabilityRunnerEvents: "capability-runner:events"
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
  listDesktopActions(): Promise<DesktopActionProposal[]>;
  suggestDesktopAction(prompt: string): Promise<DesktopActionProposal | null>;
  issueDesktopActionApproval(
    request: DesktopActionRequest,
    approvedBy: string,
    ttlMs?: number
  ): Promise<ApprovalToken>;
  executeDesktopAction(request: DesktopActionRequest): Promise<DesktopActionResult>;
  rollbackDesktopAction(commandId: string, approvedBy: string, dryRun?: boolean): Promise<DesktopActionResult>;
  suggestWorkflow(prompt: string): Promise<WorkflowPlan | null>;
  issueWorkflowApproval(plan: WorkflowPlan, approvedBy: string, ttlMs?: number): Promise<ApprovalToken>;
  executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResult>;
  subscribeWorkflowProgress(listener: (event: WorkflowProgressEvent) => void): () => void;
  getGovernanceDashboard(): Promise<GovernanceDashboardSnapshot>;
  getGovernanceApprovalQueue(): Promise<GovernanceApprovalQueueSnapshot>;
  queryGovernanceAudit(query?: GovernanceAuditQuery): Promise<GovernanceAuditEntry[]>;
  runPromptEvaluation(payload: PromptEvaluationRequest): Promise<PromptEvaluationResponse>;
  queryAwareness(request: AwarenessQueryRequest): Promise<AwarenessQueryAnswer | null>;
  listOfficialKnowledgeSources(): Promise<OfficialKnowledgeSourceStatus[]>;
  setOfficialKnowledgeSourceEnabled(sourceId: string, enabled: boolean): Promise<OfficialKnowledgeStatus>;
  refreshOfficialKnowledgeSource(sourceId: string): Promise<OfficialKnowledgeStatus>;
  getContextPreview(
    conversationId: string,
    latestUserMessage: string,
    awarenessAnswerMode?: AwarenessAnswerMode,
    ragOptions?: RagOptions,
    reasoningProfile?: ReasoningProfile
  ): Promise<ContextPreview>;
  getScreenStatus(): Promise<ScreenAwarenessStatus>;
  getScreenForegroundWindow(): Promise<ForegroundWindowSnapshot | null>;
  getScreenUiTree(): Promise<ScreenUiTreeSnapshot | null>;
  getScreenLastEvents(): Promise<AwarenessEvent[]>;
  startAssistMode(options?: StartAssistModeOptions): Promise<ScreenAwarenessStatus>;
  stopAssistMode(reason?: string): Promise<ScreenAwarenessStatus>;
  runAgentRuntimeTask(task: AgentTask): Promise<AgentRuntimeRunResult>;
  listAgentRuntimeJobs(): Promise<RuntimeJob[]>;
  inspectAgentRuntimeJob(jobId: string): Promise<AgentRuntimeInspection | null>;
  resumeAgentRuntimeJob(jobId: string): Promise<AgentRuntimeRunResult | null>;
  cancelAgentRuntimeJob(jobId: string): Promise<AgentRuntimeInspection | null>;
  recoverAgentRuntimeJob(jobId: string): Promise<AgentRuntimeInspection | null>;
  subscribeAgentRuntimeProgress(listener: (event: RuntimeProgressEvent) => void): () => void;
  getCapabilityRunnerCatalogSummary(): Promise<CapabilityRunnerCatalogSummary>;
  listCapabilityRuns(): Promise<CapabilityRunRecord[]>;
  getCapabilityRunSnapshot(runId?: string): Promise<CapabilityRunSnapshot | null>;
  startCapabilityRun(request: CapabilityRunStartRequest): Promise<CapabilityRunSnapshot>;
  pauseCapabilityRun(runId: string): Promise<CapabilityRunRecord | null>;
  resumeCapabilityRun(runId: string): Promise<CapabilityRunSnapshot | null>;
  stopCapabilityRun(runId: string): Promise<CapabilityRunRecord | null>;
  rerunFailedCapabilityRun(runId: string): Promise<CapabilityRunSnapshot | null>;
  exportCapabilityRunMarkdown(runId: string): Promise<CapabilityRunExportResult | null>;
  subscribeCapabilityRunnerEvents(listener: (event: CapabilityEventRecord) => void): () => void;
}
