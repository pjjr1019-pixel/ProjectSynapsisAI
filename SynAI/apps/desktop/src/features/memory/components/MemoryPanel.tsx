import { Card } from "../../../shared/components/Card";
import { useMemory } from "../hooks/useMemory";
import { MemoryList } from "./MemoryList";
import { MemorySearch } from "./MemorySearch";

export function MemoryPanel() {
  const memory = useMemory();

  return (
    <Card className="space-y-2 p-3">
      <h3 className="text-sm font-semibold text-slate-100">Memory Search</h3>
      <MemorySearch query={memory.query} onChange={memory.setQuery} />
      {memory.error ? <p className="text-xs text-rose-300">{memory.error}</p> : null}
      <div className="max-h-64 overflow-y-auto">
        <MemoryList items={memory.items} onDelete={memory.remove} />
      </div>
    </Card>
  );
}
