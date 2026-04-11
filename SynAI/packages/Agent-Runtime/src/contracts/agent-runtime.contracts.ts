import { z } from 'zod';

const isoTimestampSchema = z.string().datetime();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const issueSchema = z.object({
  message: z.string().min(1),
  code: z.string().min(1).optional(),
  details: z.unknown().optional(),
});
const clarificationSchema = z
  .object({
    question: z.string().min(1),
    missingFields: z.array(z.string().min(1)).default([]),
    options: z.array(z.string().min(1)).optional(),
  })
  .strict();

const isZodSchema = (value: unknown): value is z.ZodTypeAny =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { parse?: unknown }).parse === 'function' &&
  typeof (value as { safeParse?: unknown }).safeParse === 'function';

export const AgentTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);
export type AgentTaskStatus = z.infer<typeof AgentTaskStatusSchema>;

export const AgentTaskSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    status: AgentTaskStatusSchema,
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    steps: z.array(z.string().min(1)),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type AgentTask = z.infer<typeof AgentTaskSchema>;

export const TaskStepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
]);
export type TaskStepStatus = z.infer<typeof TaskStepStatusSchema>;

export const TaskStepSchema = z
  .object({
    id: z.string().min(1),
    taskId: z.string().min(1),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    status: TaskStepStatusSchema,
    name: z.string().min(1),
    skill: z.string().min(1),
    input: z.unknown(),
    result: z.unknown().optional(),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type TaskStep = z.infer<typeof TaskStepSchema>;

export const RiskClassificationSchema = z.enum([
  'none',
  'low',
  'medium',
  'high',
  'critical',
]);
export type RiskClassification = z.infer<typeof RiskClassificationSchema>;

export const SideEffectClassificationSchema = z.enum([
  'none',
  'read',
  'write',
  'ui',
  'system',
  'network',
  'external',
]);
export type SideEffectClassification = z.infer<typeof SideEffectClassificationSchema>;

export const SkillRiskLevelSchema = z.enum(['none', 'low', 'medium', 'high']);
export type SkillRiskLevel = z.infer<typeof SkillRiskLevelSchema>;

export const SkillCapabilitySchema = z.enum(['echo', 'mock-open-app']);
export type SkillCapability = z.infer<typeof SkillCapabilitySchema>;

export const SkillSideEffectSchema = z.enum(['none', 'read', 'write', 'external']);
export type SkillSideEffect = z.infer<typeof SkillSideEffectSchema>;

export const SkillInputSchema = z
  .object({
    text: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type SkillInput = z.infer<typeof SkillInputSchema>;

export const SkillResultSchema = z
  .object({
    success: z.boolean(),
    output: z.unknown().optional(),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type SkillResult = z.infer<typeof SkillResultSchema>;

export const SkillSpecSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    capability: SkillCapabilitySchema.optional(),
    risk: SkillRiskLevelSchema.optional(),
    sideEffect: SkillSideEffectSchema.optional(),
    preconditions: z.array(z.string().min(1)).default([]),
    inputSchema: z.custom<z.ZodTypeAny>(isZodSchema, {
      message: 'Expected a Zod schema instance.',
    }),
    resultSchema: z.custom<z.ZodTypeAny>(isZodSchema, {
      message: 'Expected a Zod schema instance.',
    }),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type SkillSpec = z.infer<typeof SkillSpecSchema>;

export const ExecutionContextSchema = z
  .object({
    id: z.string().min(1),
    startedAt: isoTimestampSchema,
    agentId: z.string().min(1),
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    environment: jsonRecordSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

export const ApprovalBindingSchema = z
  .object({
    bindingHash: z.string().min(1),
    tokenId: z.string().min(1).optional(),
    approvedBy: z.string().min(1).optional(),
    approvedAt: isoTimestampSchema.optional(),
    expiresAt: isoTimestampSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ApprovalBinding = z.infer<typeof ApprovalBindingSchema>;

export const RollbackRecordSchema = z
  .object({
    possible: z.boolean(),
    kind: z.string().min(1),
    target: z.string().min(1),
    destination: z.string().min(1).optional(),
    backupPath: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
    summary: z.string().min(1),
    reversible: z.boolean().optional(),
    compensationSummary: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RollbackRecord = z.infer<typeof RollbackRecordSchema>;

export const CompensationStatusSchema = z.enum([
  'executed',
  'simulated',
  'blocked',
  'failed',
  'skipped',
]);
export type CompensationStatus = z.infer<typeof CompensationStatusSchema>;

export const CompensationRecordSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    status: CompensationStatusSchema,
    summary: z.string().min(1),
    details: z.unknown().optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type CompensationRecord = z.infer<typeof CompensationRecordSchema>;

export const ActionRequestKindSchema = z.enum([
  'skill',
  'desktop-action',
  'workflow',
  'observation',
  'verification',
]);
export type ActionRequestKind = z.infer<typeof ActionRequestKindSchema>;

export const ActionRequestSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    taskId: z.string().min(1),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1),
    kind: ActionRequestKindSchema,
    actionId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    input: z.unknown(),
    dryRun: z.boolean().default(true),
    risk: RiskClassificationSchema,
    sideEffect: SideEffectClassificationSchema,
    commandPreview: z.string().min(1).optional(),
    bindingHash: z.string().min(1),
    approvalBinding: ApprovalBindingSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ActionRequest = z.infer<typeof ActionRequestSchema>;

export const ActionProposalCapabilityStatusSchema = z.enum([
  'supported',
  'blocked',
  'simulated',
]);
export type ActionProposalCapabilityStatus = z.infer<typeof ActionProposalCapabilityStatusSchema>;

export const ActionProposalSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    requestId: z.string().min(1),
    taskId: z.string().min(1),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1),
    adapterId: z.string().min(1),
    actionId: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    preview: z.string().min(1),
    normalizedInput: z.unknown().optional(),
    risk: RiskClassificationSchema,
    sideEffect: SideEffectClassificationSchema,
    approvalRequired: z.boolean(),
    dryRun: z.boolean(),
    capabilityStatus: ActionProposalCapabilityStatusSchema,
    bindingHash: z.string().min(1),
    approvalBinding: ApprovalBindingSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ActionProposal = z.infer<typeof ActionProposalSchema>;

export const ActionResultStatusSchema = z.enum([
  'executed',
  'simulated',
  'clarification_needed',
  'blocked',
  'denied',
  'escalated',
  'failed',
  'skipped',
  'cancelled',
]);
export type ActionResultStatus = z.infer<typeof ActionResultStatusSchema>;

export const ActionResultSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    requestId: z.string().min(1),
    proposalId: z.string().min(1),
    status: ActionResultStatusSchema,
    summary: z.string().min(1),
    commandId: z.string().min(1).optional(),
    commandHash: z.string().min(1).optional(),
    output: z.unknown().optional(),
    rollback: RollbackRecordSchema.optional(),
    compensation: z.array(CompensationRecordSchema).optional(),
    clarification: clarificationSchema.optional(),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const TaskPlanStatusSchema = z.enum([
  'planned',
  'clarification_needed',
  'blocked',
]);
export type TaskPlanStatus = z.infer<typeof TaskPlanStatusSchema>;

export const TaskPlanSchema = z
  .object({
    id: z.string().min(1),
    taskId: z.string().min(1),
    createdAt: isoTimestampSchema,
    status: TaskPlanStatusSchema,
    summary: z.string().min(1),
    steps: z.array(TaskStepSchema).default([]),
    clarificationNeeded: z.array(z.string().min(1)).default([]),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type TaskPlan = z.infer<typeof TaskPlanSchema>;

export const ObservationEvidenceSourceSchema = z.enum([
  'task',
  'plan',
  'policy',
  'action-proposal',
  'action-result',
  'verification',
  'checkpoint',
  'runtime',
]);
export type ObservationEvidenceSource = z.infer<typeof ObservationEvidenceSourceSchema>;

export const ObservationEvidenceProvenanceSchema = z
  .object({
    sourceType: ObservationEvidenceSourceSchema,
    sourceId: z.string().min(1).optional(),
    adapterId: z.string().min(1).optional(),
    capturedBy: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ObservationEvidenceProvenance = z.infer<typeof ObservationEvidenceProvenanceSchema>;

export const ObservationEvidenceSchema = z
  .object({
    id: z.string().min(1),
    capturedAt: isoTimestampSchema,
    label: z.string().min(1),
    summary: z.string().min(1),
    source: ObservationEvidenceSourceSchema,
    provenance: ObservationEvidenceProvenanceSchema,
    data: z.unknown().optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ObservationEvidence = z.infer<typeof ObservationEvidenceSchema>;

export const ObservationComparisonSchema = z
  .object({
    changed: z.boolean(),
    summary: z.string().min(1),
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ObservationComparison = z.infer<typeof ObservationComparisonSchema>;

export const ObservationSnapshotSchema = z
  .object({
    id: z.string().min(1),
    takenAt: isoTimestampSchema,
    contextId: z.string().min(1),
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()),
    evidence: z.array(ObservationEvidenceSchema).default([]),
    beforeData: z.record(z.string(), z.unknown()).optional(),
    afterData: z.record(z.string(), z.unknown()).optional(),
    comparison: ObservationComparisonSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ObservationSnapshot = z.infer<typeof ObservationSnapshotSchema>;

export const VerificationStatusSchema = z.enum(['passed', 'failed', 'skipped']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const VerificationReportSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1),
    attemptId: z.string().min(1).optional(),
    observationId: z.string().min(1).optional(),
    status: VerificationStatusSchema,
    summary: z.string().min(1).optional(),
    issues: z.array(issueSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

export const PolicyDecisionTypeSchema = z.enum(['allow', 'block', 'escalate']);
export type PolicyDecisionType = z.infer<typeof PolicyDecisionTypeSchema>;

export const PolicyDecisionSchema = z
  .object({
    id: z.string().min(1),
    decidedAt: isoTimestampSchema,
    contextId: z.string().min(1),
    taskId: z.string().min(1).optional(),
    stepId: z.string().min(1).optional(),
    skillId: z.string().min(1).optional(),
    type: PolicyDecisionTypeSchema,
    reason: z.string().min(1),
    risk: RiskClassificationSchema.optional(),
    sideEffect: SideEffectClassificationSchema.optional(),
    approvalRequired: z.boolean().optional(),
    bindingHash: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const AuditStageSchema = z.enum([
  'runtime',
  'task',
  'planner',
  'policy',
  'executor',
  'perception',
  'verifier',
  'checkpoint',
  'result',
  'eval',
]);
export type AuditStage = z.infer<typeof AuditStageSchema>;

export const AuditEventSchema = z
  .object({
    id: z.string().min(1),
    occurredAt: isoTimestampSchema,
    actorId: z.string().min(1),
    taskId: z.string().min(1),
    stage: AuditStageSchema,
    event: z.string().min(1),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1).optional(),
    targetId: z.string().min(1).optional(),
    details: z.unknown().optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditQuerySchema = z
  .object({
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    stage: AuditStageSchema.optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export const ExecutionAttemptStatusSchema = z.enum([
  'queued',
  'running',
  'executed',
  'simulated',
  'clarification_needed',
  'blocked',
  'denied',
  'escalated',
  'failed',
  'skipped',
  'cancelled',
]);
export type ExecutionAttemptStatus = z.infer<typeof ExecutionAttemptStatusSchema>;

export const ExecutionAttemptSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
    jobId: z.string().min(1),
    stepId: z.string().min(1),
    status: ExecutionAttemptStatusSchema,
    request: ActionRequestSchema,
    proposal: ActionProposalSchema.optional(),
    actionResult: ActionResultSchema.optional(),
    retryCount: z.number().int().min(0).default(0),
    summary: z.string().min(1),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type ExecutionAttempt = z.infer<typeof ExecutionAttemptSchema>;

export const RuntimeJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'blocked',
  'clarification_needed',
  'denied',
  'escalated',
  'cancelled',
]);
export type RuntimeJobStatus = z.infer<typeof RuntimeJobStatusSchema>;

export const RuntimeJobSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    startedAt: isoTimestampSchema.optional(),
    finishedAt: isoTimestampSchema.optional(),
    status: RuntimeJobStatusSchema,
    taskId: z.string().min(1),
    planId: z.string().min(1).optional(),
    activeStepId: z.string().min(1).optional(),
    stepIds: z.array(z.string().min(1)).default([]),
    completedStepIds: z.array(z.string().min(1)).default([]),
    attemptIds: z.array(z.string().min(1)).default([]),
    checkpointIds: z.array(z.string().min(1)).default([]),
    auditEventIds: z.array(z.string().min(1)).default([]),
    result: z.unknown().optional(),
    error: issueSchema.optional(),
    resumeCount: z.number().int().min(0).default(0),
    recoverable: z.boolean().default(true),
    cancellable: z.boolean().default(true),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeJob = z.infer<typeof RuntimeJobSchema>;

export const RuntimeContinuationModeSchema = z.enum([
  'exact',
  'reconstructed',
  'unavailable',
]);
export type RuntimeContinuationMode = z.infer<typeof RuntimeContinuationModeSchema>;

export const RuntimeContinuationSchema = z
  .object({
    mode: RuntimeContinuationModeSchema,
    resumable: z.boolean(),
    sourceCheckpointId: z.string().min(1).optional(),
    limitation: z.string().min(1).optional(),
  })
  .strict();
export type RuntimeContinuation = z.infer<typeof RuntimeContinuationSchema>;

export const RuntimeCheckpointSchema = z
  .object({
    id: z.string().min(1),
    jobId: z.string().min(1),
    createdAt: isoTimestampSchema,
    phase: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    activeStepId: z.string().min(1).optional(),
    completedStepIds: z.array(z.string().min(1)).default([]),
    state: z.record(z.string(), z.unknown()),
    continuation: RuntimeContinuationSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeCheckpoint = z.infer<typeof RuntimeCheckpointSchema>;

export const RuntimeOutcomeStatusSchema = z.enum([
  'success',
  'failed',
  'blocked',
  'clarification_needed',
  'denied',
  'escalated',
  'skipped',
  'cancelled',
]);
export type RuntimeOutcomeStatus = z.infer<typeof RuntimeOutcomeStatusSchema>;

export const RuntimeTaskResultSchema = z
  .object({
    id: z.string().min(1),
    status: RuntimeOutcomeStatusSchema,
    summary: z.string().min(1).optional(),
    output: z.unknown().optional(),
    clarificationNeeded: z.array(z.string().min(1)).default([]),
    clarification: clarificationSchema.optional(),
    policyDecision: PolicyDecisionSchema,
    policyBlock: z
      .object({
        reason: z.string().min(1),
        code: z.string().min(1),
      })
      .strict()
      .optional(),
    policyEscalation: z
      .object({
        reason: z.string().min(1),
        code: z.string().min(1),
      })
      .strict()
      .optional(),
    denial: z
      .object({
        reason: z.string().min(1),
        code: z.string().min(1),
      })
      .strict()
      .optional(),
    verification: VerificationReportSchema.optional(),
    lastAttemptId: z.string().min(1).optional(),
    continuation: RuntimeContinuationSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeTaskResult = z.infer<typeof RuntimeTaskResultSchema>;

export const RuntimeProgressEventSchema = z
  .object({
    id: z.string().min(1),
    occurredAt: isoTimestampSchema,
    taskId: z.string().min(1),
    jobId: z.string().min(1),
    status: RuntimeJobStatusSchema,
    currentStepId: z.string().min(1).nullable(),
    currentStepIndex: z.number().int().min(0),
    stepCount: z.number().int().min(0),
    completedStepIds: z.array(z.string().min(1)).default([]),
    checkpointId: z.string().min(1).optional(),
    summary: z.string().min(1),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeProgressEvent = z.infer<typeof RuntimeProgressEventSchema>;

export const AgentRuntimeRunResultSchema = z
  .object({
    task: AgentTaskSchema,
    executionContext: ExecutionContextSchema,
    job: RuntimeJobSchema,
    plan: TaskPlanSchema,
    plannedStep: TaskStepSchema,
    plannedSteps: z.array(TaskStepSchema),
    executionAttempts: z.array(ExecutionAttemptSchema),
    observation: ObservationSnapshotSchema,
    observations: z.array(ObservationSnapshotSchema),
    policyDecision: PolicyDecisionSchema,
    verification: VerificationReportSchema,
    result: RuntimeTaskResultSchema,
    auditTrail: z.array(AuditEventSchema),
    checkpoint: RuntimeCheckpointSchema,
  })
  .strict();
export type AgentRuntimeRunResult = z.infer<typeof AgentRuntimeRunResultSchema>;

export const AgentRuntimeInspectionSchema = z
  .object({
    job: RuntimeJobSchema,
    task: AgentTaskSchema.optional(),
    executionContext: ExecutionContextSchema.optional(),
    plan: TaskPlanSchema.optional(),
    plannedSteps: z.array(TaskStepSchema).default([]),
    executionAttempts: z.array(ExecutionAttemptSchema).default([]),
    latestObservation: ObservationSnapshotSchema.optional(),
    observations: z.array(ObservationSnapshotSchema).default([]),
    policyDecision: PolicyDecisionSchema.optional(),
    verification: VerificationReportSchema.optional(),
    result: RuntimeTaskResultSchema.optional(),
    latestCheckpoint: RuntimeCheckpointSchema.optional(),
    checkpoints: z.array(RuntimeCheckpointSchema).default([]),
    auditTrail: z.array(AuditEventSchema).default([]),
  })
  .strict();
export type AgentRuntimeInspection = z.infer<typeof AgentRuntimeInspectionSchema>;

export const AgentEvalCaseSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    task: AgentTaskSchema,
    expectedStatus: RuntimeOutcomeStatusSchema,
    expectedPolicyDecisionType: PolicyDecisionTypeSchema.optional(),
    expectedVerificationStatus: VerificationStatusSchema.optional(),
    expectedPlanStepCount: z.number().int().min(1).optional(),
    expectedCheckpointPhase: z.string().min(1).optional(),
    expectedContinuationMode: RuntimeContinuationModeSchema.optional(),
    expectedContinuationResumable: z.boolean().optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type AgentEvalCase = z.infer<typeof AgentEvalCaseSchema>;

export const AgentEvalCaseResultSchema = z
  .object({
    caseId: z.string().min(1),
    status: z.enum(['passed', 'failed', 'blocked', 'escalated']),
    issues: z.array(issueSchema).default([]),
    run: AgentRuntimeRunResultSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type AgentEvalCaseResult = z.infer<typeof AgentEvalCaseResultSchema>;

export const AgentEvalReportSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoTimestampSchema,
    totals: z
      .object({
        total: z.number().int().min(0),
        passed: z.number().int().min(0),
        failed: z.number().int().min(0),
        blocked: z.number().int().min(0),
        escalated: z.number().int().min(0),
      })
      .strict(),
    cases: z.array(AgentEvalCaseResultSchema),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type AgentEvalReport = z.infer<typeof AgentEvalReportSchema>;
