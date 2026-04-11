import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
const normalizeArray = (value) => (Array.isArray(value) ? value : []);
export const normalizeAwarenessEvent = (input) => ({
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
export const appendAwarenessEvent = async (eventsPath, input) => {
    await mkdir(path.dirname(eventsPath), { recursive: true });
    const event = normalizeAwarenessEvent(input);
    await appendFile(eventsPath, `${JSON.stringify(event)}\n`, "utf8");
    return event;
};
export const readAwarenessEvents = async (eventsPath) => {
    try {
        const raw = await readFile(eventsPath, "utf8");
        return raw
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }
    catch {
        return [];
    }
};
const MAX_JOURNAL_EVENTS = 500;
/**
 * Truncate the journal file to the most recent maxEvents entries.
 * Called on session start to prevent unbounded file growth.
 */
export const rotateEventsJournal = async (eventsPath, maxEvents = MAX_JOURNAL_EVENTS) => {
    const events = await readAwarenessEvents(eventsPath);
    if (events.length <= maxEvents) {
        return;
    }
    await writeAwarenessEventJournal(eventsPath, events.slice(-maxEvents));
};
export const writeAwarenessEventJournal = async (eventsPath, events) => {
    await mkdir(path.dirname(eventsPath), { recursive: true });
    const body = events.map((event) => JSON.stringify(event)).join("\n");
    await writeFile(eventsPath, body ? `${body}\n` : "", "utf8");
};
