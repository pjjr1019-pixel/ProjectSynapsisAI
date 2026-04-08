import type { MemoryEntry } from "@contracts";
import { Button } from "../../../shared/components/Button";

interface MemoryItemProps {
  item: MemoryEntry;
  onDelete: (memoryId: string) => Promise<void>;
}

export function MemoryItem({ item, onDelete }: MemoryItemProps) {
  return (
    <article className="rounded border border-slate-700 bg-slate-900/60 p-2">
      <p className="text-xs text-slate-400">{item.category}</p>
      <p className="text-sm text-slate-200">{item.text}</p>
      <p className="text-[11px] text-slate-500">importance {item.importance.toFixed(2)}</p>
      <Button className="mt-2 w-full" variant="ghost" onClick={() => void onDelete(item.id)}>
        Delete
      </Button>
    </article>
  );
}
