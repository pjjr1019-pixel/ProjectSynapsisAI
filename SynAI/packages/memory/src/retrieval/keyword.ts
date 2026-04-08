import type { MemoryEntry, RetrievedMemory } from "../../../contracts/src/memory";

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

export const keywordRetrieve = (query: string, memories: MemoryEntry[]): RetrievedMemory[] => {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }
  return memories
    .map((memory) => {
      const hits = terms.reduce((total, term) => (memory.keywords.includes(term) ? total + 1 : total), 0);
      const score = hits === 0 ? 0 : hits / terms.length + memory.importance * 0.2;
      return {
        memory,
        score,
        reason: "keyword" as const
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
};
