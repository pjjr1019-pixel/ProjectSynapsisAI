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
const isZodSchema = (value) => typeof value === 'object' &&
    value !== null &&
    typeof value.parse === 'function' &&
    typeof value.safeParse === 'function';
export const AgentTaskStatusSchema = z.enum([
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled',
]);
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
export const TaskStepStatusSchema = z.enum([
    'pending',
    'in_progress',
    'completed',
    'failed',
    'skipped',
]);
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
export const RiskClassificationSchema = z.enum([
    'none',
    'low',
    'medium',
    'high',
    'critical',
]);
export const SideEffectClassificationSchema = z.enum([
    'none',
    'read',
    'write',
    'ui',
    'system',
    'network',
    'external',
]);
export const SkillRiskLevelSchema = z.enum(['none', 'low', 'medium', 'high']);
export const SkillCapabilitySchema = z.enum(['echo', 'mock-open-app']);
export const SkillSideEffectSchema = z.enum(['none', 'read', 'write', 'external']);
export const SkillInputSchema = z
    .object({
    text: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
export const SkillResultSchema = z
    .object({
    success: z.boolean(),
    output: z.unknown().optional(),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
export const SkillSpecSchema = z
    .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    capability: SkillCapabilitySchema.optional(),
    risk: SkillRiskLevelSchema.optional(),
    sideEffect: SkillSideEffectSchema.optional(),
    preconditions: z.array(z.string().min(1)).default([]),
    inputSchema: z.custom(isZodSchema, {
        message: 'Expected a Zod schema instance.',
    }),
    resultSchema: z.custom(isZodSchema, {
        message: 'Expected a Zod schema instance.',
    }),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
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
export const CompensationStatusSchema = z.enum([
    'executed',
    'simulated',
    'blocked',
    'failed',
    'skipped',
]);
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
export const ActionRequestKindSchema = z.enum([
    'skill',
    'desktop-action',
    'workflow',
    'observation',
    'verification',
]);
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
export const ActionProposalCapabilityStatusSchema = z.enum([
    'supported',
    'blocked',
    'simulated',
]);
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
export const TaskPlanStatusSchema = z.enum([
    'planned',
    'clarification_needed',
    'blocked',
]);
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
export const ObservationEvidenceProvenanceSchema = z
    .object({
    sourceType: ObservationEvidenceSourceSchema,
    sourceId: z.string().min(1).optional(),
    adapterId: z.string().min(1).optional(),
    capturedBy: z.string().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
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
export const ObservationComparisonSchema = z
    .object({
    changed: z.boolean(),
    summary: z.string().min(1),
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
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
export const VerificationStatusSchema = z.enum(['passed', 'failed', 'skipped']);
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
export const PolicyDecisionTypeSchema = z.enum(['allow', 'block', 'escalate']);
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
export const AuditQuerySchema = z
    .object({
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    stage: AuditStageSchema.optional(),
    limit: z.number().int().positive().optional(),
})
    .strict();
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
export const RuntimeContinuationModeSchema = z.enum([
    'exact',
    'reconstructed',
    'unavailable',
]);
export const RuntimeContinuationSchema = z
    .object({
    mode: RuntimeContinuationModeSchema,
    resumable: z.boolean(),
    sourceCheckpointId: z.string().min(1).optional(),
    limitation: z.string().min(1).optional(),
})
    .strict();
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
export const AgentEvalCaseResultSchema = z
    .object({
    caseId: z.string().min(1),
    status: z.enum(['passed', 'failed', 'blocked', 'escalated']),
    issues: z.array(issueSchema).default([]),
    run: AgentRuntimeRunResultSchema.optional(),
    metadata: jsonRecordSchema.optional(),
})
    .strict();
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
