import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentType
} from "react";
import type {
  AppHealth,
  ChatMessage,
  Conversation,
  ModelHealth,
  ReasoningTraceState,
  ScreenAwarenessStatus,
  ToggleMode
} from "@contracts";
import type { WorkspaceTab, ChatSettingsState } from "../types/localChat.types";
import { AwarenessCard } from "./AwarenessCard";
import { MessageList } from "./MessageList";
import { buildStartupDigestCard } from "../utils/awarenessCards";
import { cn } from "../../../shared/utils/cn";
import { formatTime } from "../../../shared/utils/time";

type BootStage = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  active: boolean;
  error?: boolean;
  icon: ComponentType<{ className?: string }>;
};

type OrbState = "booting" | "warming" | "ready" | "thinking" | "replying" | "error" | "offline";

interface FuturisticBootToChatShellProps {
  conversation: Conversation | null;
  conversationsCount: number;
  activeConversationId: string | null;
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  messages: ChatMessage[];
  loading: boolean;
  pendingAssistantId: string | null;
  pendingReasoningTrace: ReasoningTraceState | null;
  settings: ChatSettingsState;
  error: string | null;
  onSendMessage: (
    text: string,
    options?: {
      ragMode?: "inherit" | "on" | "off";
      webMode?: "inherit" | "on" | "off";
      traceMode?: "inherit" | "on" | "off";
      codingMode?: "inherit" | "on" | "off";
      highQualityMode?: "inherit" | "on" | "off";
    }
  ) => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearConversation: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onOpenLegacySurface: (tab: WorkspaceTab) => void;
}

interface IconProps {
  className?: string;
}

const nextToggleMode = (mode: ToggleMode): ToggleMode =>
  mode === "inherit" ? "on" : mode === "on" ? "off" : "inherit";

const formatToggle = (label: string, mode: ToggleMode, inheritedEnabled: boolean): string => {
  if (mode === "inherit") {
    return `${label}: ${inheritedEnabled ? "Default On" : "Default Off"}`;
  }

  return `${label}: ${mode === "on" ? "On" : "Off"}`;
};

const shortModelName = (modelName: string | null | undefined): string => {
  const trimmed = modelName?.trim();
  if (!trimmed) {
    return "unavailable";
  }
  return trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed;
};

const iconClass = "h-4 w-4";

function TerminalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m7.5 10 2.5 2.5L7.5 15" />
      <path d="M12.5 15h4" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <path d="M12 3.5c2.7 1.6 5.4 2.4 8 2.5V12c0 4.7-3 7.8-8 9-5-1.2-8-4.3-8-9V6c2.6-.1 5.3-.9 8-2.5Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  );
}

function CpuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </svg>
  );
}

function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <ellipse cx="12" cy="6.5" rx="7" ry="3.5" />
      <path d="M5 6.5v5c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-5" />
      <path d="M5 11.5v5c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-5" />
    </svg>
  );
}

function MessageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <path d="M6 18.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 17H8.5L6 18.5Z" />
      <path d="M8 9h8M8 12.5h5.5" />
    </svg>
  );
}

function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <path d="M4 12h3l2.2-5 3.6 10 2.4-5H20" />
    </svg>
  );
}

