import { getOllamaConfig, ollamaChat, ollamaChatStream } from "./ollama";
export const sendOllamaChat = async (messages, overrides) => {
    const config = getOllamaConfig(overrides);
    return ollamaChat(config, messages.map((message) => ({
        role: message.role,
        content: message.content
    })));
};
export const sendOllamaChatStream = async (messages, onChunk, overrides) => {
    const config = getOllamaConfig(overrides);
    return ollamaChatStream(config, messages.map((message) => ({
        role: message.role,
        content: message.content
    })), onChunk);
};
