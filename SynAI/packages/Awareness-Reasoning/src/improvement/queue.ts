/**
 * Improvement Event Queue
 * 
 * Persistent, inspectable queue for improvement events detected from user prompts and assistant replies.
 * Supports: insert, query, update, deduplication with cooldown and repeat-count tracking.
 * 
 * Uses the same file-based JSON persistence pattern as the rest of the repo.
 */

import { loadDatabase, mutateDatabase } from "@memory/storage/db";
import type { ImprovementEvent } from "@contracts/improvement";
import { randomUUID } from "node:crypto";
import crypto from "crypto";

/**
 * Normalize a prompt text into a fingerprint for deduplication.
 * Removes whitespace variations, lowercases, hashes to keep size reasonable.
 */
function createFingerprint(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Check if an event is in cooldown (to prevent spam from near-duplicates).
 */
function isInCooldown(event: ImprovementEvent): boolean {
  const cooldownUntil = new Date(event.payload.cooldownUntil);
  const now = new Date();
  return now < cooldownUntil;
}

/**
 * Calculate cooldown end time (5 minutes from now by default).
 */
function calculateCooldownUntil(minutes = 5): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

/**
 * Create a new improvement event in the queue.
 * 
 * On duplicate fingerprint within 7 days:
 * - Increment repeatCount on the existing event
 * - Extend cooldown
 * - Return the updated event (not a new one)
 * 
 * Otherwise:
 * - Create a new event
 */
export async function insertImprovementEvent(
  type: ImprovementEvent["type"],
  recommendation: ImprovementEvent["recommendation"],
  risk: ImprovementEvent["risk"],
  userPromptExcerpt: string,
  assistantReplyExcerpt: string,
  options?: {
    sourceConversationId?: string;
    reasoning?: string;
    payload?: Partial<ImprovementEvent["payload"]>;
  }
): Promise<ImprovementEvent> {
  const fingerprint = createFingerprint(userPromptExcerpt);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return mutateDatabase((db) => {
    // Check for recent duplicate
    const recentDuplicate = db.improvementEvents.find(
      (e) =>
        e.payload.fingerprint === fingerprint &&
        new Date(e.createdAt) > sevenDaysAgo
    );

    if (recentDuplicate) {
      // Increment repeat count, extend cooldown
      recentDuplicate.payload.repeatCount += 1;
      recentDuplicate.payload.cooldownUntil = calculateCooldownUntil(10); // Longer cooldown
      recentDuplicate.payload.lastSimilarEventId = recentDuplicate.id;
      recentDuplicate.updatedAt = now.toISOString();
      return db;
    }

    // Create new event
    const event: ImprovementEvent = {
      id: randomUUID(),
      type,
      recommendation,
      risk,
      status: "detected",
      userPromptExcerpt,
      assistantReplyExcerpt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      sourceConversationId: options?.sourceConversationId,
      reasoning: options?.reasoning,
      payload: {
        fingerprint,
        cooldownUntil: calculateCooldownUntil(5),
        repeatCount: 1,
        ...options?.payload
      }
    };

    db.improvementEvents.push(event);
    return db;
  }).then(() => {
    // Re-fetch the event we just created/updated
    return loadDatabase().then((db) => {
      const fingerprint = createFingerprint(userPromptExcerpt);
      const event = db.improvementEvents.find(
        (e) => e.payload.fingerprint === fingerprint
      );
      if (!event) throw new Error("Failed to insert improvement event");
      return event;
    });
  });
}

/**
 * Query improvement events with optional filters.
 */
export async function queryImprovementEvents(options?: {
  type?: ImprovementEvent["type"];
  status?: ImprovementEvent["status"];
  risk?: ImprovementEvent["risk"];
  sourceConversationId?: string;
  limit?: number;
  skip?: number;
}): Promise<ImprovementEvent[]> {
  const db = await loadDatabase();
  let results = [...db.improvementEvents];

  if (options?.type) results = results.filter((e) => e.type === options.type);
  if (options?.status) results = results.filter((e) => e.status === options.status);
  if (options?.risk) results = results.filter((e) => e.risk === options.risk);
  if (options?.sourceConversationId) {
    results = results.filter((e) => e.sourceConversationId === options.sourceConversationId);
  }

  // Sort by creation date descending
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const skip = options?.skip ?? 0;
  const limit = options?.limit ?? 100;
  return results.slice(skip, skip + limit);
}

/**
 * Update the status of an improvement event.
 */
export async function updateImprovementEventStatus(
  eventId: string,
  status: ImprovementEvent["status"],
  additionalData?: Partial<ImprovementEvent>
): Promise<ImprovementEvent | null> {
  return mutateDatabase((db) => {
    const event = db.improvementEvents.find((e) => e.id === eventId);
    if (!event) return db;

    event.status = status;
    event.updatedAt = new Date().toISOString();
    Object.assign(event, additionalData);
    return db;
  }).then(() => {
    return loadDatabase().then((db) => {
      const event = db.improvementEvents.find((e) => e.id === eventId);
      return event ?? null;
    });
  });
}

/**
 * Get a single improvement event by ID.
 */
export async function getImprovementEventById(eventId: string): Promise<ImprovementEvent | null> {
  const db = await loadDatabase();
  return db.improvementEvents.find((e) => e.id === eventId) ?? null;
}

/**
 * Get all improvement events in a given status.
 */
export async function getEventsByStatus(status: ImprovementEvent["status"]): Promise<ImprovementEvent[]> {
  return queryImprovementEvents({ status });
}

/**
 * Get events that are ready to be processed (status = "detected" or "queued").
 * Excludes events in cooldown.
 */
export async function getReadyToProcessEvents(): Promise<ImprovementEvent[]> {
  const db = await loadDatabase();
  return db.improvementEvents.filter(
    (e) =>
      (e.status === "detected" || e.status === "queued") &&
      !isInCooldown(e)
  ).sort((a, b) => {
    // Sort by risk (high first), then by repeat count
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (riskOrder[a.risk as keyof typeof riskOrder] !== riskOrder[b.risk as keyof typeof riskOrder]) {
      return (
        riskOrder[a.risk as keyof typeof riskOrder] - riskOrder[b.risk as keyof typeof riskOrder]
      );
    }
    return b.payload.repeatCount - a.payload.repeatCount;
  });
}

/**
 * Mark an event as processed (status = "queued").
 */
export async function markEventAsQueued(eventId: string): Promise<ImprovementEvent | null> {
  return updateImprovementEventStatus(eventId, "queued");
}
