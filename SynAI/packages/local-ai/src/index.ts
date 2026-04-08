import type { ChatMessage } from "../../contracts/src/chat";
import type { LocalAIProvider } from "./provider";
import { sendOllamaChat, sendOllamaChatStream } from "./chat";
import { checkOllamaHealth } from "./health";
import { getEmbeddings } from "./embeddings";

export const createOllamaProvider = (): LocalAIProvider => ({
  checkHealth: async () => checkOllamaHealth(false),
  chat: async (messages: ChatMessage[]) => sendOllamaChat(messages),
  chatStream: async (messages: ChatMessage[], onChunk: (content: string) => void) =>
    sendOllamaChatStream(messages, onChunk),
  embeddings: async (text: string) => getEmbeddings(text)
});

export * from "./provider";
export * from "./chat";
export * from "./health";
export * from "./embeddings";
export * from "./ollama";