function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <path d="m12 3 1.2 4.3L17.5 8.5l-4.3 1.2L12 14l-1.2-4.3L6.5 8.5l4.3-1.2L12 3Z" />
      <path d="m18.5 14 0.8 2.8 2.7 0.8-2.7 0.8-0.8 2.8-0.8-2.8-2.7-0.8 2.7-0.8 0.8-2.8Z" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconClass, className)}>
      <path d="M10.2 3.8h3.6l.8 2.1 2.2.9 2-.9 2 3.1-1.5 1.6.2 2.4 1.8 1.5-1.8 3.2-2.2-.5-2 1.2-.5 2.2H10l-.6-2.2-2-1.1-2.2.4L3.5 15l1.7-1.5.1-2.4L3.8 9.5l1.9-3.1 2 .9 2.2-.9.3-.8.6-1.7Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function BootRow({ stage, completedAt }: { stage: BootStage; completedAt?: string }) {
  const Icon = stage.icon;
  const badgeLabel = stage.complete ? "done" : stage.active ? "active" : "queued";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-3 py-2.5 transition-colors",
        stage.error
          ? "border-rose-400/25 bg-rose-400/[0.06]"
          : stage.complete
            ? "border-cyan-400/20 bg-cyan-400/[0.06]"
            : stage.active
              ? "border-cyan-300/25 bg-white/[0.06]"
              : "border-white/8 bg-white/[0.03]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 rounded-xl border p-1.5",
            stage.error
              ? "border-rose-300/25 bg-rose-300/10 text-rose-200"
              : stage.complete
                ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
                : stage.active
                  ? "border-sky-300/20 bg-sky-300/10 text-sky-200"
                  : "border-white/10 bg-white/[0.04] text-white/55"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white/90">{stage.label}</p>
            <div
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.22em]",
                stage.error
                  ? "bg-rose-300/10 text-rose-200/80"
                  : stage.complete
                    ? "bg-cyan-300/10 text-cyan-200/80"
                    : stage.active
                      ? "bg-sky-300/10 text-sky-200/80"
                      : "bg-white/[0.05] text-white/40"
              )}
            >
              {badgeLabel}
            </div>
          </div>
          <p className="mt-1 text-xs leading-4 text-white/50">
            {stage.detail}
            {completedAt ? ` Confirmed ${formatTime(completedAt)}.` : ""}
          </p>
        </div>
      </div>

      {stage.active ? (
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-cyan-300/0 via-cyan-300/80 to-cyan-300/0 opacity-80" />
      ) : null}
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-3 py-2.5",
        tone === "good"
          ? "border-cyan-400/20 bg-cyan-400/[0.06]"
          : tone === "warn"
            ? "border-amber-400/20 bg-amber-400/[0.06]"
            : tone === "bad"
              ? "border-rose-400/20 bg-rose-400/[0.06]"
              : "border-white/8 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
        <Icon className="h-3.5 w-3.5 text-cyan-200/65" />
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}

function TelemetryBand({ ready }: { ready: boolean }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, bar) => {
        const [first, second, third] = ready
          ? [20 + (bar % 6) * 2, 10 + (bar % 10) * 2, 26 + (bar % 4) * 3]
          : [8 + (bar % 7) * 2, 18 + (bar % 4) * 3, 12 + (bar % 8) * 2];
        return {
          id: bar,
          first,
          second,
          third,
          duration: 1.2 + (bar % 6) * 0.15,
          delay: bar * 0.03
        };
      }),
    [ready]
  );

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.32em] text-cyan-200/55">
        <span>Telemetry</span>
        <span>{ready ? "Conversation online" : "Stabilizing runtime"}</span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {bars.map((bar) => (
          <span
            key={bar.id}
            className={cn(
              "synai-telemetry-bar flex-1 rounded-full bg-cyan-300/65 shadow-[0_0_16px_rgba(34,211,238,0.12)]",
              ready ? "synai-telemetry-bar--ready" : null
            )}
            style={
              {
                "--telemetry-h1": `${bar.first}px`,
                "--telemetry-h2": `${bar.second}px`,
                "--telemetry-h3": `${bar.third}px`,
                "--telemetry-duration": `${bar.duration}s`,
                "--telemetry-delay": `${bar.delay}s`
              } as CSSProperties
            }
          />
        ))}
      </div>
      <span
        className="synai-telemetry-scan pointer-events-none absolute inset-y-0 left-[-18%] w-[36%] bg-gradient-to-r from-cyan-300/16 via-cyan-300/0 to-transparent"
        style={{ "--telemetry-scan-duration": ready ? "2.8s" : "4.2s" } as CSSProperties}
      />
    </div>
  );
}

