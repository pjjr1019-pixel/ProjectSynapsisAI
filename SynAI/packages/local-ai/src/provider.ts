import type { ChatMessage } from "../../contracts/src/chat";
import type { ModelHealth } from "../../contracts/src/health";

export interface LocalAIProvider {
  checkHealth(): Promise<ModelHealth>;
  chat(messages: ChatMessage[]): Promise<string>;
  chatStream(messages: ChatMessage[], onChunk: (content: string) => void): Promise<string>;
  embeddings?(text: string): Promise<number[]>;
}
