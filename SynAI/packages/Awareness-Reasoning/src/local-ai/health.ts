import type { ModelHealth } from "../contracts/health";
import type { OllamaConfig } from "./ollama";
import { getOllamaConfig, isOllamaReachabilityErrorDetail, listOllamaModels, listRunningOllamaModels } from "./ollama";
import { getLocalAISchedulerStatus } from "./scheduler";

export const checkOllamaHealth = async (
  busy = false,
  overrides?: Partial<OllamaConfig>
): Promise<ModelHealth> => {
  const config = getOllamaConfig(overrides);
  const scheduler = getLocalAISchedulerStatus();
  try {
    const models = await listOllamaModels(config);
    const runningModels = await listRunningOllamaModels(config).catch(() => scheduler.loadedModels);
    if (!models.includes(config.model)) {
      return {
        status: "error",
        provider: "ollama",
        model: config.model,
        baseUrl: config.baseUrl,
        detail: `Model "${config.model}" is not installed in Ollama.`,
        checkedAt: new Date().toISOString(),
        scheduler: {
          ...scheduler,
          loadedModels: runningModels
        }
      };
    }
    return {
      status: busy ? "busy" : "connected",
      provider: "ollama",
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString(),
      scheduler: {
        ...scheduler,
        loadedModels: runningModels
      }
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return {
      status: isOllamaReachabilityErrorDetail(detail) ? "disconnected" : "error",
      provider: "ollama",
      model: config.model,
      baseUrl: config.baseUrl,
      detail,
      checkedAt: new Date().toISOString(),
      scheduler
    };
  }
};

