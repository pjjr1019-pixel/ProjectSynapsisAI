// Phase 6: Accept UnsupportedClarifyEvent
import type { UnsupportedClarifyEvent, CapabilityGapProposal } from "../../../Governance-Execution/src/governed-chat/types";

const unsupportedClarifyEventDedup = new Set<string>();
const unsupportedClarifyEventRateLimit: Record<string, number> = {};

// Phase 6: Classify capability family from unsupported event
function classifyCapabilityFamily(event: UnsupportedClarifyEvent): string {
  const text = event.userText.toLowerCase();
  const intent = event.detectedIntent.label.toLowerCase();

  // Check against known capability families
  if (text.includes("calendar") || text.includes("schedule") || intent.includes("schedule")) return "calendar";
  if (text.includes("task") || text.includes("todo") || intent.includes("task")) return "task_management";
  if (text.includes("time tracking") || text.includes("productivity") || text.includes("pomodoro")) return "time_tracking";
  if (text.includes("email") || text.includes("mail")) return "email";
  if (text.includes("notification") || text.includes("alert")) return "notifications";
  if (text.includes("code") || text.includes("file") || intent.includes("code")) return "code_execution";
  if (text.includes("cloud") || text.includes("sync") || text.includes("collaboration")) return "cloud_storage";
  if (text.includes("database") || text.includes("sql")) return "database";
  if (text.includes("api") || text.includes("integration")) return "integrations";

  return "general_capability";
}

// Phase 6: Suggest tool area based on capability family
function suggestToolArea(capabilityFamily: string): string {
  const suggestions: Record<string, string> = {
    calendar: "plugins/calendar",
    task_management: "plugins/task-management",
    time_tracking: "plugins/time-tracking",
    code_execution: "packages/Governance-Execution",
    notifications: "plugins/notifications",
    email: "plugins/email",
    cloud_storage: "plugins/cloud-storage",
    database: "packages/Awareness-Reasoning",
    integrations: "plugins/integrations",
    general_capability: "plugins"
  };
  return suggestions[capabilityFamily] || "plugins";
}

/**
 * Accept a Phase 6 UnsupportedClarifyEvent for improvement analysis.
 * Dedupes by fingerprint, rate-limits by bucket, only queues if improvementCandidate is true.
 */
export async function analyzeUnsupportedClarifyEvent(event: UnsupportedClarifyEvent): Promise<void> {
  if (!event.improvementCandidate) return;
  // Deduplication
  if (unsupportedClarifyEventDedup.has(event.fingerprint)) return;
  unsupportedClarifyEventDedup.add(event.fingerprint);
  // Rate limiting (simple: max 3 per bucket)
  unsupportedClarifyEventRateLimit[event.rateLimitBucket] = (unsupportedClarifyEventRateLimit[event.rateLimitBucket] || 0) + 1;
  if (unsupportedClarifyEventRateLimit[event.rateLimitBucket] > 3) return;

  // Phase 6: Classify capability family and suggest tool area
  const capabilityFamily = classifyCapabilityFamily(event);
  const suggestedArea = suggestToolArea(capabilityFamily);

  // Insert as improvement event
  await insertImprovementEvent(
    event.eventType === "unsupported" ? "capability_gap" : "clarification_needed",
    event.eventType === "unsupported" ? "create_patch_proposal" : "clarify_contract",
    "medium",
    event.userText,
    event.detectedIntent.label,
    {
      reasoning: event.eventType === "unsupported"
        ? `Capability gap: ${event.unsupportedReason}`
        : `Clarification needed: ${event.clarificationNeeded?.join(", ")}`,
      payload: event,
      capabilityFamily,
      suggestedToolArea: suggestedArea
    }
  );
}
/**
 * Improvement Analyzer
 * 
 * Detects improvement opportunities from user prompts and assistant replies.
 * Uses rules-based heuristics first; optional LLM analysis for ambiguous cases.
 * 
 * Returns structured `ImprovementEvent[]` suitable for queuing.
 */

import type { AnalyzerInput, AnalyzerOutput, ImprovementEvent } from "@contracts/improvement";
import { insertImprovementEvent } from "./queue";

/**
 * Patterns that indicate weak fallback replies.
 */
