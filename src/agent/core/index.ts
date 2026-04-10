import type {
  AgentTask,
  AuditEvent,
  ExecutionContext,
  RuntimeCheckpoint,
  RuntimeJob,
  RuntimeJobStatus,
  TaskStep,
} from '../contracts';

export const AGENT_RUNTIME_ACTOR_ID = 'synai-agent-runtime';

export const nowIso = (): string => new Date().toISOString();

const createRandomSuffix = (): string => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (typeof randomUuid === 'string' && randomUuid.length > 0) {
    return randomUuid;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const createRuntimeId = (prefix: string): string => `${prefix}-${createRandomSuffix()}`;

export const createAgentTask = (task: {
  id: string;
  title: string;
  description?: string;
  status?: AgentTask['status'];
  steps?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}): AgentTask => {
  const createdAt = task.createdAt ?? nowIso();
  const updatedAt = task.updatedAt ?? createdAt;

  return {
    id: task.id,
    createdAt,
    updatedAt,
    status: task.status ?? 'pending',
    title: task.title,
    description: task.description,
    steps: task.steps ?? [],
    metadata: task.metadata,
  };
};

export const createExecutionContext = (input: {
  agentId?: string;
  taskId?: string;
  jobId?: string;
  userId?: string;
  environment?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  id?: string;
}): ExecutionContext => ({
  id: input.id ?? createRuntimeId('ctx'),
  startedAt: input.startedAt ?? nowIso(),
  agentId: input.agentId ?? AGENT_RUNTIME_ACTOR_ID,
  taskId: input.taskId,
  jobId: input.jobId,
  userId: input.userId,
  environment: input.environment,
  metadata: input.metadata,
});

export const createRuntimeJob = (input: {
  taskId: string;
  status?: RuntimeJobStatus;
  startedAt?: string;
  finishedAt?: string;
  stepIds?: string[];
  result?: unknown;
  error?: { message: string; code?: string; details?: unknown };
  metadata?: Record<string, unknown>;
  id?: string;
  createdAt?: string;
}): RuntimeJob => ({
  id: input.id ?? createRuntimeId('job'),
  createdAt: input.createdAt ?? nowIso(),
  startedAt: input.startedAt,
  finishedAt: input.finishedAt,
  status: input.status ?? 'queued',
  taskId: input.taskId,
  stepIds: input.stepIds ?? [],
  result: input.result,
  error: input.error,
  metadata: input.metadata,
});

export const createRuntimeCheckpoint = (input: {
  jobId: string;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  id?: string;
  createdAt?: string;
}): RuntimeCheckpoint => ({
  id: input.id ?? createRuntimeId('ckpt'),
  jobId: input.jobId,
  createdAt: input.createdAt ?? nowIso(),
  state: input.state,
  metadata: input.metadata,
});

export const createAuditTrailEvent = (event: AuditEvent): AuditEvent => event;

export const attachStepToTask = (task: AgentTask, step: TaskStep): AgentTask => ({
  ...task,
  updatedAt: step.updatedAt,
  status: step.status === 'completed' ? 'completed' : task.status,
  steps: task.steps.includes(step.id) ? task.steps : [...task.steps, step.id],
});
