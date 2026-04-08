import { ensureLocalEnvLoaded } from "./env";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  embedModel?: string;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const getOllamaConfig = (): OllamaConfig => {
  ensureLocalEnvLoaded();

  return {
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
    embedModel: process.env.OLLAMA_EMBED_MODEL
  };
};

export const ollamaFetch = async <T>(
  config: OllamaConfig,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${config.baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
};

interface OllamaChatResponse {
  message: {
    content: string;
  };
}

interface OllamaChatStreamResponse {
  done?: boolean;
  message?: {
    content?: string;
  };
}

export const ollamaChat = async (
  config: OllamaConfig,
  messages: OllamaChatMessage[]
): Promise<string> => {
  const payload = {
    model: config.model,
    stream: false,
    messages
  };
  const data = await ollamaFetch<OllamaChatResponse>(config, "/api/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return data.message?.content ?? "";
};

const parseOllamaStreamLine = (
  line: string,
  content: string,
  onChunk: (nextContent: string) => void
): { content: string; done: boolean } => {
  const parsed = JSON.parse(line) as OllamaChatStreamResponse;
  const delta = parsed.message?.content ?? "";
  const nextContent = delta ? `${content}${delta}` : content;

  if (delta) {
    onChunk(nextContent);
  }

  return {
    content: nextContent,
    done: Boolean(parsed.done)
  };
};

export const ollamaChatStream = async (
  config: OllamaConfig,
  messages: OllamaChatMessage[],
  onChunk: (content: string) => void
): Promise<string> => {
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const parsed = parseOllamaStreamLine(line, content, onChunk);
      content = parsed.content;
      if (parsed.done) {
        return content;
      }
    }

    if (done) {
      break;
    }
  }

  const trailingLine = buffer.trim();
  if (trailingLine) {
    const parsed = parseOllamaStreamLine(trailingLine, content, onChunk);
    content = parsed.content;
  }

  return content;
};

interface OllamaEmbeddingsResponse {
  embedding: number[];
}

export const ollamaEmbeddings = async (
  config: OllamaConfig,
  text: string
): Promise<number[]> => {
  if (!config.embedModel) {
    return [];
  }
  const data = await ollamaFetch<OllamaEmbeddingsResponse>(config, "/api/embeddings", {
    method: "POST",
    body: JSON.stringify({
      model: config.embedModel,
      prompt: text
    })
  });
  return data.embedding ?? [];
};

export const pingOllama = async (config: OllamaConfig): Promise<void> => {
  await ollamaFetch<{ models: Array<{ name: string }> }>(config, "/api/tags");
};
