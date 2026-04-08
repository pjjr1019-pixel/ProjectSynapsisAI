import type { ModelHealth } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { formatTime } from "../../../shared/utils/time";

interface LocalModelStatusProps {
  modelHealth: ModelHealth | null;
}

const toneByStatus: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  connected: "good",
  busy: "warn",
  disconnected: "bad",
  error: "bad"
};

export function LocalModelStatus({ modelHealth }: LocalModelStatusProps) {
  if (!modelHealth) {
    return <Card className="p-2 text-xs text-slate-400">Model status unavailable.</Card>;
  }

  return (
    <Card className="space-y-1.5 p-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Local Model</h3>
        <Badge tone={toneByStatus[modelHealth.status] ?? "neutral"}>{modelHealth.status}</Badge>
      </div>
      <p className="truncate text-[11px] text-slate-300">{modelHealth.model}</p>
      <p className="truncate text-[10px] text-slate-500">{modelHealth.baseUrl}</p>
      <p className="text-[10px] text-slate-500">Last checked {formatTime(modelHealth.checkedAt)}</p>
      {modelHealth.detail ? <p className="text-xs text-rose-300">{modelHealth.detail}</p> : null}
    </Card>
  );
}
