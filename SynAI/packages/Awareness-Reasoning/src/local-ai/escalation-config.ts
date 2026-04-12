// Phase 6: Escalation Model Configuration
// Determines which model to use for reasoning escalation tasks

export interface EscalationModelConfig {
  // Feature flag enabling escalation policy
  enabled: boolean;
  
  // Active escalation model (toggleable)
  activeEscalationModel: string;
  
  // Available options for escalation
  availableModels: string[];
}

// Feature flags
export const PHASE_6_ESCALATION_POLICY = process.env.PHASE_6_ESCALATION_POLICY === "1";

// Build escalation config from environment
export const getEscalationModelConfig = (): EscalationModelConfig => {
  const escalationModelEnv = process.env.OLLAMA_ESCALATION_MODEL?.trim();
  
  // Default options (deepseek-r1:8b is the primary recommendations for reasoning)
  const availableModels = [
    "deepseek-r1:8b",
    "qwen3:8b",
    "mixtral:latest",
    "neural-chat:latest"
  ];
  
  // Active model: use env var if set, otherwise default
  const activeEscalationModel = escalationModelEnv || "deepseek-r1:8b";
  
  return {
    enabled: PHASE_6_ESCALATION_POLICY,
    activeEscalationModel,
    availableModels
  };
};

// Get the configured escalation model for a specific task
export const getEscalationModel = (): string => {
  const config = getEscalationModelConfig();
  return config.activeEscalationModel;
};

// Check if escalation should use a specific model
export const shouldUseEscalationModel = (): boolean => {
  return PHASE_6_ESCALATION_POLICY;
};

// Keep-alive policy for escalation models: 0ms (unload immediately after task)
export const ESCALATION_MODEL_KEEP_ALIVE_MS = 0;
