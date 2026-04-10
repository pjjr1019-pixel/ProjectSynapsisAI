import type {
  ChatExecutionOptions,
  ChatExecutionService,
  CreateChatExecutionServiceInput
} from "../contracts";

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number | undefined,
  label: string
): Promise<T> => {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    timer.unref?.();
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const createChatExecutionService = (
  input: CreateChatExecutionServiceInput
): ChatExecutionService => {
  const runChat = async (
    messages: Parameters<ChatExecutionService["runChat"]>[0],
    options: ChatExecutionOptions = {}
  ): Promise<string> => {
    const overrides = options.model ? { model: options.model } : undefined;
    return withTimeout(
      input.provider.chat(messages, overrides),
      options.timeoutMs,
      options.label ?? "chat request"
    );
  };

  const runChatStream = async (
    messages: Parameters<ChatExecutionService["runChatStream"]>[0],
    onChunk: Parameters<ChatExecutionService["runChatStream"]>[1],
    options: ChatExecutionOptions = {}
  ): Promise<string> => {
    const overrides = options.model ? { model: options.model } : undefined;
    return withTimeout(
      input.provider.chatStream(messages, onChunk, overrides),
      options.timeoutMs,
      options.label ?? "chat stream"
    );
  };

  return {
    runChat,
    runChatStream
  };
};
