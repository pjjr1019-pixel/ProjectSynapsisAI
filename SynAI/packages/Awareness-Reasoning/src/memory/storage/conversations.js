import { mutateDatabase, readDatabaseValue } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const listConversations = async () => readDatabaseValue((db) => [...db.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
export const getConversation = async (conversationId) => readDatabaseValue((db) => db.conversations.find((conversation) => conversation.id === conversationId) ?? null);
export const createConversation = async () => {
    const now = new Date().toISOString();
    const conversation = {
        id: createId(),
        title: "New conversation",
        createdAt: now,
        updatedAt: now
    };
    await mutateDatabase((db) => ({
        ...db,
        conversations: [conversation, ...db.conversations]
    }));
    return conversation;
};
export const renameConversation = async (conversationId, title) => {
    let updatedConversation = null;
    await mutateDatabase((db) => {
        const existingIndex = db.conversations.findIndex((conversation) => conversation.id === conversationId);
        if (existingIndex < 0) {
            return db;
        }
        const now = new Date().toISOString();
        const conversations = [...db.conversations];
        updatedConversation = {
            ...conversations[existingIndex],
            title,
            updatedAt: now
        };
        conversations[existingIndex] = updatedConversation;
        return { ...db, conversations };
    });
    return updatedConversation;
};
export const touchConversation = async (conversationId) => {
    await mutateDatabase((db) => {
        const existingIndex = db.conversations.findIndex((conversation) => conversation.id === conversationId);
        if (existingIndex < 0) {
            return db;
        }
        const conversations = [...db.conversations];
        conversations[existingIndex] = {
            ...conversations[existingIndex],
            updatedAt: new Date().toISOString()
        };
        return {
            ...db,
            conversations
        };
    });
};
export const deleteConversation = async (conversationId) => {
    await mutateDatabase((db) => ({
        ...db,
        conversations: db.conversations.filter((conversation) => conversation.id !== conversationId),
        messages: db.messages.filter((message) => message.conversationId !== conversationId),
        summaries: db.summaries.filter((summary) => summary.conversationId !== conversationId),
        memories: db.memories.filter((memory) => memory.sourceConversationId !== conversationId)
    }));
};
