import type { ContextPreview, MemoryEntry } from "@contracts";
import { Card } from "../../../shared/components/Card";
import { cn } from "../../../shared/utils/cn";

interface MemoryInspectorProps {
  preview: ContextPreview | null;
  memories: MemoryEntry[];
  className?: string;
  hideTitle?: boolean;
  compact?: boolean;
}

export function MemoryInspector({
  preview,
  memories,
  className,
  hideTitle = false,
  compact = false
}: MemoryInspectorProps) {
  const retrieved = preview?.retrievedMemories ?? [];
  const visibleRetrieved = compact ? retrieved.slice(0, 3) : retrieved;

  return (
    <Card className={cn("space-y-2 p-3", className)}>
      {hideTitle ? null : <h3 className="text-sm font-semibold text-slate-100">Memory Inspector</h3>}
      <p className="text-xs text-slate-400">Stored memories: {memories.length}</p>
      <div className="space-y-2">
        {visibleRetrieved.length === 0 ? (
          <p className="text-xs text-slate-500">No memories retrieved for current turn.</p>
        ) : (
          visibleRetrieved.map((item) => (
            <div key={item.memory.id} className="rounded border border-slate-700 bg-slate-900/60 p-2">
              <p className="text-xs text-slate-300">[{item.memory.category}] {item.memory.text}</p>
              <p className="text-[11px] text-slate-500">score {item.score.toFixed(2)} via {item.reason}</p>
            </div>
          ))
        )}
        {compact && retrieved.length > visibleRetrieved.length ? (
          <p className="text-[10px] text-slate-500">+{retrieved.length - visibleRetrieved.length} more retrieved</p>
        ) : null}
      </div>
    </Card>
  );
}
