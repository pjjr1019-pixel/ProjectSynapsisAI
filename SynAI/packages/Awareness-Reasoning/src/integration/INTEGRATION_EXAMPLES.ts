/**
 * Phase 1b Integration Examples
 * 
 * Complete working examples for integrating the improvement system into SynAI.
 * Copy-paste these into your app initialization code.
 */

// ============================================================================
// Example 1: Minimal Setup (Just Analyzer)
// ============================================================================
// Use this if you only want analysis and inspection, no auto-apply.

import { subscribeToChatAnalysis, ImprovementEventsPanel } from "@awareness/integration";

export function setupMinimalImprovementSystem(localChatStore: any) {
  console.info("[Setup] Starting minimal improvement system (analyzer only)");

  // Subscribe to chat analysis
  const unsubscribe = subscribeToChatAnalysis(localChatStore);

  return () => {
    unsubscribe();
    console.info("[Setup] Improvement system stopped");
  };
}

// In your component:
// <ImprovementEventsPanel maxEvents={5} />

// ============================================================================
// Example 2: Standard Setup (Analyzer + Auto-Apply)
// ============================================================================
// Recommended for production: Auto-saves memory, routes patches to governance.

import { initializeImprovementSystem, STANDARD_CONFIG } from "@awareness/integration";

export function setupStandardImprovementSystem(localChatStore: any) {
  console.info("[Setup] Starting standard improvement system");

  const cleanup = initializeImprovementSystem(localChatStore, {
    enableMemoryAutoApplier: true,
    enableReplyPolicyAutoApplier: false, // Usually false for safety
    memoryApplierIntervalMs: 30000,
    replyPolicyApplierIntervalMs: 45000
  });

  return cleanup;
}

// ============================================================================
// Example 3: Full Setup with Orchestration
// ============================================================================
// Advanced: Uses central orchestrator for coordinated processing.

import { 
  initializeImprovementSystem,
  processPendingImprovements,
  getImprovementSystemStatus,
  DEBUG_CONFIG
} from "@awareness/integration";

export function setupFullImprovementSystem(localChatStore: any) {
  console.info("[Setup] Starting full improvement system with orchestration");

  const cleanup = initializeImprovementSystem(localChatStore, {
    enableMemoryAutoApplier: true,
    enableReplyPolicyAutoApplier: false,
    memoryApplierIntervalMs: 30000,
    replyPolicyApplierIntervalMs: 45000
  });

  // Optional: Run orchestrator every 60 seconds to process improvements
  const orchestratorTimer = setInterval(async () => {
    await processPendingImprovements({
      autoApplyMemory: true,
      autoApplyReplyPolicies: false,
      verbose: false
    });

    // Log status
    const status = await getImprovementSystemStatus();
    console.info("[Orchestrator] Current status:", status);
  }, 60000);

  return () => {
    cleanup();
    clearInterval(orchestratorTimer);
    console.info("[Setup] Full improvement system stopped");
  };
}

// ============================================================================
// Example 4: Debug Setup (Everything On)
// ============================================================================
// For development/testing: all features enabled with verbose logging.

import { DEBUG_CONFIG } from "@awareness/integration";

export async function setupDebugImprovementSystem(localChatStore: any) {
  console.info("[Setup] Starting debug improvement system (ALL FEATURES ON)");

  const cleanup = initializeImprovementSystem(localChatStore, {
    enableMemoryAutoApplier: true,
    enableReplyPolicyAutoApplier: true,
    memoryApplierIntervalMs: 10000,
    replyPolicyApplierIntervalMs: 15000
  });

  // Log system status every 20 seconds
  const statusTimer = setInterval(async () => {
    const status = await getImprovementSystemStatus();
    console.info("[Debug] System Status:", {
      total: status.totalEvents,
      detected: status.detectedCount,
      queued: status.queuedCount,
      applied: status.appliedCount,
      byType: status.byType,
      byRisk: status.byRisk
    });
  }, 20000);

  return () => {
    cleanup();
    clearInterval(statusTimer);
    console.info("[Setup] Debug improvement system stopped");
  };
}

// ============================================================================
// Example 5: Legacy/Safe Setup (Analysis Only)
// ============================================================================
// For conservative deployments: no modifications to external systems.

import { subscribeToChatAnalysis, ImprovementEventsPanel } from "@awareness/integration";

export function setupLegacyImprovementSystem(localChatStore: any) {
  console.info("[Setup] Starting legacy improvement system (read-only)");

  const unsubscribe = subscribeToChatAnalysis(localChatStore);

  return () => {
    unsubscribe();
    console.info("[Setup] Legacy improvement system stopped");
  };
}

// ============================================================================
// Example 6: Custom Conditional Setup
// ============================================================================
// Choose setup based on environment/feature flags.

interface EnvironmentConfig {
  environment: "development" | "staging" | "production";
  enableAutoApply: boolean;
  enableMemory: boolean;
  enablePolicies: boolean;
  verbose: boolean;
}

export function setupConditionalImprovementSystem(
  localChatStore: any,
  envConfig: EnvironmentConfig
) {
  console.info("[Setup] Starting conditional improvement system", envConfig);

  const cleanup = initializeImprovementSystem(localChatStore, {
    enableMemoryAutoApplier: envConfig.enableAutoApply && envConfig.enableMemory,
    enableReplyPolicyAutoApplier: envConfig.enableAutoApply && envConfig.enablePolicies,
    memoryApplierIntervalMs: envConfig.environment === "production" ? 30000 : 10000,
    replyPolicyApplierIntervalMs: envConfig.environment === "production" ? 45000 : 15000
  });

  if (envConfig.verbose) {
    const statusTimer = setInterval(async () => {
      const status = await getImprovementSystemStatus();
      console.info("[Conditional] System status:", status);
    }, 30000);

    return () => {
      cleanup();
      clearInterval(statusTimer);
    };
  }

  return cleanup;
}

// ============================================================================
// Usage in Your App Initialization
// ============================================================================

// In your main app component or initialization file:

export function initializeApp(localChatStore: any) {
  // Choose which setup to use
  let cleanupImprovementSystem: () => void;

  if (process.env.NODE_ENV === "development") {
    cleanupImprovementSystem = setupDebugImprovementSystem(localChatStore);
  } else if (process.env.IMPROVEMENT_SYSTEM === "minimal") {
    cleanupImprovementSystem = setupMinimalImprovementSystem(localChatStore);
  } else {
    cleanupImprovementSystem = setupStandardImprovementSystem(localChatStore);
  }

  // On app shutdown:
  window.addEventListener("beforeunload", () => {
    cleanupImprovementSystem();
  });
}

// ============================================================================
// Manual Event Management
// ============================================================================

import { queryImprovementEvents, getImprovementSystemStatus } from "@awareness/integration";

export async function inspectImprovementEvents() {
  // Get all detected events
  const events = await queryImprovementEvents({ status: "detected" });
  console.info("Detected improvements:", events);

  // Get system status
  const status = await getImprovementSystemStatus();
  console.info("System status:", status);
}

// ============================================================================
// React Component Integration
// ============================================================================

import React from "react";
import { ImprovementEventsPanel } from "@desktop/features/local-chat/components/improvement";

export const ChatWithImprovementPanel: React.FC = () => {
  return (
    <div className="chat-container">
      <div className="chat-messages">
        {/* Your chat UI here */}
      </div>
      
      {/* Add inspection panel at bottom (collapsible) */}
      <ImprovementEventsPanel className="mt-4" maxEvents={5} />
    </div>
  );
};
