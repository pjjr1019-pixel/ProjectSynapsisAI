import { z } from 'zod';

const isoTimestampSchema = z.string().datetime();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const issueSchema = z.object({
  message: z.string().min(1),
  code: z.string().min(1).optional(),
  details: z.unknown().optional(),
});

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

export const ObservationSnapshotSchema = z
  .object({
    id: z.string().min(1),
    takenAt: isoTimestampSchema,
    contextId: z.string().min(1),
    taskId: z.string().min(1).optional(),
    jobId: z.string().min(1).optional(),
    stepId: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()),
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
    status: VerificationStatusSchema,
    issues: z.array(issueSchema).default([]),
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
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const AuditStageSchema = z.enum([
  'task',
  'planner',
  'policy',
  'executor',
  'perception',
  'verifier',
  'result',
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

export const RuntimeJobStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'blocked',
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
    stepIds: z.array(z.string().min(1)).default([]),
    result: z.unknown().optional(),
    error: issueSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeJob = z.infer<typeof RuntimeJobSchema>;

export const RuntimeCheckpointSchema = z
  .object({
    id: z.string().min(1),
    jobId: z.string().min(1),
    createdAt: isoTimestampSchema,
    state: z.record(z.string(), z.unknown()),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeCheckpoint = z.infer<typeof RuntimeCheckpointSchema>;

export const RuntimeOutcomeStatusSchema = z.enum(['success', 'failed', 'blocked', 'escalated']);
export type RuntimeOutcomeStatus = z.infer<typeof RuntimeOutcomeStatusSchema>;

export const RuntimeTaskResultSchema = z
  .object({
    id: z.string().min(1),
    status: RuntimeOutcomeStatusSchema,
    output: z.unknown().optional(),
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
    verification: VerificationReportSchema.optional(),
    metadata: jsonRecordSchema.optional(),
  })
  .strict();
export type RuntimeTaskResult = z.infer<typeof RuntimeTaskResultSchema>;

export const AgentRuntimeRunResultSchema = z
  .object({
    task: AgentTaskSchema,
    executionContext: ExecutionContextSchema,
    job: RuntimeJobSchema,
    plannedStep: TaskStepSchema,
    observation: ObservationSnapshotSchema,
    policyDecision: PolicyDecisionSchema,
    verification: VerificationReportSchema,
    result: RuntimeTaskResultSchema,
    auditTrail: z.array(AuditEventSchema),
    checkpoint: RuntimeCheckpointSchema,
  })
  .strict();
export type AgentRuntimeRunResult = z.infer<typeof AgentRuntimeRunResultSchema>;

