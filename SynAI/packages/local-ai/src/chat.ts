import type { ChatMessage } from "../../contracts/src/chat";
import type { OllamaConfig } from "./ollama";
import { getOllamaConfig, ollamaChat, ollamaChatStream } from "./ollama";

export const sendOllamaChat = async (
  messages: ChatMessage[],
  overrides?: Partial<OllamaConfig>
): Promise<string> => {
  const config = getOllamaConfig(overrides);
  return ollamaChat(
    config,
    messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  );
};

export const sendOllamaChatStream = async (
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  overrides?: Partial<OllamaConfig>
): Promise<string> => {
  const config = getOllamaConfig(overrides);
  return ollamaChatStream(
    config,
    messages.map((message) => ({
      role: message.role,
      content: message.content
    })),
    onChunk
  );
};
