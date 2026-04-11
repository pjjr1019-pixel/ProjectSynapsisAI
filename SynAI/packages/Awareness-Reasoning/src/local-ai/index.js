import { sendOllamaChat, sendOllamaChatStream } from "./chat";
import { checkOllamaHealth } from "./health";
import { getEmbeddings } from "./embeddings";
export const createOllamaProvider = () => ({
    checkHealth: async (overrides) => checkOllamaHealth(false, overrides),
    chat: async (messages, overrides) => sendOllamaChat(messages, overrides),
    chatStream: async (messages, onChunk, overrides) => sendOllamaChatStream(messages, onChunk, overrides),
    embeddings: async (text) => getEmbeddings(text)
});
export * from "./provider";
export * from "./chat";
export * from "./health";
export * from "./embeddings";
export * from "./ollama";
