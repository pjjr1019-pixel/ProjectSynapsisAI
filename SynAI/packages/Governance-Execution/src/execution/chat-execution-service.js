const withTimeout = async (promise, timeoutMs, label) => {
    if (!timeoutMs || timeoutMs <= 0) {
        return promise;
    }
    let timer = null;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
        timer.unref?.();
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
};
export const createChatExecutionService = (input) => {
    const runChat = async (messages, options = {}) => {
        const overrides = options.model ? { model: options.model } : undefined;
        return withTimeout(input.provider.chat(messages, overrides), options.timeoutMs, options.label ?? "chat request");
    };
    const runChatStream = async (messages, onChunk, options = {}) => {
        const overrides = options.model ? { model: options.model } : undefined;
        return withTimeout(input.provider.chatStream(messages, onChunk, overrides), options.timeoutMs, options.label ?? "chat stream");
    };
    return {
        runChat,
        runChatStream
    };
};
