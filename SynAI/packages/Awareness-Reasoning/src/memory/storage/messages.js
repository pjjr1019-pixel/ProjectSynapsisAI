import { mutateDatabase, loadDatabase } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const listMessages = async (conversationId) => {
    const db = await loadDatabase();
    return db.messages
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};
export const addMessage = async (conversationId, role, content, sources, metadata) => {
    const message = {
        id: createId(),
        conversationId,
        role,
        content,
        createdAt: new Date().toISOString(),
        ...(sources && sources.length > 0 ? { sources } : {}),
        ...(metadata ? { metadata } : {})
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
        const scoped = db.messages.filter((message) => message.conversationId === conversationId);
        const lastAssistant = [...scoped].reverse().find((message) => message.role === "assistant");
        if (!lastAssistant) {
            return db;
        }
        return {
            ...db,
            messages: db.messages.filter((message) => message.id !== lastAssistant.id)
        };
    });
};
