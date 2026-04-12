import { mutateDatabase, readDatabaseValue } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const getSummary = async (conversationId) => readDatabaseValue((db) => db.summaries.find((summary) => summary.conversationId === conversationId) ?? null);
export const upsertSummary = async (conversationId, text, sourceMessageCount) => {
    const now = new Date().toISOString();
    let nextSummary = null;
    await mutateDatabase((db) => {
        const existingIndex = db.summaries.findIndex((summary) => summary.conversationId === conversationId);
        if (existingIndex >= 0) {
            const summaries = [...db.summaries];
            nextSummary = {
                ...summaries[existingIndex],
                text,
                sourceMessageCount,
                updatedAt: now
            };
            summaries[existingIndex] = nextSummary;
            return {
                ...db,
                summaries
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
