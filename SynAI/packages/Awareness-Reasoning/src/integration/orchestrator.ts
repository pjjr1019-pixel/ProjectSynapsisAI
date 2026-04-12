/**
 * Improvement System Orchestrator
 * 
 * Central orchestration for triggering improvements based on user actions.
 * Coordinates analyzer, appliers, and governance in response to events.
 */

import type { ImprovementEvent } from "@contracts/improvement";
import { queryImprovementEvents, updateImprovementEventStatus } from "../improvement/queue";
import { applyQueuedMemories } from "./memory-applier-adapter";
import { applyQueuedReplyPolicies } from "./reply-policy-applier-adapter";

interface OrchestratorConfig {
  autoApplyMemory?: boolean;
  autoApplyReplyPolicies?: boolean;
  verbose?: boolean;
}

/**
 * Process all pending improvements in priority order.
 */
export async function processPendingImprovements(config: OrchestratorConfig = {}): Promise<void> {
  const { autoApplyMemory = false, autoApplyReplyPolicies = false, verbose = false } = config;

  try {
    // Get all detected but not yet processed events
    const events = await queryImprovementEvents({ status: "detected" });

    if (verbose) {
      console.info(`[Orchestrator] Processing ${events.length} detected improvements`);
    }

    // Sort by risk (higher risk first)
    const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    events.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    // Process each event
    for (const event of events) {
      if (event.recommendation === "memory" && autoApplyMemory) {
        await applyQueuedMemories();
      } else if (event.recommendation === "update_reply_policy" && autoApplyReplyPolicies) {
        await applyQueuedReplyPolicies();
      } else if (event.recommendation === "escalate") {
        // Mark for manual review
        await updateImprovementEventStatus(event.id, "escalated");
        if (verbose) {
          console.info(`[Orchestrator] Escalated event ${event.id} for manual review`);
        }
      } else {
        // Mark as queued if no action taken
        await updateImprovementEventStatus(event.id, "queued");
      }
    }

    if (verbose) {
      console.info(`[Orchestrator] Completed processing ${events.length} improvements`);
    }
  } catch (err) {
    console.warn("[Orchestrator] Error processing improvements:", err);
  }
}

/**
 * Get a summary of current improvement system state.
 */
export async function getImprovementSystemStatus(): Promise<{
  totalEvents: number;
  detectedCount: number;
  queuedCount: number;
  appliedCount: number;
  escalatedCount: number;
  byType: Record<string, number>;
  byRisk: Record<string, number>;
}> {
  try {
    const allEvents = await queryImprovementEvents({});

    const status = {
      totalEvents: allEvents.length,
      detectedCount: 0,
      queuedCount: 0,
      appliedCount: 0,
      escalatedCount: 0,
      byType: {} as Record<string, number>,
      byRisk: {} as Record<string, number>
    };

    for (const event of allEvents) {
      // Count by status
      if (event.status === "detected") status.detectedCount++;
      if (event.status === "queued") status.queuedCount++;
      if (event.status === "applied") status.appliedCount++;
      if (event.status === "escalated") status.escalatedCount++;

      // Count by type
      status.byType[event.type] = (status.byType[event.type] || 0) + 1;

      // Count by risk
      status.byRisk[event.risk] = (status.byRisk[event.risk] || 0) + 1;
    }

    return status;
  } catch (err) {
    console.warn("[Orchestrator] Error getting system status:", err);
    return {
      totalEvents: 0,
      detectedCount: 0,
      queuedCount: 0,
      appliedCount: 0,
      escalatedCount: 0,
      byType: {},
      byRisk: {}
    };
  }
}

/**
 * Clear all queued improvements (for testing/reset).
 */
export async function clearQueuedImprovements(): Promise<number> {
  try {
    const queuedEvents = await queryImprovementEvents({ status: "queued" });
    let cleared = 0;

    for (const event of queuedEvents) {
      // In a real system, would permanently delete from storage
      // For now, just mark as archived
      await updateImprovementEventStatus(event.id, "archived");
      cleared++;
    }

    console.info(`[Orchestrator] Cleared ${cleared} queued improvements`);
    return cleared;
  } catch (err) {
    console.warn("[Orchestrator] Error clearing queue:", err);
    return 0;
  }
}
