import type { ChatMessage } from "../../contracts/src/chat";
import { getOllamaConfig, ollamaChat, ollamaChatStream } from "./ollama";

export const sendOllamaChat = async (messages: ChatMessage[]): Promise<string> => {
  const config = getOllamaConfig();
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
  onChunk: (content: string) => void
): Promise<string> => {
  const config = getOllamaConfig();
  return ollamaChatStream(
    config,
    messages.map((message) => ({
      role: message.role,
      content: message.content
    })),
    onChunk
  );
};