function Orb({ state, compact }: { state: OrbState; compact?: boolean }) {
  const palette = {
    booting: { primary: "34,211,238", secondary: "139,92,246", pulse: "2.4s", ring: "22s", label: "Booting" },
    warming: { primary: "56,189,248", secondary: "14,165,233", pulse: "1.7s", ring: "18s", label: "Warming" },
    ready: { primary: "34,211,238", secondary: "96,165,250", pulse: "1.2s", ring: "14s", label: "Ready" },
    thinking: { primary: "250,204,21", secondary: "245,158,11", pulse: "0.9s", ring: "8s", label: "Thinking" },
    replying: { primary: "45,212,191", secondary: "34,197,94", pulse: "0.75s", ring: "7s", label: "Replying" },
    error: { primary: "251,113,133", secondary: "244,63,94", pulse: "1.1s", ring: "10s", label: "Error" },
    offline: { primary: "248,113,113", secondary: "249,115,22", pulse: "1.6s", ring: "11s", label: "Offline" }
  }[state];

  const orbSize = compact ? 86 : 196;
  const coreSize = compact ? 58 : 134;
  const innerOffset = compact ? 12 : 24;
  const particleOffset = compact ? -40 : -86;

  return (
    <div
      data-orb-state={state}
      aria-label={`Runtime orb ${palette.label}`}
      className={cn("relative flex items-center justify-center transition-all duration-500", compact ? "h-24 w-24" : "h-56 w-56")}
      style={
        {
          "--orb-primary": palette.primary,
          "--orb-secondary": palette.secondary,
          "--orb-ring-speed": palette.ring,
          "--orb-pulse-speed": palette.pulse,
          width: `${orbSize}px`,
          height: `${orbSize}px`
        } as CSSProperties
      }
    >
      <div className="synai-orb-ring absolute inset-0 rounded-full border border-white/10">
        <div className="absolute inset-3 rounded-full border border-white/10" />
        <div className="absolute inset-8 rounded-full border border-white/5" />
      </div>
      <div className="synai-orb-ring synai-orb-ring--reverse absolute rounded-full border border-white/10" style={{ inset: `${innerOffset}px` }} />
      <div className="synai-orb-glow absolute rounded-full" style={{ width: `${coreSize + 44}px`, height: `${coreSize + 44}px` }} />
      <div className="synai-orb-core relative rounded-full border border-white/15" style={{ width: `${coreSize}px`, height: `${coreSize}px` }}>
        <div className="synai-orb-ring absolute inset-[18%] rounded-full border border-white/10" />
        <div className="synai-orb-ring synai-orb-ring--reverse absolute inset-[30%] rounded-full border border-white/10" />
        <div className="synai-orb-heart absolute left-1/2 top-1/2 h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>
      <div className="synai-orb-ring absolute inset-0">
        {[0, 90, 180, 270].map((deg) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.45)]"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(${particleOffset}px)`
            }}
          />
        ))}
      </div>
    </div>
  );
}

const resolveOrbState = ({
  bootCompleted,
  loading,
  pendingAssistantContent,
  pendingAssistantId,
  error,
  modelHealth,
  appHealth
}: {
  bootCompleted: boolean;
  loading: boolean;
  pendingAssistantContent: string;
  pendingAssistantId: string | null;
  error: string | null;
  modelHealth: ModelHealth | null;
  appHealth: AppHealth | null;
}): OrbState => {
  if (error) {
    return "error";
  }

  if (modelHealth?.status === "disconnected" || modelHealth?.status === "error") {
    return "offline";
  }

  if (!bootCompleted) {
    return modelHealth || appHealth ? "warming" : "booting";
  }

  if (loading && pendingAssistantId) {
    return pendingAssistantContent.trim().length > 0 ? "replying" : "thinking";
  }

  if (appHealth?.awareness?.initializing) {
    return "warming";
  }

  return "ready";
};