const weakReplyPatterns = [
  /i\s+(?:don't have|can't|cannot|don't support|can't provide)/i,
  /(?:would you like me to|do you want me to)\s+(?:build|create|make|implement)/i,
  /(?:i don't have|that\s+(?:feature|capability|tool)|isn't available|not available)/i,
  /(?:not (?:yet )?(?:implemented|supported|available))/i,
  /(?:something i|\s+a feature that i)\s+(?:don't have|can't do|can't implement)/i
];

/**
 * Patterns that indicate a capability gap (missing feature).
 */
const capabilityGapPatterns = [
  /(?:you|i)\s+(?:don't have|can't handle|can't provide)\s+(?:a |the |)(.+?)(?:\.|,|\?|$)/i,
  /(?:i )?can't\s+(?:help|assist|support)\s+(?:with|on|for)\s+(.+?)(?:\.|,|\?|$)/i,
  /(?:no\s+)?(?:calendar|scheduler|task manager|reminder|notification|timer|clock)/i,
  /(?:time\s+tracking|time\s+management|productivity|focus|pomodoro)/i
];

/**
 * Patterns that indicate a tool or action failed.
 */
const toolFailurePatterns = [
  /(?:error:|failed|failure|timeout|timed out|unable to)/i,
  /(?:permission|access|denied|forbidden|unauthorized)/i,
  /(?:command failed|execution failed|operation failed)/i
];

/**
 * Test if a string matches any patterns in the list.
 */
function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Extract a capability name from a pattern match or text.
 */
function extractCapabilityName(text: string): string | null {
  // Try to match "(feature/capability)" pattern
  const match = text.match(/(?:can't|don't have|not available for)\s+([a-z\s]+?)(?:\.|,|\?|$)/i);
  if (match) return match[1].trim();

  // Look for common capability keywords
  const capabilities = [
    "calendar", "scheduler", "task", "reminder", "timer", "clock", "alarm",
    "time tracking", "time management", "productivity", "focus", "pomodoro",
    "file sync", "cloud storage", "collaboration", "sharing", "email",
    "notifications", "alerts", "scheduling"
  ];

  for (const cap of capabilities) {
    if (text.toLowerCase().includes(cap)) return cap;
  }

  return null;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-ish approach for now).
 * Returns 0-1 where 1 is identical, 0 is completely different.
 */
function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().replace(/\s+/g, " ").trim();
  const bLower = b.toLowerCase().replace(/\s+/g, " ").trim();

  if (aLower === bLower) return 1;

  const aWords = aLower.split(" ");
  const bWords = bLower.split(" ");
  const commonWords = aWords.filter((w) => bWords.includes(w));

  return commonWords.length / Math.max(aWords.length, bWords.length);
}

/**
 * Main analyzer function: detect improvement events from a user prompt and assistant reply.
 */
export async function analyzePromptReply(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const events: ImprovementEvent[] = [];
  const { userPrompt, assistantReply, replyMetadata, recentMessages, priorRequestCount } = input;

  // 1. Detect weak fallback replies
  if (matchesAnyPattern(assistantReply, weakReplyPatterns)) {
    await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      userPrompt,
      assistantReply,
      {
        reasoning: "Assistant reply matches weak fallback pattern"
      }
    ).then((e) => events.push(e));
  }

  // 2. Detect capability gaps
  if (matchesAnyPattern(assistantReply, capabilityGapPatterns)) {
    const capabilityName = extractCapabilityName(assistantReply) || extractCapabilityName(userPrompt);
    const risk = matchesAnyPattern(userPrompt, capabilityGapPatterns) ? "medium" : "low";

    await insertImprovementEvent(
      "capability_gap",
      capabilityName ? "create_patch_proposal" : "escalate",
      risk,
      userPrompt,
      assistantReply,
      {
        reasoning: capabilityName
          ? `Capability gap detected: ${capabilityName}`
          : "Capability gap detected but name unclear"
      }
    ).then((e) => events.push(e));
  }

  // 3. Detect tool failures
  if (matchesAnyPattern(assistantReply, toolFailurePatterns)) {
    await insertImprovementEvent(
      "tool_failure",
      "escalate",
      "high",
      userPrompt,
      assistantReply,
      {
        reasoning: "Assistant reply indicates a tool or action failed",
        payload: { ...replyMetadata }
      }
    ).then((e) => events.push(e));
  }

  // 4. Detect repeated requests
  if (priorRequestCount && priorRequestCount >= 2) {
    // Check similarity with recent messages
    let isSimilarToRecent = false;
    if (recentMessages && recentMessages.length > 0) {
      const recentUserMessages = recentMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content);

      isSimilarToRecent = recentUserMessages.some((msg) => calculateSimilarity(userPrompt, msg) > 0.7);
    }

    if (isSimilarToRecent || priorRequestCount >= 3) {
      await insertImprovementEvent(
        "capability_gap",
        "create_patch_proposal",
        "high",
        userPrompt,
        assistantReply,
        {
          reasoning: `Repeated request detected (${priorRequestCount} times); escalating to patch proposal consideration`
        }
      ).then((e) => events.push(e));
    }
  }

  // 5. Extract memory candidates from reply
  // Simple heuristic: if the assistant provided new information, it might be worth remembering
  if (assistantReply.length > 50 && !matchesAnyPattern(assistantReply, weakReplyPatterns)) {
    // Lightweight fact extraction: look for key statements
    const sentences = assistantReply.match(/[^.!?]+[.!?]+/g) || [];
    const hasDefinitiveInfo = sentences.some(
      (s) =>
        /(?:is|are|was|were|has|have|can|could|will|would)\s/.test(s) &&
        s.length > 20
    );

    if (hasDefinitiveInfo) {
      await insertImprovementEvent(
        "memory_candidate",
        "update_memory",
        "low",
        userPrompt,
        assistantReply,
        {
          reasoning: "Assistant provided substantive information that may warrant memory storage"
        }
      ).then((e) => events.push(e));
    }
  }

  // 6. Flag responses needing review if uncertain or complex
  if (replyMetadata?.warnings && replyMetadata.warnings.length > 0) {
    await insertImprovementEvent(
      "needs_review",
      "escalate",
      "medium",
      userPrompt,
      assistantReply,
      {
        reasoning: `Reply generation had warnings: ${replyMetadata.warnings.join("; ")}`,
        payload: { warnings: replyMetadata.warnings }
      }
    ).then((e) => events.push(e));
  }

  return { events };
}

/**
 * Analyze a batch of prompt/reply pairs (for integration with conversation analysis).
 */
export async function analyzeBatch(inputs: AnalyzerInput[]): Promise<AnalyzerOutput> {
  const allEvents: ImprovementEvent[] = [];

  for (const input of inputs) {
    const result = await analyzePromptReply(input);
    allEvents.push(...result.events);
  }

  return { events: allEvents };
}
