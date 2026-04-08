import type { MemoryEntry } from "@contracts";
import { MemoryItem } from "./MemoryItem";

interface MemoryListProps {
  items: MemoryEntry[];
  onDelete: (memoryId: string) => Promise<void>;
  limit?: number;
}

export function MemoryList({ items, onDelete, limit }: MemoryListProps) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) {
    return <p className="text-xs text-slate-500">No memory entries yet.</p>;
  }

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <MemoryItem key={item.id} item={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
