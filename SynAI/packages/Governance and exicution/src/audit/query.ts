import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import type { GovernanceAuditEntry, GovernanceAuditQuery } from "@contracts";

const AUDIT_FILES = [
  { source: "governed-chat" as const, fileName: "governed-chat.commands.jsonl" },
  { source: "workflow" as const, fileName: "workflow.commands.jsonl" },
  { source: "desktop-actions" as const, fileName: "desktop-actions.commands.jsonl" }
];

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

const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const includesText = (value: string, needle: string | null | undefined): boolean =>
  !needle || value.toLowerCase().includes(needle.toLowerCase());

const toEntry = (source: GovernanceAuditEntry["source"], raw: Record<string, unknown>): GovernanceAuditEntry => {
  const route = typeof raw.route === "object" && raw.route !== null ? (raw.route as Record<string, unknown>) : null;
  const commandName =
    typeof raw.commandName === "string"
      ? raw.commandName
      : typeof raw.command === "string"
        ? raw.command
        : typeof raw.route === "string"
          ? raw.route
          : typeof route?.actionType === "string"
            ? route.actionType
            : source;
  const timestamp =
    typeof raw.timestamp === "string"
      ? raw.timestamp
      : typeof raw.startedAt === "string"
        ? raw.startedAt
        : typeof raw.completedAt === "string"
          ? raw.completedAt
          : new Date().toISOString();
  const status =
    typeof raw.status === "string"
      ? raw.status
      : typeof raw.outcome === "string"
        ? raw.outcome
        : typeof raw.decision === "string"
          ? raw.decision
          : "unknown";
  const summary =
    typeof raw.summary === "string"
      ? raw.summary
      : typeof route?.reasoningSummary === "string"
        ? route.reasoningSummary
        : typeof raw.message === "string"
          ? raw.message
          : status;

  return {
    source,
    timestamp,
    commandName,
    status,
    summary,
    commandId: typeof raw.commandId === "string" ? raw.commandId : null,
    commandHash: typeof raw.commandHash === "string" ? raw.commandHash : null,
    details: raw,
    provenance: {
      sourceFile: fileNameHint(source),
      capturedAt: timestamp
    },
    lifecycle: {
      status: "live"
    }
  };
};

const fileNameHint = (source: GovernanceAuditEntry["source"]): string =>
  source === "agent-runtime" ? "agent-runtime/audit/*.json" : `${source}.commands.jsonl`;

interface AgentRuntimeAuditEventRecord {
  id: string;
  occurredAt: string;
  taskId: string;
  stage: string;
  event: string;
  jobId?: string;
  stepId?: string;
  targetId?: string;
  details?: unknown;
  metadata?: Record<string, unknown>;
}

interface AgentRuntimeJobRecord {
  id: string;
  status?: string;
  finishedAt?: string;
  metadata?: Record<string, unknown>;
}

interface AgentRuntimeCheckpointRecord {
  id: string;
  jobId: string;
  createdAt: string;
  summary?: string;
  state?: Record<string, unknown>;
}

const toRuntimeTaskTitle = (checkpoint: AgentRuntimeCheckpointRecord | null, job: AgentRuntimeJobRecord | null): string | null => {
  const stateTask = checkpoint?.state?.task;
  if (stateTask && typeof stateTask === "object" && typeof (stateTask as Record<string, unknown>).title === "string") {
    return String((stateTask as Record<string, unknown>).title);
  }

  const metadataTitle = job?.metadata?.taskTitle;
  return typeof metadataTitle === "string" ? metadataTitle : null;
};

const toRuntimeBindingHash = (
  event: AgentRuntimeAuditEventRecord,
  checkpoint: AgentRuntimeCheckpointRecord | null
): string | null => {
  if (event.details && typeof event.details === "object" && typeof (event.details as Record<string, unknown>).bindingHash === "string") {
    return String((event.details as Record<string, unknown>).bindingHash);
  }

  const policyDecision = checkpoint?.state?.policyDecision;
  if (policyDecision && typeof policyDecision === "object" && typeof (policyDecision as Record<string, unknown>).bindingHash === "string") {
    return String((policyDecision as Record<string, unknown>).bindingHash);
  }

  return null;
};

const toRuntimeTerminalStatus = (
  event: AgentRuntimeAuditEventRecord,
  checkpoint: AgentRuntimeCheckpointRecord | null,
  job: AgentRuntimeJobRecord | null
): string | null => {
  if (event.stage === "result") {
    return event.event;
  }

  const result = checkpoint?.state?.result;
  if (result && typeof result === "object" && typeof (result as Record<string, unknown>).status === "string") {
    return String((result as Record<string, unknown>).status);
  }

  return typeof job?.status === "string" ? job.status : null;
};

const toRuntimeSummary = (event: AgentRuntimeAuditEventRecord): string => {
  if (event.details && typeof event.details === "object") {
    const details = event.details as Record<string, unknown>;
    if (typeof details.summary === "string") {
      return details.summary;
    }
    if (typeof details.reason === "string") {
      return details.reason;
    }
    if (typeof details.taskTitle === "string") {
      return details.taskTitle;
    }
  }

  return `${event.stage}:${event.event}`;
};

