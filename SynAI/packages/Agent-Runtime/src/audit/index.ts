import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { AuditEvent, AuditQuery, AuditStage } from '../contracts';
import { cloneValue, createRuntimeId, nowIso } from '../core';

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

const filterAuditEvents = (events: AuditEvent[], query?: AuditQuery): AuditEvent[] => {
  const filtered = events.filter((event) => {
    if (query?.taskId && event.taskId !== query.taskId) {
      return false;
    }

    if (query?.jobId && event.jobId !== query.jobId) {
      return false;
    }

    if (query?.stage && event.stage !== query.stage) {
      return false;
    }

    return true;
  });

  const limited = typeof query?.limit === 'number' ? filtered.slice(-query.limit) : filtered;
  return limited.map((event) => cloneValue(event));
};

export interface AuditStore {
  emit(event: AuditEvent): void | Promise<void>;
  getAll(): AuditEvent[] | Promise<AuditEvent[]>;
  query(query?: AuditQuery): AuditEvent[] | Promise<AuditEvent[]>;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly events: AuditEvent[] = [];

  emit(event: AuditEvent): void {
    this.events.push(cloneValue(event));
  }

  getAll(): AuditEvent[] {
    return this.events.map((event) => cloneValue(event));
  }

  query(query?: AuditQuery): AuditEvent[] {
    return filterAuditEvents(this.events, query);
  }
}

export class FileAuditStore implements AuditStore {
  constructor(private readonly rootDir: string) {}

  private async ensureRoot(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
  }

  private async getAuditFilePath(jobId: string | undefined, taskId: string): Promise<string> {
    await this.ensureRoot();
    const safeName = jobId ?? taskId;
    return path.join(this.rootDir, `${safeName}.json`);
  }

  private async readAuditFile(filePath: string): Promise<AuditEvent[]> {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as AuditEvent[];
      return parsed.map((event) => cloneValue(event));
    } catch {
      return [];
    }
  }

  private async writeAuditFile(filePath: string, events: AuditEvent[]): Promise<void> {
    await writeFile(filePath, JSON.stringify(events, null, 2), 'utf8');
  }

  async emit(event: AuditEvent): Promise<void> {
    const filePath = await this.getAuditFilePath(event.jobId, event.taskId);
    const events = await this.readAuditFile(filePath);
    events.push(cloneValue(event));
    await this.writeAuditFile(filePath, events);
  }

  async getAll(): Promise<AuditEvent[]> {
    await this.ensureRoot();
    const entries = await readdir(this.rootDir).catch(() => []);
    const files = entries.filter((entry) => entry.endsWith('.json'));
    const events = await Promise.all(
      files.map(async (entry) => this.readAuditFile(path.join(this.rootDir, entry))),
    );
    return events
      .flat()
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .map((event) => cloneValue(event));
  }

  async query(query?: AuditQuery): Promise<AuditEvent[]> {
    if (query?.jobId) {
      const filePath = await this.getAuditFilePath(query.jobId, query.taskId ?? query.jobId);
      const events = await this.readAuditFile(filePath);
      return filterAuditEvents(events, query);
    }

    return filterAuditEvents(await this.getAll(), query);
  }
}
