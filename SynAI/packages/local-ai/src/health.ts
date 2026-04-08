import type { ModelHealth } from "../../contracts/src/health";
import type { OllamaConfig } from "./ollama";
import { getOllamaConfig, listOllamaModels } from "./ollama";

export const checkOllamaHealth = async (
  busy = false,
  overrides?: Partial<OllamaConfig>
): Promise<ModelHealth> => {
  const config = getOllamaConfig(overrides);
  try {
    const models = await listOllamaModels(config);
    if (!models.includes(config.model)) {
      return {
        status: "error",
        provider: "ollama",
        model: config.model,
        baseUrl: config.baseUrl,
        detail: `Model "${config.model}" is not installed in Ollama.`,
        checkedAt: new Date().toISOString()
      };
    }
    return {
      status: busy ? "busy" : "connected",
      provider: "ollama",
      model: config.model,
      baseUrl: config.baseUrl,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return {
      status: detail.includes("fetch") ? "disconnected" : "error",
      provider: "ollama",
      model: config.model,
      baseUrl: config.baseUrl,
      detail,
      checkedAt: new Date().toISOString()
    };
  }
};
