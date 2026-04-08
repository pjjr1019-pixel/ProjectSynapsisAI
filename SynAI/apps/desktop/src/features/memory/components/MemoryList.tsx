import type { MemoryEntry } from "@contracts";
import { MemoryItem } from "./MemoryItem";

interface MemoryListProps {
  items: MemoryEntry[];
  onDelete: (memoryId: string) => Promise<void>;
}

export function MemoryList({ items, onDelete }: MemoryListProps) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500">No memory entries yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <MemoryItem key={item.id} item={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
