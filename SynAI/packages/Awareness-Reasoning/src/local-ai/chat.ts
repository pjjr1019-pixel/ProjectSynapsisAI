import type { ChatMessage } from "../contracts/chat";
import type { LocalAIRequestOptions } from "./provider";
import type { OllamaConfig } from "./ollama";
import { getOllamaConfig, ollamaChat, ollamaChatStream } from "./ollama";
import { resolveScheduledLocalAISelection, withScheduledLocalAITask } from "./scheduler";

export const sendOllamaChat = async (
  messages: ChatMessage[],
  overrides?: LocalAIRequestOptions
): Promise<string> => {
  const selection = resolveScheduledLocalAISelection(getOllamaConfig(overrides as Partial<OllamaConfig>), overrides);
  const result = await withScheduledLocalAITask(selection, async ({ config, summary }) =>
    ollamaChat(
      config,
      messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      {
        keepAliveMs: summary.keepAliveMs
      }
    )
  );
  return result.result;
};

export const sendOllamaChatStream = async (
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  overrides?: LocalAIRequestOptions
): Promise<string> => {
  const selection = resolveScheduledLocalAISelection(getOllamaConfig(overrides as Partial<OllamaConfig>), overrides);
  const result = await withScheduledLocalAITask(selection, async ({ config, summary }) =>
    ollamaChatStream(
      config,
      messages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      onChunk,
      {
        keepAliveMs: summary.keepAliveMs
      }
    )
  );
  return result.result;
};

