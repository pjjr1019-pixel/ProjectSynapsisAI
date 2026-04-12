/**
 * Phase 1b Configuration Defaults
 * 
 * Centralized configuration for the improvement system integrations.
 * Easily adjustable for different deployment scenarios.
 */

export const PHASE_1B_CONFIG = {
  // Chat Analyzer
  analyzer: {
    enabled: true,
    description: "Non-blocking analyzer that runs on every new assistant message"
  },

  // Memory Auto-Applier
  memoryAutoApplier: {
    enabled: false,
    intervalMs: 30000,
    allowedCategories: ["preference", "personal_fact", "project", "goal"],
    description: "Automatically saves detected memory facts to allowed categories"
  },

  // Reply-Policy Auto-Applier
  replyPolicyAutoApplier: {
    enabled: false,
    intervalMs: 45000,
    description: "Automatically generates improved fallback replies (overlay-safe)"
  },

  // Governance Integration
  governance: {
    enabled: true,
    routeHighRiskPatches: true,
    requireApprovalForMedium: false,
    description: "Routes patch proposals to approval system based on risk"
  },

  // Orchestrator
  orchestrator: {
    enabled: true,
    verbose: false,
    autoApplyMemory: false,
    autoApplyReplyPolicies: false,
    description: "Central orchestration for improvement processing"
  },

  // Inspection Panel
  inspectionPanel: {
    enabled: true,
    maxEvents: 5,
    autoRefreshMs: 10000,
    description: "Optional React component for debugging improvement events"
  }
};

/**
 * Recommended minimal production config.
 * Just analyzer, no auto-apply.
 */
export const MINIMAL_CONFIG = {
  analyzer: { enabled: true },
  memoryAutoApplier: { enabled: false },
  replyPolicyAutoApplier: { enabled: false },
  governance: { enabled: true },
  orchestrator: { enabled: false },
  inspectionPanel: { enabled: false }
};

/**
 * Recommended standard production config.
 * Analyzer + auto-apply memory + governance.
 */
export const STANDARD_CONFIG = {
  analyzer: { enabled: true },
  memoryAutoApplier: { enabled: true, intervalMs: 30000 },
  replyPolicyAutoApplier: { enabled: false },
  governance: { enabled: true },
  orchestrator: { enabled: true, autoApplyMemory: true },
  inspectionPanel: { enabled: true }
};

/**
 * Debug/development config.
 * Everything enabled with verbose logging.
 */
export const DEBUG_CONFIG = {
  analyzer: { enabled: true },
  memoryAutoApplier: { enabled: true, intervalMs: 10000 },
  replyPolicyAutoApplier: { enabled: true, intervalMs: 15000 },
  governance: { enabled: true },
  orchestrator: { enabled: true, verbose: true, autoApplyMemory: true, autoApplyReplyPolicies: true },
  inspectionPanel: { enabled: true, maxEvents: 20 }
};

/**
 * Legacy/safe config.
 * Analyzer only, no modifications to external systems.
 */
export const LEGACY_CONFIG = {
  analyzer: { enabled: true },
  memoryAutoApplier: { enabled: false },
  replyPolicyAutoApplier: { enabled: false },
  governance: { enabled: false },
  orchestrator: { enabled: false },
  inspectionPanel: { enabled: true }
};
