import type {
  CapabilityCaseRecord,
  CapabilityEventRecord,
  CapabilityRunRecord,
  CapabilityRunSnapshot,
  CapabilityRunStatus
} from "../contracts/capability-runner";
import { loadDatabase, mutateDatabase } from "../memory/storage/db";

const TERMINAL_RUN_STATUSES = new Set<CapabilityRunStatus>(["completed", "failed", "stopped"]);

const sortRuns = (runs: CapabilityRunRecord[]): CapabilityRunRecord[] =>
  [...runs].sort((left, right) => right.created_at.localeCompare(left.created_at));

const sortCases = (cases: CapabilityCaseRecord[]): CapabilityCaseRecord[] =>
  [...cases].sort((left, right) => left.case_index - right.case_index);

const sortEvents = (events: CapabilityEventRecord[]): CapabilityEventRecord[] =>
  [...events].sort((left, right) => left.ts.localeCompare(right.ts));

export const listCapabilityRuns = async (): Promise<CapabilityRunRecord[]> => {
  const db = await loadDatabase();
  return sortRuns(db.capabilityRuns ?? []);
};

export const getCapabilityRun = async (runId: string): Promise<CapabilityRunRecord | null> => {
  const db = await loadDatabase();
  return db.capabilityRuns.find((entry) => entry.id === runId) ?? null;
};

export const upsertCapabilityRun = async (run: CapabilityRunRecord): Promise<CapabilityRunRecord> => {
  const db = await mutateDatabase((current) => {
    const nextRuns = current.capabilityRuns.filter((entry) => entry.id !== run.id);
    return {
      ...current,
      capabilityRuns: sortRuns([run, ...nextRuns])
    };
  });

  return db.capabilityRuns.find((entry) => entry.id === run.id) ?? run;
};

export const replaceCapabilityCases = async (
  runId: string,
  cases: CapabilityCaseRecord[]
): Promise<CapabilityCaseRecord[]> => {
  const db = await mutateDatabase((current) => ({
    ...current,
    capabilityCases: [
      ...current.capabilityCases.filter((entry) => entry.run_id !== runId),
      ...sortCases(cases)
    ]
  }));

  return sortCases(db.capabilityCases.filter((entry) => entry.run_id === runId));
};

export const upsertCapabilityCase = async (record: CapabilityCaseRecord): Promise<CapabilityCaseRecord> => {
  const db = await mutateDatabase((current) => {
    const nextCases = current.capabilityCases.filter((entry) => entry.id !== record.id);
    return {
      ...current,
      capabilityCases: [...nextCases, record]
    };
  });

  return db.capabilityCases.find((entry) => entry.id === record.id) ?? record;
};

export const listCapabilityCases = async (runId: string): Promise<CapabilityCaseRecord[]> => {
  const db = await loadDatabase();
  return sortCases(db.capabilityCases.filter((entry) => entry.run_id === runId));
};

export const appendCapabilityEvent = async (
  event: CapabilityEventRecord
): Promise<CapabilityEventRecord> => {
  const db = await mutateDatabase((current) => ({
    ...current,
    capabilityEvents: [...current.capabilityEvents, event]
  }));

  return db.capabilityEvents.find((entry) => entry.id === event.id) ?? event;
};

export const listCapabilityEvents = async (
  runId: string,
  limit = 500
): Promise<CapabilityEventRecord[]> => {
  const db = await loadDatabase();
  const all = sortEvents(db.capabilityEvents.filter((entry) => entry.run_id === runId));
  return limit > 0 ? all.slice(-limit) : all;
};

export const getCapabilityRunSnapshot = async (
  runId?: string | null,
  eventLimit = 500
): Promise<CapabilityRunSnapshot | null> => {
  const db = await loadDatabase();
  const run =
    (runId ? db.capabilityRuns.find((entry) => entry.id === runId) : sortRuns(db.capabilityRuns)[0]) ?? null;

  if (!run) {
    return null;
  }

  return {
    run,
    cases: sortCases(db.capabilityCases.filter((entry) => entry.run_id === run.id)),
    events: sortEvents(db.capabilityEvents.filter((entry) => entry.run_id === run.id)).slice(-eventLimit)
  };
};

export const getLatestNonTerminalCapabilityRun = async (): Promise<CapabilityRunRecord | null> => {
  const runs = await listCapabilityRuns();
  return runs.find((entry) => !TERMINAL_RUN_STATUSES.has(entry.status)) ?? null;
};

export const recoverCapabilityRuns = async (): Promise<CapabilityRunRecord[]> => {
  const now = new Date().toISOString();
  const db = await mutateDatabase((current) => {
    let changed = false;

    const capabilityRuns = current.capabilityRuns.map((run) => {
      if (TERMINAL_RUN_STATUSES.has(run.status)) {
        return run;
      }

      changed = true;
      return {
        ...run,
        status: "paused",
        current_case_id: null,
        current_case_index: null,
        updated_at: now
      } satisfies CapabilityRunRecord;
    });

    const capabilityCases = current.capabilityCases.map((record) => {
      if (record.status !== "running") {
        return record;
      }

      changed = true;
      return {
        ...record,
        status: "interrupted",
        ended_at: record.ended_at ?? now,
        duration_ms:
          record.duration_ms ??
          (record.started_at ? Math.max(0, Date.parse(now) - Date.parse(record.started_at)) : null),
        updated_at: now
      } satisfies CapabilityCaseRecord;
    });

    if (!changed) {
      return current;
    }

    return {
      ...current,
      capabilityRuns,
      capabilityCases
    };
  });

  return sortRuns(db.capabilityRuns.filter((entry) => !TERMINAL_RUN_STATUSES.has(entry.status)));
};
