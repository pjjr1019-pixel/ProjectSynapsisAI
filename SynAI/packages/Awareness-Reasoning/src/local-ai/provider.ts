import type { ChatMessage } from "../contracts/chat";
import type { ModelHealth, ModelSchedulerStatus, RuntimeSelectionSummary } from "../contracts/health";
import type { RuntimeTaskClass } from "../contracts/rag";
import type { OllamaConfig } from "./ollama";

export interface LocalAIRequestOptions extends Partial<OllamaConfig> {
  taskClass?: RuntimeTaskClass;
  reason?: string;
  codingMode?: boolean;
  highQualityMode?: boolean;
  visionUsed?: boolean;
}

export interface LocalAIProvider {
  checkHealth(overrides?: Partial<OllamaConfig>): Promise<ModelHealth>;
  chat(messages: ChatMessage[], overrides?: LocalAIRequestOptions): Promise<string>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    overrides?: LocalAIRequestOptions
  ): Promise<string>;
  embeddings?(text: string, overrides?: LocalAIRequestOptions): Promise<number[]>;
  getRuntimeSelection?(): RuntimeSelectionSummary | null;
  getSchedulerStatus?(): ModelSchedulerStatus | null;
}


