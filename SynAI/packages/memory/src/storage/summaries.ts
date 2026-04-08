import type { ConversationSummary } from "../../../contracts/src/memory";
import { mutateDatabase, loadDatabase } from "./db";

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getSummary = async (conversationId: string): Promise<ConversationSummary | null> => {
  const db = await loadDatabase();
  return db.summaries.find((summary) => summary.conversationId === conversationId) ?? null;
};

export const upsertSummary = async (
  conversationId: string,
  text: string,
  sourceMessageCount: number
): Promise<ConversationSummary> => {
  const now = new Date().toISOString();
  let nextSummary: ConversationSummary | null = null;
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
        summaries: db.summaries.map((summary) =>
          summary.conversationId === conversationId ? nextSummary! : summary
        )
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
  return nextSummary!;
};

export const deleteSummary = async (conversationId: string): Promise<void> => {
  await mutateDatabase((db) => ({
    ...db,
    summaries: db.summaries.filter((summary) => summary.conversationId !== conversationId)
  }));
};
