/**
 * Improvement Planner
 * 
 * Routes queued improvement events to outcomes (memory, reply-policy, patch proposals, escalations).
 * Applies deterministic rules to decide what action to take.
 */

import type {
  ImprovementEvent,
  PlannerInput,
  PlannerOutput,
  PlannerAction,
  ReplyPolicyRule,
  PatchProposal
} from "@contracts/improvement";
import type { CapabilityGapProposal } from "../../../Governance-Execution/src/governed-chat/types";
import { updateImprovementEventStatus } from "./queue";
import { randomUUID } from "node:crypto";
import { loadDatabase, mutateDatabase } from "@memory/storage/db";

/**
 * Planner rules that decide what to do with each event type.
 * 
 * The planner uses these rules in order:
 * 1. Capability gap + repeated (2+) → patch proposal
 * 2. Weak reply + clear category → reply-policy update
 * 3. Tool failure → escalate
 * 4. Memory candidate + high confidence → update memory
 * 5. Feature request → propose only
 * 6. Needs review → escalate
 * 7. Unknown/ambiguous → defer
 */

/**
 * Create a reply-policy rule only for LOW-RISK, CLEARLY WEAK FALLBACK cases.
 * Conservative scope per Phase 3 requirements:
 * - Only create for missing features (calendar, task manager, time tracking)
 * - Only if confidence is high that improvement is appropriate
 * - Never create for ambiguous or broad architectural changes
 */
