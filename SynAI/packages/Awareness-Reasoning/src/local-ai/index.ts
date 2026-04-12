import type { ChatMessage } from "../contracts/chat";
import type { LocalAIProvider } from "./provider";
import { sendOllamaChat, sendOllamaChatStream } from "./chat";
import { checkOllamaHealth } from "./health";
import { getEmbeddings } from "./embeddings";
import { getLastRuntimeSelection, getLocalAISchedulerStatus } from "./scheduler";

export const createOllamaProvider = (): LocalAIProvider => ({
  checkHealth: async (overrides) => checkOllamaHealth(false, overrides),
  chat: async (messages: ChatMessage[], overrides) => sendOllamaChat(messages, overrides),
  chatStream: async (messages: ChatMessage[], onChunk: (content: string) => void, overrides) =>
    sendOllamaChatStream(messages, onChunk, overrides),
  embeddings: async (text: string, overrides) => getEmbeddings(text, overrides),
  getRuntimeSelection: () => getLastRuntimeSelection(),
  getSchedulerStatus: () => getLocalAISchedulerStatus()
});

export * from "./provider";
export * from "./chat";
export * from "./health";
export * from "./embeddings";
export * from "./ollama";
export * from "./scheduler";

