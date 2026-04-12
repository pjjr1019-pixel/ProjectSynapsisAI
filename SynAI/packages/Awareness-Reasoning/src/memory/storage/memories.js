import { mutateDatabase, readDatabaseValue } from "./db";
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 24);
const normalizeMemoryText = (text) => text.trim();
const buildMemoryLookupKey = (category, text) => `${category}::${normalizeMemoryText(text).toLowerCase()}`;
const indexActiveMemories = (memories) => {
    const index = new Map();
    memories.forEach((memory, position) => {
        if (!memory.archived) {
            index.set(buildMemoryLookupKey(memory.category, memory.text), position);
        }
    });
    return index;
};
const buildMemoryRecord = (input, normalizedText, now, existing) => ({
    id: existing?.id ?? createId(),
    category: input.category,
    text: normalizedText,
    sourceConversationId: input.sourceConversationId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    importance: existing ? Math.max(existing.importance, input.importance) : input.importance,
    archived: false,
    keywords: tokenize(normalizedText),
    provenance: {
        sourceConversationId: input.sourceConversationId,
        sourceKind: "conversation",
        capturedAt: now,
        sourceMessageCount: null,
        sourceEventId: input.sourceEventId
    },
    lifecycle: {
        status: "active",
        reviewStatus: existing?.lifecycle?.reviewStatus ?? "unreviewed",
        archivedAt: null
    }
});
export const listMemories = async () => readDatabaseValue((db) => db.memories.filter((memory) => !memory.archived));
export const deleteMemory = async (memoryId) => {
    await mutateDatabase((db) => {
        const existingIndex = db.memories.findIndex((memory) => memory.id === memoryId);
        if (existingIndex < 0) {
            return db;
        }
        const archivedAt = new Date().toISOString();
        const memories = [...db.memories];
        memories[existingIndex] = {
            ...memories[existingIndex],
            archived: true,
            updatedAt: archivedAt,
            lifecycle: {
                status: "archived",
                reviewStatus: memories[existingIndex].lifecycle?.reviewStatus ?? "unreviewed",
                archivedAt
            }
        };
        return {
            ...db,
            memories
        };
    });
};
export const upsertMemory = async (input) => {
    const now = new Date().toISOString();
    const normalizedText = normalizeMemoryText(input.text);
    const lookupKey = buildMemoryLookupKey(input.category, normalizedText);
    let nextMemory = null;
    await mutateDatabase((db) => {
        const memories = [...db.memories];
        const memoryIndex = indexActiveMemories(memories);
        const existingIndex = memoryIndex.get(lookupKey);
        if (existingIndex != null) {
            nextMemory = buildMemoryRecord(input, normalizedText, now, memories[existingIndex]);
            memories[existingIndex] = nextMemory;
            return {
                ...db,
                memories
            };
        }
        nextMemory = buildMemoryRecord(input, normalizedText, now);
        memories.push(nextMemory);
        return {
            ...db,
            memories
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
        const memoryIndex = indexActiveMemories(nextMemories);
        for (const input of candidates) {
            const normalizedText = normalizeMemoryText(input.text);
            const lookupKey = buildMemoryLookupKey(input.category, normalizedText);
            const existingIndex = memoryIndex.get(lookupKey);
            if (existingIndex != null) {
                const updated = buildMemoryRecord(input, normalizedText, now, nextMemories[existingIndex]);
                nextMemories[existingIndex] = updated;
                stored.push(updated);
                continue;
            }
            const newMemory = buildMemoryRecord(input, normalizedText, now);
            nextMemories.push(newMemory);
            memoryIndex.set(lookupKey, nextMemories.length - 1);
            stored.push(newMemory);
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
    return readDatabaseValue((db) => db.memories
        .filter((memory) => !memory.archived)
        .map((memory) => {
        const score = terms.reduce((acc, term) => (memory.keywords.includes(term) ? acc + 1 : acc), 0);
        return { memory, score };
    })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt))
        .map((item) => item.memory));
};
