import { Card } from "../../../shared/components/Card";
import { useMemory } from "../hooks/useMemory";
import { MemoryList } from "./MemoryList";
import { MemorySearch } from "./MemorySearch";
import { cn } from "../../../shared/utils/cn";

interface MemoryPanelProps {
  className?: string;
  hideTitle?: boolean;
  compact?: boolean;
}

export function MemoryPanel({ className, hideTitle = false, compact = false }: MemoryPanelProps) {
  const memory = useMemory();
  const visibleItems = compact ? memory.items.slice(0, 3) : memory.items;

  return (
    <Card className={cn("space-y-2 p-3", className)}>
      {hideTitle ? null : <h3 className="text-sm font-semibold text-slate-100">Memory Search</h3>}
      <MemorySearch query={memory.query} onChange={memory.setQuery} />
      {memory.error ? <p className="text-xs text-rose-300">{memory.error}</p> : null}
      <div className="space-y-2">
        <MemoryList items={visibleItems} onDelete={memory.remove} />
        {compact && memory.items.length > visibleItems.length ? (
          <p className="text-[10px] text-slate-500">+{memory.items.length - visibleItems.length} more results</p>
        ) : null}
      </div>
    </Card>
  );
}
