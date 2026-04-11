import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
const AUDIT_FILES = [
    { source: "governed-chat", fileName: "governed-chat.commands.jsonl" },
    { source: "workflow", fileName: "workflow.commands.jsonl" },
    { source: "desktop-actions", fileName: "desktop-actions.commands.jsonl" }
];
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
const readJsonFile = async (filePath, fallback) => {
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
};
const includesText = (value, needle) => !needle || value.toLowerCase().includes(needle.toLowerCase());
const toEntry = (source, raw) => {
    const route = typeof raw.route === "object" && raw.route !== null ? raw.route : null;
    const commandName = typeof raw.commandName === "string"
        ? raw.commandName
        : typeof raw.command === "string"
            ? raw.command
            : typeof raw.route === "string"
                ? raw.route
                : typeof route?.actionType === "string"
                    ? route.actionType
                    : source;
    const timestamp = typeof raw.timestamp === "string"
        ? raw.timestamp
        : typeof raw.startedAt === "string"
            ? raw.startedAt
            : typeof raw.completedAt === "string"
                ? raw.completedAt
                : new Date().toISOString();
    const status = typeof raw.status === "string"
        ? raw.status
        : typeof raw.outcome === "string"
            ? raw.outcome
            : typeof raw.decision === "string"
                ? raw.decision
                : "unknown";
    const summary = typeof raw.summary === "string"
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
const fileNameHint = (source) => source === "agent-runtime" ? "agent-runtime/audit/*.json" : `${source}.commands.jsonl`;
const toRuntimeTaskTitle = (checkpoint, job) => {
    const stateTask = checkpoint?.state?.task;
    if (stateTask && typeof stateTask === "object" && typeof stateTask.title === "string") {
        return String(stateTask.title);
    }
    const metadataTitle = job?.metadata?.taskTitle;
    return typeof metadataTitle === "string" ? metadataTitle : null;
};
const toRuntimeBindingHash = (event, checkpoint) => {
    if (event.details && typeof event.details === "object" && typeof event.details.bindingHash === "string") {
        return String(event.details.bindingHash);
    }
    const policyDecision = checkpoint?.state?.policyDecision;
    if (policyDecision && typeof policyDecision === "object" && typeof policyDecision.bindingHash === "string") {
        return String(policyDecision.bindingHash);
    }
    return null;
};
const toRuntimeTerminalStatus = (event, checkpoint, job) => {
    if (event.stage === "result") {
        return event.event;
    }
    const result = checkpoint?.state?.result;
    if (result && typeof result === "object" && typeof result.status === "string") {
        return String(result.status);
    }
    return typeof job?.status === "string" ? job.status : null;
};
const toRuntimeSummary = (event) => {
    if (event.details && typeof event.details === "object") {
        const details = event.details;
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
const toRuntimeAuditEntry = (event, job, checkpoint) => {
    const rawDetails = event.details && typeof event.details === "object" ? event.details : null;
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
const queryAgentRuntimeAuditEntries = async (agentRuntimeRoot) => {
    const jobsDir = path.join(agentRuntimeRoot, "jobs");
    const checkpointsDir = path.join(agentRuntimeRoot, "checkpoints");
    const auditDir = path.join(agentRuntimeRoot, "audit");
    const [jobFiles, checkpointJobDirs, auditFiles] = await Promise.all([
        readdir(jobsDir).catch(() => []),
        readdir(checkpointsDir).catch(() => []),
        readdir(auditDir).catch(() => [])
    ]);
    const jobs = await Promise.all(jobFiles
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
        const job = await readJsonFile(path.join(jobsDir, entry), null);
        return job ? [job.id, job] : null;
    }));
    const jobsById = new Map(jobs.filter((entry) => entry !== null));
    const latestCheckpointEntries = await Promise.all(checkpointJobDirs.map(async (jobId) => {
        const entries = await readdir(path.join(checkpointsDir, jobId)).catch(() => []);
        const checkpoints = await Promise.all(entries
            .filter((entry) => entry.endsWith(".json"))
            .map((entry) => readJsonFile(path.join(checkpointsDir, jobId, entry), null)));
        const latestCheckpoint = checkpoints
            .filter((checkpoint) => checkpoint !== null)
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
            .at(-1);
        return latestCheckpoint ? [jobId, latestCheckpoint] : null;
    }));
    const latestCheckpointByJobId = new Map(latestCheckpointEntries.filter((entry) => entry !== null));
    const auditEvents = await Promise.all(auditFiles
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => readJsonFile(path.join(auditDir, entry), [])));
    return auditEvents
        .flat()
        .map((event) => toRuntimeAuditEntry(event, event.jobId ? jobsById.get(event.jobId) ?? null : null, event.jobId ? latestCheckpointByJobId.get(event.jobId) ?? null : null));
};
export const queryGovernanceAuditEntries = async (runtimeRoot, query = {}, options = {}) => {
    const entries = [];
    for (const file of AUDIT_FILES) {
        if (query.sources?.length && !query.sources.includes(file.source)) {
            continue;
        }
        const records = await readJsonl(path.join(runtimeRoot, file.fileName));
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
    if (options.agentRuntimeRoot &&
        (!query.sources?.length || query.sources.includes("agent-runtime"))) {
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
