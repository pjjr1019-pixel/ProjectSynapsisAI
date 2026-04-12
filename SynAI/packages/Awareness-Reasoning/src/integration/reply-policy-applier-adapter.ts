/**
 * Reply-Policy Applier Adapter
 * 
 * Routes weak_reply + update_reply_policy improvements to the reply-policy overlay.
 * Always writes to overlay only, never touches canonical rules.
 * 
 * Usage:
 *   import { applyQueuedReplyPolicies, setupReplyPolicyAutoApplier } from "@awareness/integration/reply-policy-applier-adapter";
 *   setupReplyPolicyAutoApplier();
 */

import type { ImprovementEvent, ReplyPolicyRule } from "@contracts/improvement";
import { 
  addGeneratedReplyPolicyRule,
  updateImprovementEventStatus
} from "../improvement/queue";
import { queryImprovementEvents } from "../improvement/queue";

interface ReplyPolicyApplyResult {
  eventId: string;
  success: boolean;
  ruleId?: string;
  reason?: string;
}

/**
 * Generate a fallback reply for different failure categories.
 */
function generateReplyPolicyFallback(event: ImprovementEvent): string {
  const prompt = event.userPromptExcerpt;

  if (prompt.toLowerCase().includes("file") || prompt.toLowerCase().includes("calendar")) {
    return "I don't have that capability yet, but I can help you with task tracking or note-taking.";
  }
  if (prompt.toLowerCase().includes("time")) {
    return "I'm not equipped for time tracking, but I can help organize your tasks.";
  }
  if (event.assistantReplyExcerpt.toLowerCase().includes("error")) {
    return "I encountered an issue. Could you try again or provide more details?";
  }

  return "I'm not sure how to help with that right now. Could you rephrase your question?";
}

/**
 * Derive a policy category from the improvement event.
 */
function derivePolicyCategory(event: ImprovementEvent): string {
  const { userPromptExcerpt, assistantReplyExcerpt } = event;
  const combined = `${userPromptExcerpt} ${assistantReplyExcerpt}`.toLowerCase();

  if (combined.includes("calendar")) return "calendar_missing";
  if (combined.includes("file") || combined.includes("document")) return "file_capability_missing";
  if (combined.includes("time") || combined.includes("clock")) return "time_tracking_missing";
  if (combined.includes("schedule") || combined.includes("appointment")) return "scheduler_missing";

  return "unknown_capability_missing";
}

/**
 * Process a single improvement event for reply-policy application.
 */
async function applyReplyPolicyFromEvent(event: ImprovementEvent): Promise<ReplyPolicyApplyResult> {
  try {
    if (event.recommendation !== "update_reply_policy") {
      return { eventId: event.id, success: false, reason: "Not a reply_policy recommendation" };
    }

    if (event.status !== "detected") {
      return { eventId: event.id, success: false, reason: "Event not in detected status" };
    }

    const category = derivePolicyCategory(event);
    const fallback = generateReplyPolicyFallback(event);

    const rule: ReplyPolicyRule = {
      id: `policy-${event.id.slice(0, 8)}`,
      category,
      condition: `User asks about ${category.replace(/_/g, " ")}`,
      fallbackReply: fallback,
      risk: event.risk,
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: event.id,
      createdAt: new Date().toISOString()
    };

    // Add to overlay (never canonical)
    await addGeneratedReplyPolicyRule(rule);

    // Mark event as applied
    await updateImprovementEventStatus(event.id, "applied");

    return { eventId: event.id, success: true, ruleId: rule.id };
  } catch (err) {
    console.warn(`[Reply-Policy Applier] Failed for event ${event.id}:`, err);
    return { eventId: event.id, success: false, reason: String(err) };
  }
}

/**
 * Apply all queued reply-policy improvements.
 */
export async function applyQueuedReplyPolicies(): Promise<ReplyPolicyApplyResult[]> {
  try {
    const events = await queryImprovementEvents({
      type: "weak_reply",
      status: "detected"
    });

    const results = await Promise.all(events.map((event) => applyReplyPolicyFromEvent(event)));

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      console.info(`[Reply-Policy Applier] Applied ${successCount} reply policies from improvement events`);
    }

    return results;
  } catch (err) {
    console.warn("[Reply-Policy Applier] Failed to apply queued policies:", err);
    return [];
  }
}

/**
 * Setup periodic reply-policy application.
 * Checks for new weak_reply events every 45 seconds.
 */
export function setupReplyPolicyAutoApplier(intervalMs = 45000): () => void {
  const timer = setInterval(() => {
    void applyQueuedReplyPolicies();
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