function createReplyPolicyRuleIfClear(event: ImprovementEvent): ReplyPolicyRule | null {
  // Only create rules for clearly identified missing features
  const isCalendarCase = event.reasoning?.includes("Calendar") || event.userPromptExcerpt?.toLowerCase().includes("calendar");
  const isTimeCase = event.reasoning?.includes("time") && event.reasoning?.includes("track");
  const isTaskCase = event.reasoning?.includes("Task") || event.userPromptExcerpt?.toLowerCase().includes("task");

  // Confidence check: only proceed if reasoning clearly identifies the gap
  const hasStrongEvidence = isCalendarCase || isTimeCase || isTaskCase;
  if (!hasStrongEvidence) {
    return null; // Don't create rule for ambiguous cases
  }

  // Determine category
  let category = "weak_reply";
  if (isCalendarCase) category = "calendar_missing";
  else if (isTimeCase) category = "time_tracking_missing";
  else if (isTaskCase) category = "task_management_missing";

  const fallbackReply = generateBetterFallback(event.userPromptExcerpt, category);

  return {
    id: `rule-${randomUUID().slice(0, 8)}`,
    category,
    matchConditions: {
      keywords: getKeywordsForCategory(category),
      categoryPattern: category
    },
    rewrittenFallback: fallbackReply,
    risk: "low",
    enabled: true,
    confidence: 0.9, // High confidence for clearly missing features
    fingerprint: "", // Will be computed by overlay service
    hitCount: 0,
    lastUsedAt: null,
    sourceEventId: event.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get weak fallback keywords for a category
 */
function getKeywordsForCategory(category: string): string[] {
  const keywordMap: Record<string, string[]> = {
    calendar_missing: ["calendar", "schedule", "date"],
    time_tracking_missing: ["time", "track", "timer"],
    task_management_missing: ["task", "todo", "priority"],
    weak_reply: ["don't", "can't", "not available"]
  };
  return keywordMap[category] || keywordMap.weak_reply;
}

function generateBetterFallback(prompt: string, category: string): string {
  const fallbacks: Record<string, string> = {
    calendar_missing:
      "I don't have a calendar interface, but I can help you track tasks and important dates using my memory. Would you like me to note something for you?",
    time_tracking_missing:
      "I don't have time-tracking features, but I can track tasks and priorities. Would you like me to help organize your work?",
    task_management_missing:
      "I don't have a task manager yet, but I can remember your tasks and help you prioritize. Would you like to do that?",
    weak_reply:
      "I can't do that directly, but let me suggest the closest thing I can help with instead."
  };

  return fallbacks[category] || fallbacks.weak_reply;
}

function createPatchProposal(event: ImprovementEvent): PatchProposal {
  const isCapabilityGap = event.type === "capability_gap";
  const isRepeated = event.payload.repeatCount > 1;

  let scope: "scaffold" | "small_ui" | "small_tool_wrapper" = "scaffold";
  let effort: "tiny" | "small" | "medium" = "tiny";

  if (event.reasoning?.includes("Calendar")) {
    scope = "small_ui";
    effort = "small";
  } else if (event.reasoning?.includes("time")) {
    scope = "small_tool_wrapper";
    effort = "small";
  }

  const testPlan = [
    "User requests ability → AI detects it's missing",
    "Same request made again → event escalation confirmed",
    "Patch applied → ability becomes available",
    "Request fulfilled → test passes"
  ];

  return {
    id: `patch-${randomUUID().slice(0, 8)}`,
    fromImprovementEventId: event.id,
    targetFiles: [],
    estimatedLinesChanged: 20,
    scope,
    risk: isRepeated ? "medium" : "low",
    estimatedEffort: effort,
    testPlan,
    approvalRequired: isRepeated,
    status: "drafted",
    createdAt: new Date().toISOString(),
    reasoning: event.reasoning
  };
}

/**
 * Apply the planner rules to an event and return the actions to take.
 */
function planActions(event: ImprovementEvent): PlannerAction[] {
  const actions: PlannerAction[] = [];

  // Rule 1: capability_gap + repeated (2+) → patch proposal
  if (event.type === "capability_gap" && event.payload.repeatCount >= 2) {
    actions.push({
      type: "create_patch_proposal",
      event,
      patchProposal: createPatchProposal(event),
      reasoning: `Capability gap repeated ${event.payload.repeatCount} times; patch proposal warranted`
    });
  }

  // Rule 2: weak_reply + CLEAR category (conservative scope) → reply-policy update
  // Only create rules for clearly missing features, not ambiguous cases
  const replyPolicyRule = createReplyPolicyRuleIfClear(event);
  if (event.type === "weak_reply" && replyPolicyRule) {
    actions.push({
      type: "update_reply_policy",
      event,
      replyPolicyRule,
      reasoning: "Clear weak fallback pattern detected (low-risk, clearly missing feature); reply-policy rule generated"
    });
  }

  // Rule 3: tool_failure → escalate
  if (event.type === "tool_failure") {
    actions.push({
      type: "escalate",
      event,
      reasoning: "Tool failure requires human review to determine root cause"
    });
  }

  // Rule 4: memory_candidate + high confidence → update_memory
  if (event.type === "memory_candidate") {
    actions.push({
      type: "update_memory",
      event,
      targetMemoryCategory: "personal_fact",
      reasoning: "Reply contains substantive information worthy of memory storage"
    });
  }

  // Rule 5: feature_request → propose_only
  if (event.type === "feature_request") {
    actions.push({
      type: "create_feature_plan",
      event,
      reasoning: "Feature request detected; proposal-only, awaiting prioritization"
    });
  }

  // Rule 6: needs_review → escalate
  if (event.type === "needs_review") {
    actions.push({
      type: "escalate",
      event,
      reasoning: "Reply generation had warnings requiring operator review"
    });
  }

  // Default: defer unknown types
  if (actions.length === 0) {
    actions.push({
      type: "defer",
      event,
      reasoning: "Event type not recognized or conditions not met; defer for now"
    });
  }

  return actions;
}

/**
 * Process an improvement event: apply planner rules, generate actions, update status.
 */
export async function planImprovementEvent(
  event: ImprovementEvent
): Promise<PlannerOutput> {
  const actions = planActions(event);

  // Store patch proposals if any were generated
  for (const action of actions) {
    if (action.patchProposal) {
      await mutateDatabase((db) => {
        db.patchProposals.push(action.patchProposal!);
        return db;
      });
    }
  }

  // Update event status to "analyzed"
  const updatedEvent = await updateImprovementEventStatus(
    event.id,
    "analyzed",
    { reasoning: actions.map((a) => a.reasoning).join("; ") }
  );

  return {
    actions,
    updatedEvent: updatedEvent || event
  };
}

/**
 * Process all queued improvement events in priority order.
 */
export async function planAllQueuedEvents(): Promise<PlannerOutput[]> {
  const { getReadyToProcessEvents } = await import("./queue");
  const readyEvents = await getReadyToProcessEvents();

  const allOutputs: PlannerOutput[] = [];
  for (const event of readyEvents) {
    const output = await planImprovementEvent(event);
    allOutputs.push(output);
  }

  return allOutputs;
}

/**
 * Get count of events at each planning step for diagnostics.
 */
export async function getPlanningStats(): Promise<{
  detected: number;
  queued: number;
  analyzed: number;
  proposed: number;
  applied: number;
  patchProposals: {
    drafted: number;
    proposed: number;
    approved: number;
    applied: number;
  };
}> {
  const db = await loadDatabase();

  const stats = {
    detected: db.improvementEvents.filter((e) => e.status === "detected").length,
    queued: db.improvementEvents.filter((e) => e.status === "queued").length,
    analyzed: db.improvementEvents.filter((e) => e.status === "analyzed").length,
    proposed: db.improvementEvents.filter((e) => e.status === "proposed").length,
    applied: db.improvementEvents.filter((e) => e.status === "applied").length,
    patchProposals: {
      drafted: db.patchProposals.filter((p) => p.status === "drafted").length,
      proposed: db.patchProposals.filter((p) => p.status === "proposed").length,
      approved: db.patchProposals.filter((p) => p.status === "approved").length,
      applied: db.patchProposals.filter((p) => p.status === "applied").length
    }
  };

  return stats;
}

/**
 * Phase C: Export capability-gap proposals as structured CapabilityGapProposal objects.
 * Queries drafted patch proposals from capability_gap events and formats them for proposal path.
 */
export async function exportCapabilityGapProposals(): Promise<CapabilityGapProposal[]> {
  const db = await loadDatabase();
  
  // Query capability_gap events that have been analyzed
  const capabilityGapEvents = db.improvementEvents.filter(
    (e) => e.type === "capability_gap" && e.status === "analyzed"
  );

  const proposals: CapabilityGapProposal[] = [];

  for (const event of capabilityGapEvents) {
    // Find corresponding patch proposal
    const patchProposal = db.patchProposals.find((p) => p.fromImprovementEventId === event.id);
    if (!patchProposal) continue; // Skip if no patch proposal

    const capabilityFamily = event.payload.capabilityFamily || "general_capability";
    const suggestedArea = event.payload.suggestedToolArea || "plugins";

    const proposal: CapabilityGapProposal = {
      id: `cgp-${randomUUID().slice(0, 8)}`,
      fromImprovementEventId: event.id,
      fromPatchProposalId: patchProposal.id,
      capabilityFamily,
      suggestedToolArea: suggestedArea,
      userContext: event.userPromptExcerpt || "",
      reasoning: event.reasoning || "",
      priority: event.payload.repeatCount >= 2 ? "high" : "medium",
      estimatedEffort: patchProposal.estimatedEffort,
      testPlan: patchProposal.testPlan,
      status: "drafted",
      createdAt: new Date().toISOString(),
      approvalRequired: (event.payload.repeatCount || 0) >= 2
    };

    proposals.push(proposal);
  }

  return proposals;
}

/**
 * Phase C: Query capability-gap proposals by capability family.
 */
export async function queryCapabilityGapProposalsByFamily(
  family: string
): Promise<CapabilityGapProposal[]> {
  const db = await loadDatabase();
  
  const capabilityGapEvents = db.improvementEvents.filter(
    (e) => e.type === "capability_gap" && e.payload.capabilityFamily === family
  );

  const proposals: CapabilityGapProposal[] = [];

  for (const event of capabilityGapEvents) {
    const patchProposal = db.patchProposals.find((p) => p.fromImprovementEventId === event.id);
    if (!patchProposal) continue;

    const proposal: CapabilityGapProposal = {
      id: `cgp-${randomUUID().slice(0, 8)}`,
      fromImprovementEventId: event.id,
      fromPatchProposalId: patchProposal.id,
      capabilityFamily: family,
      suggestedToolArea: event.payload.suggestedToolArea || "plugins",
      userContext: event.userPromptExcerpt || "",
      reasoning: event.reasoning || "",
      priority: (event.payload.repeatCount || 0) >= 2 ? "high" : "medium",
      estimatedEffort: patchProposal.estimatedEffort,
      testPlan: patchProposal.testPlan,
      status: "drafted",
      createdAt: new Date().toISOString(),
      approvalRequired: (event.payload.repeatCount || 0) >= 2
    };

    proposals.push(proposal);
  }

  return proposals;
}
