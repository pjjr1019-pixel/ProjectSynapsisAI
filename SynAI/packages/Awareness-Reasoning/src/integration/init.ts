/**
 * Improvement System Initialization
 * 
 * Central entry point to activate all improvement system integrations.
 * This file orchestrates the complete improvement pipeline.
 * 
 * Usage:
 *   import { initializeImprovementSystem } from "@awareness/integration/init";
 *   const cleanup = initializeImprovementSystem(store);
 *   // Later: cleanup();
 */

import type { LocalChatState } from "../../../apps/desktop/src/features/local-chat/types/localChat.types";
import {
  subscribeToChatAnalysis,
  setupMemoryAutoApplier,
  setupReplyPolicyAutoApplier
} from "./index";

interface ImprovementSystemConfig {
  enableMemoryAutoApplier?: boolean;
  enableReplyPolicyAutoApplier?: boolean;
  memoryApplierIntervalMs?: number;
  replyPolicyApplierIntervalMs?: number;
}

interface ImprovementSystemCleanup {
  unsubscribeAnalyzer: () => void;
  stopMemoryApplier?: () => void;
  stopReplyPolicyApplier?: () => void;
}

/**
 * Initialize the complete improvement system with all integrations.
 */
export function initializeImprovementSystem(
  chatStore: any, // localChatStore type
  config: ImprovementSystemConfig = {}
): ImprovementSystemCleanup {
  const {
    enableMemoryAutoApplier = false,
    enableReplyPolicyAutoApplier = false,
    memoryApplierIntervalMs = 30000,
    replyPolicyApplierIntervalMs = 45000
  } = config;

  console.info("[Improvement System] Initializing...");

  const cleanup: ImprovementSystemCleanup = {
    unsubscribeAnalyzer: subscribeToChatAnalysis(chatStore)
  };

  if (enableMemoryAutoApplier) {
    console.info("[Improvement System] Memory auto-applier enabled");
    cleanup.stopMemoryApplier = setupMemoryAutoApplier(memoryApplierIntervalMs);
  }

  if (enableReplyPolicyAutoApplier) {
    console.info("[Improvement System] Reply-policy auto-applier enabled");
    cleanup.stopReplyPolicyApplier = setupReplyPolicyAutoApplier(replyPolicyApplierIntervalMs);
  }

  console.info("[Improvement System] Ready (analyzer active, auto-apply", {
    memory: enableMemoryAutoApplier,
    policy: enableReplyPolicyAutoApplier
  });

  return cleanup;
}

/**
 * Stop all improvement system services.
 */
export function stopImprovementSystem(cleanup: ImprovementSystemCleanup): void {
  cleanup.unsubscribeAnalyzer();
  cleanup.stopMemoryApplier?.();
  cleanup.stopReplyPolicyApplier?.();
  console.info("[Improvement System] Stopped");
}
