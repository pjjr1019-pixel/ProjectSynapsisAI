import { mutateDatabase, loadDatabase } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 24);
export const listMemories = async () => {
    const db = await loadDatabase();
    return db.memories.filter((memory) => !memory.archived);
};
export const deleteMemory = async (memoryId) => {
    await mutateDatabase((db) => ({
        ...db,
        memories: db.memories.map((memory) => memory.id === memoryId
            ? {
                ...memory,
                archived: true,
                updatedAt: new Date().toISOString(),
                lifecycle: {
                    status: "archived",
                    reviewStatus: memory.lifecycle?.reviewStatus ?? "unreviewed",
                    archivedAt: new Date().toISOString()
                }
            }
            : memory)
    }));
};
export const upsertMemory = async (input) => {
    const now = new Date().toISOString();
    const normalizedText = input.text.trim();
    let nextMemory = null;
    await mutateDatabase((db) => {
        const existing = db.memories.find((memory) => !memory.archived &&
            memory.category === input.category &&
            memory.text.toLowerCase() === normalizedText.toLowerCase());
        if (existing) {
            nextMemory = {
                ...existing,
                importance: Math.max(existing.importance, input.importance),
                sourceConversationId: input.sourceConversationId,
                updatedAt: now,
                keywords: tokenize(normalizedText),
                provenance: {
                    sourceConversationId: input.sourceConversationId,
                    sourceKind: "conversation",
                    capturedAt: now,
                    sourceMessageCount: null
                },
                lifecycle: {
                    status: "active",
                    reviewStatus: existing.lifecycle?.reviewStatus ?? "unreviewed",
                    archivedAt: null
                }
            };
            return {
                ...db,
                memories: db.memories.map((memory) => (memory.id === existing.id ? nextMemory : memory))
            };
        }
        nextMemory = {
            id: createId(),
            category: input.category,
            text: normalizedText,
            sourceConversationId: input.sourceConversationId,
            createdAt: now,
            updatedAt: now,
            importance: input.importance,
            archived: false,
            keywords: tokenize(normalizedText),
            provenance: {
                sourceConversationId: input.sourceConversationId,
                sourceKind: "conversation",
                capturedAt: now,
                sourceMessageCount: null
            },
            lifecycle: {
                status: "active",
                reviewStatus: "unreviewed",
                archivedAt: null
            }
        };
        return {
            ...db,
            memories: [...db.memories, nextMemory]
        };
    });
    return nextMemory;
};
export const batchUpsertMemories = async (candidates) => {
    if (candidates.length === 0) {
        return [];
    }
    const now = new Date().toISOString();
    const stored = [];
    await mutateDatabase((db) => {
        const nextMemories = [...db.memories];
        for (const input of candidates) {
            const normalizedText = input.text.trim();
            const existingIndex = nextMemories.findIndex((m) => !m.archived &&
                m.category === input.category &&
                m.text.toLowerCase() === normalizedText.toLowerCase());
            if (existingIndex >= 0) {
                const existing = nextMemories[existingIndex];
                const updated = {
                    ...existing,
                    importance: Math.max(existing.importance, input.importance),
                    sourceConversationId: input.sourceConversationId,
                    updatedAt: now,
                    keywords: tokenize(normalizedText),
                    provenance: {
                        sourceConversationId: input.sourceConversationId,
                        sourceKind: "conversation",
                        capturedAt: now,
                        sourceMessageCount: null
                    },
                    lifecycle: {
                        status: "active",
                        reviewStatus: existing.lifecycle?.reviewStatus ?? "unreviewed",
                        archivedAt: null
                    }
                };
                nextMemories[existingIndex] = updated;
                stored.push(updated);
            }
            else {
                const newMemory = {
                    id: createId(),
                    category: input.category,
                    text: normalizedText,
                    sourceConversationId: input.sourceConversationId,
                    createdAt: now,
                    updatedAt: now,
                    importance: input.importance,
                    archived: false,
                    keywords: tokenize(normalizedText),
                    provenance: {
                        sourceConversationId: input.sourceConversationId,
                        sourceKind: "conversation",
                        capturedAt: now,
                        sourceMessageCount: null
                    },
                    lifecycle: {
                        status: "active",
                        reviewStatus: "unreviewed",
                        archivedAt: null
                    }
                };
                nextMemories.push(newMemory);
                stored.push(newMemory);
            }
        }
        return { ...db, memories: nextMemories };
    });
    return stored;
};
export const searchMemoryKeywords = async (query) => {
    const terms = tokenize(query);
    if (terms.length === 0) {
        return listMemories();
    }
    const memories = await listMemories();
    return memories
        .map((memory) => {
        const score = terms.reduce((acc, term) => (memory.keywords.includes(term) ? acc + 1 : acc), 0);
        return { memory, score };
    })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt))
        .map((item) => item.memory);
};
