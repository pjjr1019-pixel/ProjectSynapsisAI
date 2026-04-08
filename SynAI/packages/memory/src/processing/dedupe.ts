import type { MemoryEntry } from "../../../contracts/src/memory";

const normalize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

const jaccard = (a: string[], b: string[]): number => {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((value) => setB.has(value)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

export const findSimilarMemory = (
  candidateText: string,
  existingMemories: MemoryEntry[]
): MemoryEntry | null => {
  const candidateTokens = normalize(candidateText);
  let best: { memory: MemoryEntry; score: number } | null = null;
  for (const memory of existingMemories) {
    if (memory.archived) {
      continue;
    }
    const score = jaccard(candidateTokens, normalize(memory.text));
    if (score >= 0.7 && (!best || score > best.score)) {
      best = { memory, score };
    }
  }
  return best?.memory ?? null;
};
