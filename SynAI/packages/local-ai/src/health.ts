import type { ModelHealth } from "../../contracts/src/health";
import { getOllamaConfig, pingOllama } from "./ollama";

export const checkOllamaHealth = async (busy = false): Promise<ModelHealth> => {
  const config = getOllamaConfig();
  try {
    await pingOllama(config);
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
