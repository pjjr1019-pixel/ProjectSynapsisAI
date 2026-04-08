import type { MemoryCategory, MemoryEntry } from "../../../contracts/src/memory";
import { mutateDatabase, loadDatabase } from "./db";

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 24);

export const listMemories = async (): Promise<MemoryEntry[]> => {
  const db = await loadDatabase();
  return db.memories.filter((memory) => !memory.archived);
};

export const deleteMemory = async (memoryId: string): Promise<void> => {
  await mutateDatabase((db) => ({
    ...db,
    memories: db.memories.map((memory) =>
      memory.id === memoryId
        ? { ...memory, archived: true, updatedAt: new Date().toISOString() }
        : memory
    )
  }));
};

export const upsertMemory = async (input: {
  category: MemoryCategory;
  text: string;
  sourceConversationId: string;
  importance: number;
}): Promise<MemoryEntry> => {
  const now = new Date().toISOString();
  const normalizedText = input.text.trim();
  let nextMemory: MemoryEntry | null = null;

  await mutateDatabase((db) => {
    const existing = db.memories.find(
      (memory) =>
        !memory.archived &&
        memory.category === input.category &&
        memory.text.toLowerCase() === normalizedText.toLowerCase()
    );

    if (existing) {
      nextMemory = {
        ...existing,
        importance: Math.max(existing.importance, input.importance),
        sourceConversationId: input.sourceConversationId,
        updatedAt: now,
        keywords: tokenize(normalizedText)
      };
      return {
        ...db,
        memories: db.memories.map((memory) => (memory.id === existing.id ? nextMemory! : memory))
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
      keywords: tokenize(normalizedText)
    };
    return {
      ...db,
      memories: [...db.memories, nextMemory]
    };
  });

  return nextMemory!;
};

export const searchMemoryKeywords = async (query: string): Promise<MemoryEntry[]> => {
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
