import type { ContextPreview, MemoryEntry } from "@contracts";
import { Card } from "../../../shared/components/Card";

interface MemoryInspectorProps {
  preview: ContextPreview | null;
  memories: MemoryEntry[];
}

export function MemoryInspector({ preview, memories }: MemoryInspectorProps) {
  const retrieved = preview?.retrievedMemories ?? [];

  return (
    <Card className="space-y-2 p-3">
      <h3 className="text-sm font-semibold text-slate-100">Memory Inspector</h3>
      <p className="text-xs text-slate-400">Stored memories: {memories.length}</p>
      <div className="space-y-2">
        {retrieved.length === 0 ? (
          <p className="text-xs text-slate-500">No memories retrieved for current turn.</p>
        ) : (
          retrieved.map((item) => (
            <div key={item.memory.id} className="rounded border border-slate-700 bg-slate-900/60 p-2">
              <p className="text-xs text-slate-300">[{item.memory.category}] {item.memory.text}</p>
              <p className="text-[11px] text-slate-500">score {item.score.toFixed(2)} via {item.reason}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
