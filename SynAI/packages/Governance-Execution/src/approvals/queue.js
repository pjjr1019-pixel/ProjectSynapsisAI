import { appendFile, mkdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
const JSONL_NAME = "approval-queue.jsonl";
const json = (value) => `${JSON.stringify(value)}\n`;
const readJsonl = async (filePath) => {
    try {
        const raw = await readFile(filePath, "utf8");
        return raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }
    catch {
        return [];
    }
};
const writeEvent = async (filePath, record) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, json({ timestamp: new Date().toISOString(), record }), "utf8");
};
const foldRecords = (records) => {
    const folded = new Map();
    for (const record of records) {
        const key = record.id || record.commandHash || randomUUID();
        const existing = folded.get(key);
        if (!existing || existing.updatedAt <= record.updatedAt) {
            folded.set(key, { ...record, id: key });
        }
    }
    return [...folded.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};
const countByStatus = (records) => {
    const totals = {
        total: records.length,
        pending: 0,
        approved: 0,
        consumed: 0,
        denied: 0,
        blocked: 0,
        revoked: 0,
        expired: 0
    };
    for (const record of records) {
        const status = record.status;
        if (status in totals) {
            totals[status] += 1;
        }
    }
    return totals;
};
export const createGovernanceApprovalQueueStore = (runtimeRoot) => {
    const filePath = path.join(runtimeRoot, JSONL_NAME);
    return {
        async record(record) {
            await writeEvent(filePath, {
                ...record,
                id: record.id || record.commandHash || randomUUID(),
                metadata: record.metadata ?? null
            });
        },
        async list() {
            const events = await readJsonl(filePath);
            const records = foldRecords(events
                .map((event) => ({
                ...event.record,
                createdAt: event.record.createdAt || event.timestamp || new Date().toISOString(),
                updatedAt: event.record.updatedAt || event.timestamp || new Date().toISOString()
            }))
                .filter((record) => Boolean(record.commandHash)));
            return {
                capturedAt: new Date().toISOString(),
                totals: countByStatus(records),
                records
            };
        }
    };
};
export const readGovernanceApprovalQueueSnapshot = async (runtimeRoot) => createGovernanceApprovalQueueStore(runtimeRoot).list();
