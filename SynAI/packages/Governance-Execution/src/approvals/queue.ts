import { appendFile, mkdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  GovernanceApprovalQueueRecord,
  GovernanceApprovalQueueSnapshot,
  GovernanceApprovalQueueStatus
} from "@contracts";

const JSONL_NAME = "approval-queue.jsonl";

const json = (value: unknown): string => `${JSON.stringify(value)}\n`;

const readJsonl = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
};

const writeEvent = async (filePath: string, record: GovernanceApprovalQueueRecord): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, json({ timestamp: new Date().toISOString(), record }), "utf8");
};

const foldRecords = (records: GovernanceApprovalQueueRecord[]): GovernanceApprovalQueueRecord[] => {
  const folded = new Map<string, GovernanceApprovalQueueRecord>();
  for (const record of records) {
    const key = record.id || record.commandHash || randomUUID();
    const existing = folded.get(key);
    if (!existing || existing.updatedAt <= record.updatedAt) {
      folded.set(key, { ...record, id: key });
    }
  }
  return [...folded.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

const countByStatus = (
  records: GovernanceApprovalQueueRecord[]
): GovernanceApprovalQueueSnapshot["totals"] => {
  const totals: GovernanceApprovalQueueSnapshot["totals"] = {
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
    const status = record.status as GovernanceApprovalQueueStatus;
    if (status in totals) {
      totals[status] += 1;
    }
  }

  return totals;
};

export interface GovernanceApprovalQueueStore {
  record(record: GovernanceApprovalQueueRecord): Promise<void>;
  list(): Promise<GovernanceApprovalQueueSnapshot>;
}

export const createGovernanceApprovalQueueStore = (runtimeRoot: string): GovernanceApprovalQueueStore => {
  const filePath = path.join(runtimeRoot, JSONL_NAME);

  return {
    async record(record: GovernanceApprovalQueueRecord): Promise<void> {
      await writeEvent(filePath, {
        ...record,
        id: record.id || record.commandHash || randomUUID(),
        metadata: record.metadata ?? null
      });
    },
    async list(): Promise<GovernanceApprovalQueueSnapshot> {
      const events = await readJsonl<{ timestamp?: string; record: GovernanceApprovalQueueRecord }>(filePath);
      const records = foldRecords(
        events
          .map((event) => ({
            ...event.record,
            createdAt: event.record.createdAt || event.timestamp || new Date().toISOString(),
            updatedAt: event.record.updatedAt || event.timestamp || new Date().toISOString()
          }))
          .filter((record) => Boolean(record.commandHash))
      );

      return {
        capturedAt: new Date().toISOString(),
        totals: countByStatus(records),
        records
      };
    }
  };
};

export const readGovernanceApprovalQueueSnapshot = async (
  runtimeRoot: string
): Promise<GovernanceApprovalQueueSnapshot> => createGovernanceApprovalQueueStore(runtimeRoot).list();
