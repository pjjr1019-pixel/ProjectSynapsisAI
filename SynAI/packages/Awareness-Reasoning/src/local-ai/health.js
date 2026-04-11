import { getOllamaConfig, isOllamaReachabilityErrorDetail, listOllamaModels } from "./ollama";
export const checkOllamaHealth = async (busy = false, overrides) => {
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
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        return {
            status: isOllamaReachabilityErrorDetail(detail) ? "disconnected" : "error",
            provider: "ollama",
            model: config.model,
            baseUrl: config.baseUrl,
            detail,
            checkedAt: new Date().toISOString()
        };
    }
};
