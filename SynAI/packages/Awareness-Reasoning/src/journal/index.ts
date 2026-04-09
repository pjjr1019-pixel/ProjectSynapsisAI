import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AwarenessArea,
  AwarenessEvent,
  AwarenessEventType,
  EvidenceRef,
  PermissionTier,
  PrivacyScope
} from "../contracts/awareness";

export interface AppendAwarenessEventInput {
  type: AwarenessEventType;
  source: string;
  sessionId: string;
  evidenceRefs?: EvidenceRef[];
  affectedAreas?: AwarenessArea[];
  confidence?: number;
  privacyScope?: PrivacyScope;
  permissionTier?: PermissionTier;
  message?: string;
  details?: Record<string, unknown>;
}

const normalizeArray = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

export const normalizeAwarenessEvent = (
  input: AppendAwarenessEventInput & Partial<Pick<AwarenessEvent, "id" | "timestamp">>
): AwarenessEvent => ({
  id: input.id ?? randomUUID(),
  timestamp: input.timestamp ?? new Date().toISOString(),
  type: input.type,
  source: input.source,
  sessionId: input.sessionId,
  evidenceRefs: normalizeArray(input.evidenceRefs),
  affectedAreas: normalizeArray(input.affectedAreas),
  confidence: input.confidence,
  privacyScope: input.privacyScope,
  permissionTier: input.permissionTier,
  message: input.message,
  details: input.details
});

export const appendAwarenessEvent = async (
  eventsPath: string,
  input: AppendAwarenessEventInput
): Promise<AwarenessEvent> => {
  await mkdir(path.dirname(eventsPath), { recursive: true });
  const event = normalizeAwarenessEvent(input);
  await appendFile(eventsPath, `${JSON.stringify(event)}\n`, "utf8");
  return event;
};

export const readAwarenessEvents = async (eventsPath: string): Promise<AwarenessEvent[]> => {
  try {
    const raw = await readFile(eventsPath, "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AwarenessEvent);
  } catch {
    return [];
  }
};

const MAX_JOURNAL_EVENTS = 500;

/**
 * Truncate the journal file to the most recent maxEvents entries.
 * Called on session start to prevent unbounded file growth.
 */
export const rotateEventsJournal = async (
  eventsPath: string,
  maxEvents = MAX_JOURNAL_EVENTS
): Promise<void> => {
  const events = await readAwarenessEvents(eventsPath);
  if (events.length <= maxEvents) {
    return;
  }
  await writeAwarenessEventJournal(eventsPath, events.slice(-maxEvents));
};

export const writeAwarenessEventJournal = async (
  eventsPath: string,
  events: AwarenessEvent[]
): Promise<void> => {
  await mkdir(path.dirname(eventsPath), { recursive: true });
  const body = events.map((event) => JSON.stringify(event)).join("\n");
  await writeFile(eventsPath, body ? `${body}\n` : "", "utf8");
};

