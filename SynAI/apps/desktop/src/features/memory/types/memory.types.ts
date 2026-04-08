import type { MemoryEntry } from "@contracts";

export interface MemoryState {
  query: string;
  items: MemoryEntry[];
  loading: boolean;
  error: string | null;
}