const toRuntimeAuditEntry = (
  event: AgentRuntimeAuditEventRecord,
  job: AgentRuntimeJobRecord | null,
  checkpoint: AgentRuntimeCheckpointRecord | null
): GovernanceAuditEntry => {
  const rawDetails =
    event.details && typeof event.details === "object" ? (event.details as Record<string, unknown>) : null;
  const bindingHash = toRuntimeBindingHash(event, checkpoint);
  const terminalStatus = toRuntimeTerminalStatus(event, checkpoint, job);
  const taskTitle = toRuntimeTaskTitle(checkpoint, job);
  const commandName = taskTitle ?? `agent-runtime:${event.taskId}`;
  const summary = toRuntimeSummary(event);

  return {
    source: "agent-runtime",
    timestamp: event.occurredAt,
    commandName,
    status: terminalStatus ?? event.event,
    summary,
    commandId: event.jobId ?? null,
    commandHash: bindingHash,
    details: {
      ...(rawDetails ?? {}),
      auditEventId: event.id,
      auditStage: event.stage,
      auditEvent: event.event,
      taskId: event.taskId,
      jobId: event.jobId ?? null,
      stepId: event.stepId ?? null,
      targetId: event.targetId ?? null,
      taskTitle,
      bindingHash,
      terminalStatus,
      latestCheckpointId: checkpoint?.id ?? null,
      checkpointSummary: checkpoint?.summary ?? null
    },
    provenance: {
      sourceFile: fileNameHint("agent-runtime"),
      capturedAt: event.occurredAt
    },
    lifecycle: {
      status: "live"
    }
  };
};

const queryAgentRuntimeAuditEntries = async (
  agentRuntimeRoot: string
): Promise<GovernanceAuditEntry[]> => {
  const jobsDir = path.join(agentRuntimeRoot, "jobs");
  const checkpointsDir = path.join(agentRuntimeRoot, "checkpoints");
  const auditDir = path.join(agentRuntimeRoot, "audit");

  const [jobFiles, checkpointJobDirs, auditFiles] = await Promise.all([
    readdir(jobsDir).catch(() => []),
    readdir(checkpointsDir).catch(() => []),
    readdir(auditDir).catch(() => [])
  ]);

  const jobs = await Promise.all(
    jobFiles
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const job = await readJsonFile<AgentRuntimeJobRecord | null>(path.join(jobsDir, entry), null);
        return job ? [job.id, job] as const : null;
      })
  );
  const jobsById = new Map(jobs.filter((entry): entry is readonly [string, AgentRuntimeJobRecord] => entry !== null));

  const latestCheckpointEntries = await Promise.all(
    checkpointJobDirs.map(async (jobId) => {
      const entries = await readdir(path.join(checkpointsDir, jobId)).catch(() => []);
      const checkpoints = await Promise.all(
        entries
          .filter((entry) => entry.endsWith(".json"))
          .map((entry) =>
            readJsonFile<AgentRuntimeCheckpointRecord | null>(path.join(checkpointsDir, jobId, entry), null)
          )
      );
      const latestCheckpoint = checkpoints
        .filter((checkpoint): checkpoint is AgentRuntimeCheckpointRecord => checkpoint !== null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .at(-1);

      return latestCheckpoint ? [jobId, latestCheckpoint] as const : null;
    })
  );
  const latestCheckpointByJobId = new Map(
    latestCheckpointEntries.filter(
      (entry): entry is readonly [string, AgentRuntimeCheckpointRecord] => entry !== null
    )
  );

  const auditEvents = await Promise.all(
    auditFiles
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) =>
        readJsonFile<AgentRuntimeAuditEventRecord[]>(path.join(auditDir, entry), [])
      )
  );

  return auditEvents
    .flat()
    .map((event) =>
      toRuntimeAuditEntry(
        event,
        event.jobId ? jobsById.get(event.jobId) ?? null : null,
        event.jobId ? latestCheckpointByJobId.get(event.jobId) ?? null : null
      )
    );
};

export interface GovernanceAuditQueryOptions {
  agentRuntimeRoot?: string | null;
}

export const queryGovernanceAuditEntries = async (
  runtimeRoot: string,
  query: GovernanceAuditQuery = {},
  options: GovernanceAuditQueryOptions = {}
): Promise<GovernanceAuditEntry[]> => {
  const entries: GovernanceAuditEntry[] = [];
  for (const file of AUDIT_FILES) {
    if (query.sources?.length && !query.sources.includes(file.source)) {
      continue;
    }

    const records = await readJsonl<Record<string, unknown>>(path.join(runtimeRoot, file.fileName));
    for (const record of records) {
      const entry = toEntry(file.source, record);
      if (!includesText(entry.commandName, query.commandNameIncludes)) {
        continue;
      }
      if (!includesText(entry.status, query.statusIncludes)) {
        continue;
      }
      if (!includesText(entry.summary, query.summaryIncludes)) {
        continue;
      }
      entries.push(entry);
    }
  }

  if (
    options.agentRuntimeRoot &&
    (!query.sources?.length || query.sources.includes("agent-runtime"))
  ) {
    const runtimeEntries = await queryAgentRuntimeAuditEntries(options.agentRuntimeRoot);
    for (const entry of runtimeEntries) {
      if (!includesText(entry.commandName, query.commandNameIncludes)) {
        continue;
      }
      if (!includesText(entry.status, query.statusIncludes)) {
        continue;
      }
      if (!includesText(entry.summary, query.summaryIncludes)) {
        continue;
      }
      entries.push(entry);
    }
  }

  entries.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const limit = typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0 ? query.limit : 50;
  return entries.slice(0, limit);
};
