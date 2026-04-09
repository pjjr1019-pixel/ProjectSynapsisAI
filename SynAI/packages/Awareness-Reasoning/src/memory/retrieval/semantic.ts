import type { MemoryEntry, RetrievedMemory } from "../../contracts/memory";
import { getEmbeddings } from "../../local-ai/embeddings";

const cosineSimilarity = (left: number[], right: number[]): number => {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let numerator = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    numerator += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return numerator / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

export const semanticRetrieve = async (
  query: string,
  memories: MemoryEntry[],
  options?: {
    embedder?: (text: string) => Promise<number[]>;
  }
): Promise<RetrievedMemory[]> => {
  const embedder = options?.embedder ?? getEmbeddings;
  if (memories.length === 0) {
    return [];
  }

  const queryEmbedding = await embedder(query).catch(() => []);
  if (queryEmbedding.length === 0) {
    return [];
  }

  const scored = await Promise.all(
    memories.map(async (memory) => {
      const embedding = await embedder(memory.text).catch(() => []);
      const score = embedding.length > 0 ? cosineSimilarity(queryEmbedding, embedding) : 0;
      return {
        memory,
        score,
        reason: "semantic" as const
      };
    })
  );

  return scored.filter((item) => item.score > 0.2).sort((left, right) => right.score - left.score);
};