export function FuturisticBootToChatShell({
  conversation,
  conversationsCount,
  activeConversationId,
  appHealth,
  modelHealth,
  screenStatus,
  messages,
  loading,
  pendingAssistantId,
  pendingReasoningTrace,
  settings,
  error,
  onSendMessage,
  onNewConversation,
  onClearConversation,
  onRegenerate,
  onOpenLegacySurface
}: FuturisticBootToChatShellProps) {
  const [shellMounted, setShellMounted] = useState(false);
  const [bootCompleted, setBootCompleted] = useState(false);
  const [input, setInput] = useState("");
  const [codingMode, setCodingMode] = useState<ToggleMode>("inherit");
  const [highQualityMode, setHighQualityMode] = useState<ToggleMode>("inherit");
  const [webMode, setWebMode] = useState<ToggleMode>("inherit");
  const [traceMode, setTraceMode] = useState<ToggleMode>("inherit");
  const [stageMoments, setStageMoments] = useState<Record<string, string>>({});

  useEffect(() => {
    setShellMounted(true);
  }, []);

  const bridgeReady = shellMounted && typeof window !== "undefined" && typeof window.synai !== "undefined";
  const runtimeReady = appHealth !== null;
  const providerReady = modelHealth !== null;
  const conversationsReady = Boolean(activeConversationId);
  const bootSignalReady = bridgeReady && runtimeReady && providerReady && conversationsReady && !loading;

  useEffect(() => {
    if (bootSignalReady) {
      setBootCompleted(true);
    }
  }, [bootSignalReady]);

  const pendingAssistantContent =
    pendingAssistantId === null
      ? ""
      : messages.find((message) => message.id === pendingAssistantId)?.content ?? "";

  const orbState = resolveOrbState({
    bootCompleted,
    loading,
    pendingAssistantContent,
    pendingAssistantId,
    error,
    modelHealth,
    appHealth
  });

  const stages = useMemo<BootStage[]>(() => {
    const stageState = [
      {
        id: "shell",
        label: "Renderer shell",
        detail: shellMounted
          ? "Vertical desktop column mounted in the renderer."
          : "Mounting the slim renderer shell.",
        complete: shellMounted,
        icon: TerminalIcon
      },
      {
        id: "bridge",
        label: "Typed preload bridge",
        detail: bridgeReady
          ? "Safe renderer bridge is live through window.synai."
          : "Waiting for the typed preload bridge.",
        complete: bridgeReady,
        icon: ShieldIcon
      },
      {
        id: "runtime",
        label: "Runtime services",
        detail: appHealth
          ? appHealth.awareness?.ready
            ? "Runtime health snapshot loaded and awareness is ready."
            : appHealth.awareness?.initializing
              ? "Runtime health loaded while awareness continues initializing."
              : "Main/runtime handshake completed."
          : "Querying the main process runtime state.",
        complete: runtimeReady,
        icon: ActivityIcon
      },
      {
        id: "model",
        label: "Local provider handshake",
        detail: modelHealth
          ? `${modelHealth.provider} responded with ${modelHealth.model} (${modelHealth.status}).`
          : "Waiting for the local provider and model scheduler.",
        complete: providerReady,
        error: modelHealth?.status === "disconnected" || modelHealth?.status === "error",
        icon: CpuIcon
      },
      {
        id: "memory",
        label: "Conversation restore",
        detail: conversationsReady
          ? `${conversationsCount} conversation${conversationsCount === 1 ? "" : "s"} restored and ready to load.`
          : "Restoring saved conversations and message state.",
        complete: conversationsReady,
        icon: DatabaseIcon
      },
      {
        id: "chat",
        label: "Chat surface ready",
        detail: bootSignalReady
          ? "Composer armed and ready for the live conversation loop."
          : "Waiting for the chat surface to finish arming.",
        complete: bootSignalReady || bootCompleted,
        icon: MessageIcon
      }
    ];

    const firstIncompleteIndex = stageState.findIndex((stage) => !stage.complete);
    return stageState.map((stage, index) => ({
      ...stage,
      active: firstIncompleteIndex === -1 ? index === stageState.length - 1 : index === firstIncompleteIndex
    }));
  }, [appHealth, bootCompleted, bootSignalReady, bridgeReady, conversationsCount, conversationsReady, modelHealth, runtimeReady, shellMounted]);

  useEffect(() => {
    setStageMoments((current) => {
      let next = current;
      for (const stage of stages) {
        if (stage.complete && !current[stage.id]) {
          if (next === current) {
            next = { ...current };
          }
          next[stage.id] = new Date().toISOString();
        }
      }
      return next;
    });
  }, [stages]);

  const completedStages = stages.filter((stage) => stage.complete).length;
  const progress = Math.round((completedStages / stages.length) * 100);
  const canRegenerate = messages.some((message) => message.role === "assistant");
  const showStartupDigest = Boolean(appHealth?.startupDigest) && messages.length === 0;
  const awarenessLabel =
    appHealth?.awareness?.ready
      ? "aware ready"
      : appHealth?.awareness?.initializing
        ? "aware init"
        : bootCompleted
          ? "chat ready"
          : "warming";
  const memoryLabel = conversationsReady ? `${conversationsCount} thread${conversationsCount === 1 ? "" : "s"}` : "restoring";

  const activityCopy =
    orbState === "thinking"
      ? "Planning reply"
      : orbState === "replying"
        ? "Streaming response"
        : orbState === "offline"
          ? "Provider offline"
          : orbState === "error"
            ? "Runtime attention needed"
            : orbState === "warming"
              ? "Runtime stabilizing"
              : "Conversation online";

  const compactStatusCopy =
    screenStatus?.assistMode.enabled
      ? `Assist active on ${screenStatus.targetLabel ?? screenStatus.scope ?? "the current target"}.`
      : "Local inference, memory, and governed tools are live.";
  const providerHeadline = modelHealth
    ? `${modelHealth.provider} / ${shortModelName(modelHealth.model)}`
    : "Provider pending";

  const submit = async (): Promise<void> => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setInput("");
    await onSendMessage(trimmed, {
      codingMode,
      highQualityMode,
      webMode,
      traceMode
    });
    setCodingMode("inherit");
    setHighQualityMode("inherit");
    setWebMode("inherit");
    setTraceMode("inherit");
  };


  return (
    <div className="h-full overflow-hidden bg-[#060816] text-white antialiased">
      <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_24%),linear-gradient(180deg,#08101f_0%,#070b16_48%,#060813_100%)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_28px,28px_100%] opacity-[0.06]" />
          <div className="synai-drift-one absolute left-[-20%] top-[8%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="synai-drift-two absolute bottom-[10%] right-[-25%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative flex h-full w-full items-stretch border-x border-white/6 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
          <div className="relative flex h-full w-full flex-col px-3 py-3 sm:px-4 sm:py-4">
            <header className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.36em] text-cyan-200/55">SynAI Runtime</p>
                <h1 className="mt-1 truncate text-sm font-medium text-white/90">
                  {bootCompleted ? "Conversation Core" : "Activation Sequence"}
                </h1>
              </div>
              <button
                type="button"
                aria-label="Open legacy settings"
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                onClick={() => onOpenLegacySurface("settings")}
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </header>

            <section className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="rounded-[26px] border border-white/8 bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                <div
                  className={cn(
                    "flex gap-3 transition-all duration-500",
                    bootCompleted ? "items-center" : "flex-col items-center text-center"
                  )}
                >
                  <Orb state={orbState} compact={bootCompleted} />
                  <div className={cn("min-w-0 transition-all duration-500", bootCompleted ? "flex-1 text-left" : "mt-1")}>
                    <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/50">
                      {bootCompleted ? "Core active" : "Local AI booting"}
                    </p>
                    <p className="mt-2 text-lg font-medium text-white/92">
                      {bootCompleted ? (conversation?.title ?? "Embodied conversation interface") : "Living control core coming online"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {bootCompleted
                        ? "The boot sequence has merged into the live chat loop. The orb now reflects current runtime activity."
                        : "Renderer, bridge, provider, and memory are synchronizing into one live surface."}
                    </p>
                  </div>
                </div>

                <div className={cn("overflow-hidden transition-all duration-500", bootCompleted ? "mt-3 max-h-24 opacity-100" : "mt-4 max-h-40 opacity-100")}>
                  <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/42">
                    <span>Readiness</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.45),rgba(34,211,238,0.95),rgba(139,92,246,0.78))] transition-[width] duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {bootCompleted ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <StatusPill
                      icon={ShieldIcon}
                      label="provider"
                      value={modelHealth ? modelHealth.provider : "pending"}
                      tone={modelHealth ? "good" : "neutral"}
                    />
                    <StatusPill
                      icon={CpuIcon}
                      label="model"
                      value={modelHealth ? shortModelName(modelHealth.model) : "pending"}
                      tone={modelHealth?.status === "connected" ? "good" : modelHealth?.status === "busy" ? "warn" : modelHealth ? "bad" : "neutral"}
                    />
                    <StatusPill icon={DatabaseIcon} label="context" value={memoryLabel} tone={conversationsReady ? "good" : "neutral"} />
                    <StatusPill
                      icon={ActivityIcon}
                      label="runtime"
                      value={activityCopy.toLowerCase()}
                      tone={orbState === "ready" || orbState === "replying" ? "good" : orbState === "thinking" || orbState === "warming" ? "warn" : orbState === "offline" || orbState === "error" ? "bad" : "neutral"}
                    />
                  </div>
                ) : null}
              </div>

              {!bootCompleted ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <StatusPill
                      icon={CpuIcon}
                      label="engine"
                      value={modelHealth ? shortModelName(modelHealth.model) : "warming"}
                      tone={modelHealth?.status === "connected" ? "good" : modelHealth?.status === "busy" ? "warn" : modelHealth ? "bad" : "neutral"}
                    />
                    <StatusPill
                      icon={SparkIcon}
                      label="state"
                      value={awarenessLabel}
                      tone={orbState === "offline" || orbState === "error" ? "bad" : "warn"}
                    />
                    <StatusPill icon={DatabaseIcon} label="memory" value={memoryLabel} tone={conversationsReady ? "good" : "neutral"} />
                  </div>

                  <TelemetryBand ready={false} />

                  <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-2.5">
                    <div className="space-y-2">
                      {stages.map((stage) => (
                        <BootRow key={stage.id} stage={stage} completedAt={stageMoments[stage.id]} />
                      ))}
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {error ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-cyan-300/12 bg-black/20 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">
                          <span>{activityCopy}</span>
                          <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85)]" />
                          <span>{providerHeadline}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-white/52">{compactStatusCopy}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                          onClick={() => void onNewConversation()}
                        >
                          New
                        </button>
                        <button
                          type="button"
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                          onClick={() => onOpenLegacySurface("history")}
                        >
                          History
                        </button>
                        <button
                          type="button"
                          className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                          onClick={() => onOpenLegacySurface("tools")}
                        >
                          Controls
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                    <div className="flex h-full min-h-0 flex-col">
                      <TelemetryBand ready />

                      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[22px] border border-white/8 bg-black/20 px-2 py-2">
                        {messages.length > 0 ? (
                          <MessageList
                            messages={messages}
                            loading={loading}
                            pendingAssistantId={pendingAssistantId}
                            pendingReasoningTrace={pendingReasoningTrace}
                            className="h-full"
                          />
                        ) : (
                          <div className="flex h-full flex-col justify-center gap-4 px-3 py-4">
                            {showStartupDigest && appHealth?.startupDigest ? (
                              <AwarenessCard card={buildStartupDigestCard(appHealth.startupDigest)} />
                            ) : null}
                            <div>
                              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/55">Conversation online</p>
                              <p className="mt-2 text-lg font-medium text-white/92">The loading experience is now the chat surface.</p>
                              <p className="mt-2 text-sm leading-6 text-white/52">
                                The existing governed chat runtime is ready. Send a message to continue inside the same persisted conversation engine.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={input}
                        rows={2}
                        disabled={loading}
                        placeholder="Message the live local runtime..."
                        className="min-h-[72px] w-full resize-none rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={async (event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            await submit();
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={loading || !input.trim()}
                        className="rounded-[20px] border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void submit()}
                      >
                        Send
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          {
                            label: formatToggle("Coding", codingMode, settings.codingModeEnabled),
                            onClick: () => setCodingMode((current) => nextToggleMode(current))
                          },
                          {
                            label: formatToggle("HQ", highQualityMode, settings.highQualityModeEnabled),
                            onClick: () => setHighQualityMode((current) => nextToggleMode(current))
                          },
                          {
                            label: formatToggle("Web", webMode, settings.defaultWebSearch && settings.webInRagEnabled),
                            onClick: () => setWebMode((current) => nextToggleMode(current))
                          },
                          {
                            label: formatToggle("Trace", traceMode, settings.liveTraceVisible),
                            onClick: () => setTraceMode((current) => nextToggleMode(current))
                          }
                        ].map((toggle) => (
                          <button
                            key={toggle.label}
                            type="button"
                            disabled={loading}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/72 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={toggle.onClick}
                          >
                            {toggle.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/40">
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/68 transition hover:bg-white/[0.08] hover:text-white"
                          onClick={() => void onClearConversation()}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          disabled={!canRegenerate}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/68 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void onRegenerate()}
                        >
                          Regenerate
                        </button>
                        <span>Press Enter to send. Shift+Enter for newline.</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
