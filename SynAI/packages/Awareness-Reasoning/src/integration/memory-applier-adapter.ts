/**
 * Memory Auto-Applier Adapter
 * 
 * Routes memory_candidate improvement events to the memory storage layer.
 * Only allows specific categories to be auto-saved (narrow allowlist).
 * 
 * Usage:
 *   import { setupMemoryAutoApplier } from "@awareness/integration/memory-applier-adapter";
 *   setupMemoryAutoApplier();
 */

import type { ImprovementEvent } from "@contracts/improvement";
import type { MemoryCategory } from "@contracts/memory";
import { upsertMemory } from "../memory/storage/memories";
import { queryImprovementEvents, updateImprovementEventStatus } from "../improvement/queue";

/**
 * Allowed memory categories for auto-application.
 * Narrow allowlist to prevent noise and ensure quality.
 */
const ALLOWED_MEMORY_CATEGORIES: MemoryCategory[] = [
  "preference",
  "personal_fact",
  "project",
  "goal"
];

interface MemoryApplyResult {
  eventId: string;
  success: boolean;
  memoryId?: string;
  reason?: string;
}

/**
 * Extract memory text from an improvement event reasoning.
 */
function extractMemoryText(reasoning: string | undefined): string | null {
  if (!reasoning) return null;

  // Extract substance fact from reasoning
  // E.g. "Memory candidate: User prefers Dark mode" -> "User prefers Dark mode"
  const match = reasoning.match(/(?:memory candidate|fact|info):\s*(.+)/i);
  if (match) return match[1].trim();

  return null;
}

/**
 * Infer memory category from improvement event context.
 */
function inferMemoryCategory(event: ImprovementEvent): MemoryCategory | null {
  if (!event.reasoning) return "note";

  const reasoning = event.reasoning.toLowerCase();
  
  if (reasoning.includes("preference") || reasoning.includes("prefer")) {
    return "preference";
  }
  if (reasoning.includes("goal") || reasoning.includes("want")) {
    return "goal";
  }
  if (reasoning.includes("project") || reasoning.includes("workspace")) {
    return "project";
  }
  if (reasoning.includes("constraint") || reasoning.includes("rule")) {
    return "constraint";
  }

  return "personal_fact";
}

/**
 * Process a single improvement event for memory application.
 */
async function applyMemoryFromEvent(event: ImprovementEvent): Promise<MemoryApplyResult> {
  try {
    if (event.type !== "memory_candidate") {
      return { eventId: event.id, success: false, reason: "Not a memory_candidate event" };
    }

    if (event.status !== "detected") {
      return { eventId: event.id, success: false, reason: "Event not in detected status" };
    }

    const memoryText = extractMemoryText(event.reasoning);
    if (!memoryText || memoryText.length < 5) {
      return { eventId: event.id, success: false, reason: "Could not extract memory text" };
    }

    const category = inferMemoryCategory(event);
    if (!category || !ALLOWED_MEMORY_CATEGORIES.includes(category)) {
      return { eventId: event.id, success: false, reason: `Category ${category} not in allowlist` };
    }

    // Calculate importance based on event risk
    const importanceMap = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4 };
    const importance = importanceMap[event.risk as keyof typeof importanceMap] || 0.5;

    const memory = await upsertMemory({
      category,
      text: memoryText,
      sourceConversationId: event.sourceConversationId || "unknown",
      importance
    });

    // Mark event as applied
    await updateImprovementEventStatus(event.id, "applied");

    return { eventId: event.id, success: true, memoryId: memory.id };
  } catch (err) {
    console.warn(`[Memory Applier] Failed to apply memory for event ${event.id}:`, err);
    return { eventId: event.id, success: false, reason: String(err) };
  }
}

/**
 * Process all queued memory_candidate events.
 */
export async function applyQueuedMemories(): Promise<MemoryApplyResult[]> {
  try {
    const events = await queryImprovementEvents({
      type: "memory_candidate",
      status: "detected"
    });

    const results = await Promise.all(events.map((event) => applyMemoryFromEvent(event)));

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      console.info(`[Memory Applier] Applied ${successCount} memories from improvement events`);
    }

    return results;
  } catch (err) {
    console.warn("[Memory Applier] Failed to apply queued memories:", err);
    return [];
  }
}

/**
 * Setup periodic memory application.
 * Checks for new memory_candidate events every 30 seconds.
 */
export function setupMemoryAutoApplier(intervalMs = 30000): () => void {
  const timer = setInterval(() => {
    void applyQueuedMemories();
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
