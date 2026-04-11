import { mutateDatabase, loadDatabase } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const getSummary = async (conversationId) => {
    const db = await loadDatabase();
    return db.summaries.find((summary) => summary.conversationId === conversationId) ?? null;
};
export const upsertSummary = async (conversationId, text, sourceMessageCount) => {
    const now = new Date().toISOString();
    let nextSummary = null;
    await mutateDatabase((db) => {
        const existing = db.summaries.find((summary) => summary.conversationId === conversationId);
        if (existing) {
            nextSummary = {
                ...existing,
                text,
                sourceMessageCount,
                updatedAt: now
            };
            return {
                ...db,
                summaries: db.summaries.map((summary) => summary.conversationId === conversationId ? nextSummary : summary)
            };
        }
        nextSummary = {
            id: createId(),
            conversationId,
            text,
            sourceMessageCount,
            updatedAt: now
        };
        return {
            ...db,
            summaries: [...db.summaries, nextSummary]
        };
    });
    return nextSummary;
};
export const deleteSummary = async (conversationId) => {
    await mutateDatabase((db) => ({
        ...db,
        summaries: db.summaries.filter((summary) => summary.conversationId !== conversationId)
    }));
};
