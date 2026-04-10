import type { AuditEvent, AuditStage } from '../contracts';
import { createRuntimeId, nowIso } from '../core';

export const createAuditEvent = (input: {
  taskId: string;
  stage: AuditStage;
  event: string;
  actorId?: string;
  jobId?: string;
  stepId?: string;
  targetId?: string;
  details?: unknown;
  metadata?: Record<string, unknown>;
}): AuditEvent => ({
  id: createRuntimeId('audit'),
  occurredAt: nowIso(),
  actorId: input.actorId ?? 'synai-agent-runtime',
  taskId: input.taskId,
  stage: input.stage,
  event: input.event,
  jobId: input.jobId,
  stepId: input.stepId,
  targetId: input.targetId,
  details: input.details,
  metadata: input.metadata,
});

export interface AuditStore {
  emit(event: AuditEvent): void;
  getAll(): AuditEvent[];
}

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  emit(event: AuditEvent): void {
    this.events.push(event);
  }

  getAll(): AuditEvent[] {
    return [...this.events];
  }
}

