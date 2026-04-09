import type { AwarenessAnswerCard } from "@contracts";
import { cn } from "../../../shared/utils/cn";

interface AwarenessCardProps {
  card: AwarenessAnswerCard;
  compact?: boolean;
}

const toneClass = (tone: AwarenessAnswerCard["metrics"][number]["tone"]): string => {
  switch (tone) {
    case "good":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    case "bad":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    default:
      return "border-slate-700/70 bg-slate-950/70 text-slate-100";
  }
};

export function AwarenessCard({ card, compact = false }: AwarenessCardProps) {
  return (
    <section className="rounded-md border border-slate-800/80 bg-slate-950/70 p-2">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-semibold text-slate-100">{card.title}</h3>
          {card.subtitle ? <p className="mt-0.5 text-[10px] text-slate-400">{card.subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-cyan-200">
          {card.kind.replace(/-/g, " ")}
        </span>
      </header>

      {card.metrics.length > 0 ? (
        <div className={cn("mt-2 grid gap-1", compact ? "grid-cols-2" : "grid-cols-2")}>
          {card.metrics.map((metric) => (
            <div key={`${card.kind}-${metric.label}`} className={cn("rounded border px-1.5 py-1", toneClass(metric.tone))}>
              <div className="text-[9px] uppercase tracking-wide text-slate-400">{metric.label}</div>
              <div className="mt-0.5 text-[11px] font-medium text-inherit">{metric.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {card.sections.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {card.sections.map((section) => (
            <div key={`${card.kind}-${section.label}`}>
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{section.label}</p>
              <ul className="mt-0.5 space-y-0.5 text-[11px] leading-snug text-slate-200">
                {section.items.slice(0, compact ? 3 : 5).map((item) => (
                  <li key={item} className="truncate">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {card.footer ? <p className="mt-2 text-[10px] text-slate-400">{card.footer}</p> : null}
    </section>
  );
}
