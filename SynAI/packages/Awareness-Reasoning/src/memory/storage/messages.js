import { mutateDatabase, readDatabaseValue } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const listMessages = async (conversationId) => readDatabaseValue((db) => db.messages
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
export const addMessage = async (conversationId, role, content, sources, metadata, phase6Trace) => {
    const message = {
        id: createId(),
        conversationId,
        role,
        content,
        createdAt: new Date().toISOString(),
        ...(sources && sources.length > 0 ? { sources } : {}),
        ...(metadata ? { metadata } : {}),
        ...(phase6Trace ? { phase6Trace } : {})
    };
    await mutateDatabase((db) => ({
        ...db,
        messages: [...db.messages, message]
    }));
    return message;
};
export const clearMessages = async (conversationId) => {
    await mutateDatabase((db) => ({
        ...db,
        messages: db.messages.filter((message) => message.conversationId !== conversationId)
    }));
};
export const removeLastAssistantMessage = async (conversationId) => {
    await mutateDatabase((db) => {
        let lastAssistantIndex = -1;
        for (let index = db.messages.length - 1; index >= 0; index -= 1) {
            const message = db.messages[index];
            if (message.conversationId === conversationId && message.role === "assistant") {
                lastAssistantIndex = index;
                break;
            }
        }
        if (lastAssistantIndex < 0) {
            return db;
        }
        return {
            ...db,
            messages: [
                ...db.messages.slice(0, lastAssistantIndex),
                ...db.messages.slice(lastAssistantIndex + 1)
            ]
        };
    });
};
