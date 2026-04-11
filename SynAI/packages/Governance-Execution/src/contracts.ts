import type {
  ActionScope as SharedActionScope,
  ChatMessage,
  DesktopActionKind as SharedDesktopActionKind,
  DesktopActionProposal as SharedDesktopActionProposal,
  DesktopActionRequest as SharedDesktopActionRequest,
  DesktopActionResult as SharedDesktopActionResult,
  DesktopActionRiskClass as SharedDesktopActionRiskClass,
  DesktopActionTargetKind as SharedDesktopActionTargetKind,
  ExecutionRollbackRecord as SharedExecutionRollbackRecord,
  ExecutionVerificationRecord as SharedExecutionVerificationRecord,
  WorkflowArtifactPlan as SharedWorkflowArtifactPlan,
  WorkflowEvidence as SharedWorkflowEvidence,
  WorkflowExecutionRequest as SharedWorkflowExecutionRequest,
  WorkflowExecutionResult as SharedWorkflowExecutionResult,
  WorkflowFamily as SharedWorkflowFamily,
  WorkflowPlan as SharedWorkflowPlan,
  WorkflowProgressEvent as SharedWorkflowProgressEvent,
  WorkflowSaveLocation as SharedWorkflowSaveLocation,
  WorkflowStepKind as SharedWorkflowStepKind,
  WorkflowStepPlan as SharedWorkflowStepPlan,
  WorkflowStepResult as SharedWorkflowStepResult
} from "@contracts";
import type { LocalAIProvider } from "@local-ai";

export const RISK_CLASSES = ["low", "medium", "high", "critical"] as const;
export type RiskClass = (typeof RISK_CLASSES)[number];

export type PolicyOutcome = "allow" | "deny" | "require-approval";
export type GovernanceCommandStatus =
  | "queued"
  | "processing"
  | "executed"
  | "simulated"
  | "blocked"
  | "denied"
  | "failed";

export interface ApprovalToken {
  tokenId: string;
  commandHash: string;
  approver: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  commandRegex?: string;
  commandIncludes?: string[];
  actionKinds?: string[];
  targetKinds?: string[];
  scopes?: string[];
  destructive?: boolean;
  minRiskClass?: RiskClass;
  outcome: PolicyOutcome;
  reason: string;
}

export interface GovernanceDecision {
  outcome: PolicyOutcome;
  destructive: boolean;
  riskClass: RiskClass;
  approvalRequired: boolean;
  matchedRuleId: string | null;
  reasons: string[];
}

export interface GovernanceExecutionContext {
  commandId: string;
  commandHash: string;
  decision: GovernanceDecision;
}

export interface ExecutionHandlerResult {
  simulated?: boolean;
  status?: ExecutionResult["status"];
  summary?: string;
  output?: unknown;
  verification?: SharedExecutionVerificationRecord | null;
}

export type GovernanceExecutionHandler = (
  request: ExecutionRequest,
  context: GovernanceExecutionContext
) => Promise<ExecutionHandlerResult>;

export interface ExecutionRequest {
  commandName: string;
  command: string;
  args?: string[];
  metadata?: Record<string, unknown>;
  riskClass: RiskClass;
  destructive?: boolean;
  actionKind?: SharedDesktopActionKind | string | null;
  targetKind?: SharedDesktopActionTargetKind | string | null;
  scope?: SharedActionScope | string | null;
  sandboxed?: boolean;
  approvedRoots?: string[] | null;
  targetState?: string | null;
  machineState?: Record<string, unknown> | null;
  approvalToken?: ApprovalToken | null;
  approvedBy?: string | null;
  dryRun?: boolean;
  handler?: GovernanceExecutionHandler;
}

export interface ExecutionResult {
  commandId: string;
  commandHash: string;
  commandName: string;
  status: "executed" | "simulated" | "blocked" | "denied" | "failed";
  startedAt: string;
  completedAt: string;
  summary: string;
  governance: GovernanceDecision;
  output?: unknown;
  verification?: SharedExecutionVerificationRecord | null;
  error?: string;
}

export interface GovernanceCommand {
  commandId: string;
  commandHash: string;
  request: ExecutionRequest;
  status: GovernanceCommandStatus;
  createdAt: string;
  updatedAt: string;
  decision: GovernanceDecision | null;
  result: ExecutionResult | null;
}

export interface ApprovalValidationResult {
  valid: boolean;
  reason: string | null;
}

export type ActionScope = SharedActionScope;
export type DesktopActionKind = SharedDesktopActionKind;
export type DesktopActionTargetKind = SharedDesktopActionTargetKind;
export type DesktopActionRiskClass = SharedDesktopActionRiskClass;
export type DesktopActionProposal = SharedDesktopActionProposal;
export type DesktopActionRequest = SharedDesktopActionRequest;
export type DesktopActionResult = SharedDesktopActionResult;
export type ExecutionRollbackRecord = SharedExecutionRollbackRecord;
export type ExecutionVerificationRecord = SharedExecutionVerificationRecord;
export type WorkflowFamily = SharedWorkflowFamily;
export type WorkflowStepKind = SharedWorkflowStepKind;
export type WorkflowSaveLocation = SharedWorkflowSaveLocation;
export type WorkflowEvidence = SharedWorkflowEvidence;
export type WorkflowArtifactPlan = SharedWorkflowArtifactPlan;
export type WorkflowStepPlan = SharedWorkflowStepPlan;
export type WorkflowPlan = SharedWorkflowPlan;
export type WorkflowStepResult = SharedWorkflowStepResult;
export type WorkflowProgressEvent = SharedWorkflowProgressEvent;
export type WorkflowExecutionRequest = SharedWorkflowExecutionRequest;
export type WorkflowExecutionResult = SharedWorkflowExecutionResult;
export type CapabilityRegistryEntry = import("@contracts").CapabilityRegistryEntry;
export type CapabilityRegistrySnapshot = import("@contracts").CapabilityRegistrySnapshot;

export interface GovernanceCommandBusApi {
  enqueueGovernanceCommand(request: ExecutionRequest): GovernanceCommand;
  processNextGovernanceCommand(): Promise<ExecutionResult | null>;
  getGovernanceCommandStatus(commandId: string): GovernanceCommand | null;
}

export interface ApprovalLedgerApi {
  issueApprovalToken(commandHash: string, approver: string, ttlMs?: number): ApprovalToken;
  validateApprovalToken(
    token: ApprovalToken | null | undefined,
    commandHash: string,
    now?: Date
  ): ApprovalValidationResult;
  revokeApprovalToken(tokenId: string): boolean;
}

export interface ChatExecutionOptions {
  model?: string;
  timeoutMs?: number;
  label?: string;
}

export interface ChatExecutionService {
  runChat(messages: ChatMessage[], options?: ChatExecutionOptions): Promise<string>;
  runChatStream(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    options?: ChatExecutionOptions
  ): Promise<string>;
}

export interface CreateChatExecutionServiceInput {
  provider: LocalAIProvider;
}

export interface GovernedActionProposal {
  id: string;
  action: string;
  commandPreview: string;
  riskClass: RiskClass;
  approvalRequired: boolean;
  preconditions?: string[];
  title?: string;
  description?: string;
  kind?: DesktopActionKind;
  scope?: ActionScope;
  targetKind?: DesktopActionTargetKind;
  targetPlaceholder?: string;
  defaultTarget?: string | null;
  aliases?: string[];
}
