import type { MemoryEntry, RetrievedMemory } from "../../../contracts/src/memory";

// Phase 1 does not enable semantic retrieval yet.
// Keep this helper out of the active retrieval pipeline until embeddings-backed ranking exists.
export const semanticRetrieve = async (
  _query: string,
  _memories: MemoryEntry[]
): Promise<RetrievedMemory[]> => {
  return [];
};
