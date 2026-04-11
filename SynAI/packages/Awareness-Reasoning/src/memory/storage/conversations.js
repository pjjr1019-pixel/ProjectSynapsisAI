import { mutateDatabase, loadDatabase } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const listConversations = async () => {
    const db = await loadDatabase();
    return [...db.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};
export const getConversation = async (conversationId) => {
    const db = await loadDatabase();
    return db.conversations.find((conversation) => conversation.id === conversationId) ?? null;
};
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
        const now = new Date().toISOString();
        const conversations = db.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
                return conversation;
            }
            updatedConversation = {
                ...conversation,
                title,
                updatedAt: now
            };
            return updatedConversation;
        });
        return { ...db, conversations };
    });
    return updatedConversation;
};
export const touchConversation = async (conversationId) => {
    await mutateDatabase((db) => ({
        ...db,
        conversations: db.conversations.map((conversation) => conversation.id === conversationId
            ? { ...conversation, updatedAt: new Date().toISOString() }
            : conversation)
    }));
};
export const deleteConversation = async (conversationId) => {
    await mutateDatabase((db) => ({
        conversations: db.conversations.filter((conversation) => conversation.id !== conversationId),
        messages: db.messages.filter((message) => message.conversationId !== conversationId),
        summaries: db.summaries.filter((summary) => summary.conversationId !== conversationId),
        memories: db.memories.filter((memory) => memory.sourceConversationId !== conversationId)
    }));
};
