import type { RetrievedMemory } from "../../../contracts/src/memory";

export const rankRetrievedMemories = (
  keyword: RetrievedMemory[],
  semantic: RetrievedMemory[],
  limit: number
): RetrievedMemory[] => {
  const map = new Map<string, RetrievedMemory>();

  for (const item of [...keyword, ...semantic]) {
    const existing = map.get(item.memory.id);
    if (!existing || item.score > existing.score) {
      map.set(item.memory.id, item);
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score).slice(0, limit);
};
