import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { cloneValue, createRuntimeId, nowIso } from '../core';
export const createAuditEvent = (input) => ({
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
const filterAuditEvents = (events, query) => {
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
export class InMemoryAuditStore {
    events = [];
    emit(event) {
        this.events.push(cloneValue(event));
    }
    getAll() {
        return this.events.map((event) => cloneValue(event));
    }
    query(query) {
        return filterAuditEvents(this.events, query);
    }
}
export class FileAuditStore {
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async ensureRoot() {
        await mkdir(this.rootDir, { recursive: true });
    }
    async getAuditFilePath(jobId, taskId) {
        await this.ensureRoot();
        const safeName = jobId ?? taskId;
        return path.join(this.rootDir, `${safeName}.json`);
    }
    async readAuditFile(filePath) {
        try {
            const content = await readFile(filePath, 'utf8');
            const parsed = JSON.parse(content);
            return parsed.map((event) => cloneValue(event));
        }
        catch {
            return [];
        }
    }
    async writeAuditFile(filePath, events) {
        await writeFile(filePath, JSON.stringify(events, null, 2), 'utf8');
    }
    async emit(event) {
        const filePath = await this.getAuditFilePath(event.jobId, event.taskId);
        const events = await this.readAuditFile(filePath);
        events.push(cloneValue(event));
        await this.writeAuditFile(filePath, events);
    }
    async getAll() {
        await this.ensureRoot();
        const entries = await readdir(this.rootDir).catch(() => []);
        const files = entries.filter((entry) => entry.endsWith('.json'));
        const events = await Promise.all(files.map(async (entry) => this.readAuditFile(path.join(this.rootDir, entry))));
        return events
            .flat()
            .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
            .map((event) => cloneValue(event));
    }
    async query(query) {
        if (query?.jobId) {
            const filePath = await this.getAuditFilePath(query.jobId, query.taskId ?? query.jobId);
            const events = await this.readAuditFile(filePath);
            return filterAuditEvents(events, query);
        }
        return filterAuditEvents(await this.getAll(), query);
    }
}
