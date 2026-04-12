/**
 * Awareness-Reasoning Integration Adapters
 * 
 * Thin adapters connecting the improvement system to the broader SynAI pipeline.
 * All adapters are non-blocking and operate via event queues/subscriptions.
 */

export { subscribeToChatAnalysis, isAnalyzerSubscribed } from "./chat-analyzer-adapter";

export { applyQueuedMemories, setupMemoryAutoApplier } from "./memory-applier-adapter";

export { applyQueuedReplyPolicies, setupReplyPolicyAutoApplier } from "./reply-policy-applier-adapter";

export { initializeImprovementSystem, stopImprovementSystem } from "./init";

export {
  processPendingImprovements,
  getImprovementSystemStatus,
  clearQueuedImprovements
} from "./orchestrator";

export {
  PHASE_1B_CONFIG,
  MINIMAL_CONFIG,
  STANDARD_CONFIG,
  DEBUG_CONFIG,
  LEGACY_CONFIG
} from "./config";
