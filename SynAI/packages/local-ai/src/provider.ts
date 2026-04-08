import type { ChatMessage } from "../../contracts/src/chat";
import type { ModelHealth } from "../../contracts/src/health";
import type { OllamaConfig } from "./ollama";

export interface LocalAIProvider {
  checkHealth(overrides?: Partial<OllamaConfig>): Promise<ModelHealth>;
  chat(messages: ChatMessage[], overrides?: Partial<OllamaConfig>): Promise<string>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    overrides?: Partial<OllamaConfig>
  ): Promise<string>;
  embeddings?(text: string): Promise<number[]>;
}
