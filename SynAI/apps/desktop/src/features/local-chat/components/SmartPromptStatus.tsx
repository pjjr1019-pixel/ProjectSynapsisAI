import type { AppHealth, ContextPreview } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { summarizePromptContext } from "../utils/promptAssembler";

interface SmartPromptStatusProps {
  preview: ContextPreview | null;
  appHealth?: AppHealth | null;
}

export function SmartPromptStatus({ preview, appHealth = null }: SmartPromptStatusProps) {
  const webTone =
    preview?.webSearch.status === "used"
      ? "good"
      : preview?.webSearch.status === "error"
        ? "bad"
        : preview?.webSearch.status === "no_results"
          ? "warn"
          : "neutral";
  const awarenessTone = preview?.awareness ? "good" : "neutral";
  const queryTone = preview?.awarenessQuery ? "good" : "neutral";
  const assistTone = preview?.screenAwareness ? "good" : "neutral";
  const ragTone = preview?.rag?.mode === "advanced" ? "good" : preview?.rag ? "warn" : "neutral";
  const routeTone =
    preview?.routeDecision?.mode === "cache_only"
      ? "good"
      : preview?.routeDecision?.mode === "cache_plus_retrieval"
        ? "warn"
        : preview?.routeDecision?.mode === "retrieval_only"
          ? "neutral"
          : "neutral";
  const codingTone = preview?.routeDecision?.codingMode ? "good" : "neutral";
  const highQualityTone = preview?.routeDecision?.highQualityMode ? "good" : "neutral";
  const modeTone =
    preview?.awarenessAnswerMode === "evidence-first"
      ? "good"
      : preview?.awarenessAnswerMode === "llm-primary"
        ? "warn"
        : "neutral";
  const awarenessRuntime = appHealth?.awareness ?? null;
  const runtimeTone = awarenessRuntime?.ready ? "good" : awarenessRuntime?.initializing ? "warn" : "neutral";
  const runtimeSummary = awarenessRuntime
    ? [
        awarenessRuntime.ready ? "aware ready" : awarenessRuntime.initializing ? "aware init" : "aware idle",
        awarenessRuntime.backgroundSamplerActive ? "sampler on" : "sampler off",
        awarenessRuntime.inFlightTargets.length > 0
          ? `in flight ${awarenessRuntime.inFlightTargets.join(", ")}`
          : "in flight none",
        awarenessRuntime.lastSampledAt ? `sample ${awarenessRuntime.lastSampledAt.slice(11, 19)}` : null
      ]
        .filter((value): value is string => Boolean(value))
        .join(" | ")
    : null;

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-800 px-2.5 py-1 text-[10px] text-slate-400">
      <Badge className="px-1.5 py-0.5 text-[10px]" tone="neutral">
        Smart Prompt
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={webTone}>
        Web
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={awarenessTone}>
        Aw.
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={modeTone}>
        Mode
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={queryTone}>
        Query
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={assistTone}>
        Assist
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={ragTone}>
        RAG
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={routeTone}>
        {preview?.routeDecision?.mode ?? "Route"}
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={codingTone}>
        Code
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={highQualityTone}>
        HQ
      </Badge>
      <Badge className="px-1.5 py-0.5 text-[10px]" tone={runtimeTone}>
        Aware
      </Badge>
      <span className="min-w-0 flex-1 truncate">
        {[summarizePromptContext(preview), runtimeSummary].filter(Boolean).join(" | ")}
      </span>
    </div>
  );
}
