import { readFile } from "node:fs/promises";
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
  `${source}.commands.jsonl`;

export const queryGovernanceAuditEntries = async (
  runtimeRoot: string,
  query: GovernanceAuditQuery = {}
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

  entries.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const limit = typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0 ? query.limit : 50;
  return entries.slice(0, limit);
};
