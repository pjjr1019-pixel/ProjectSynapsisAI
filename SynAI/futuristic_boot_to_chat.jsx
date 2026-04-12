import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronRight,
  Cpu,
  Database,
  MemoryStick,
  MessageSquare,
  Settings,
  Sparkles,
  TerminalSquare,
  Waves,
} from "lucide-react";

type BootPhase = {
  id: string;
  label: string;
  detail: string;
  duration: number;
  icon: React.ComponentType<{ className?: string }>;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const BOOT_PHASES: BootPhase[] = [
  {
    id: "runtime",
    label: "Runtime bootstrap",
    detail: "Initializing local execution spine and guarded interfaces.",
    duration: 950,
    icon: TerminalSquare,
  },
  {
    id: "model",
    label: "Local model warmup",
    detail: "Loading inference provider, scheduler, and response policies.",
    duration: 1200,
    icon: Cpu,
  },
  {
    id: "memory",
    label: "Memory sync",
    detail: "Rehydrating recent conversations, summaries, and working context.",
    duration: 900,
    icon: MemoryStick,
  },
  {
    id: "knowledge",
    label: "Knowledge lattice",
    detail: "Binding retrieval surfaces, message traces, and grounding layers.",
    duration: 1050,
    icon: Database,
  },
  {
    id: "ui",
    label: "UI activation",
    detail: "Hydrating interface shell and enabling live conversation mode.",
    duration: 850,
    icon: Waves,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    content:
      "Core systems are online. Context is stable. You can begin when ready.",
  },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useBootSequence(phases: BootPhase[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timeout = 0;
    let mounted = true;

    const runPhase = (index: number) => {
      if (!mounted) return;
      if (index >= phases.length) {
        setProgress(100);
        timeout = window.setTimeout(() => {
          if (mounted) setIsReady(true);
        }, 350);
        return;
      }

      setActiveIndex(index);
      const phase = phases[index];
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const ratio = Math.min(elapsed / phase.duration, 1);
        const completedWeight = index / phases.length;
        const currentWeight = ratio / phases.length;
        setProgress((completedWeight + currentWeight) * 100);

        if (ratio < 1) {
          raf = window.requestAnimationFrame(tick);
        } else {
          setCompletedIds((prev) => [...prev, phase.id]);
          timeout = window.setTimeout(() => runPhase(index + 1), 140);
        }
      };

      raf = window.requestAnimationFrame(tick);
    };

    runPhase(0);

    return () => {
      mounted = false;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [phases]);

  return { activeIndex, completedIds, progress, isReady };
}

function Orb({ ready, compact }: { ready: boolean; compact?: boolean }) {
  return (
    <div className={cn("relative flex items-center justify-center", compact ? "h-24 w-24" : "h-52 w-52")}>
      <motion.div
        className="absolute inset-0 rounded-full border border-cyan-400/20"
        animate={{
          rotate: 360,
          scale: ready ? [1, 1.06, 1] : [1, 1.02, 1],
        }}
        transition={{
          rotate: { duration: 22, repeat: Infinity, ease: "linear" },
          scale: { duration: ready ? 1.8 : 2.6, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <div className="absolute inset-3 rounded-full border border-cyan-300/20" />
        <div className="absolute inset-8 rounded-full border border-violet-300/15" />
      </motion.div>

      <motion.div
        className="absolute rounded-full bg-cyan-400/20 blur-3xl"
        style={{ width: compact ? 72 : 180, height: compact ? 72 : 180 }}
        animate={{
          opacity: ready ? [0.45, 0.9, 0.55] : [0.25, 0.45, 0.3],
          scale: ready ? [1, 1.18, 1.04] : [0.92, 1.04, 0.96],
        }}
        transition={{ duration: ready ? 1.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full bg-violet-500/20 blur-2xl"
        style={{ width: compact ? 56 : 128, height: compact ? 56 : 128 }}
        animate={{
          opacity: ready ? [0.25, 0.65, 0.35] : [0.15, 0.35, 0.2],
          scale: ready ? [1, 1.16, 1.02] : [0.96, 1.04, 0.98],
        }}
        transition={{ duration: ready ? 1.3 : 2.1, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.45),rgba(34,211,238,0.18)_28%,rgba(10,15,30,0.92)_72%)] shadow-[0_0_40px_rgba(34,211,238,0.25),inset_0_0_30px_rgba(255,255,255,0.12)]"
        style={{ width: compact ? 62 : 136, height: compact ? 62 : 136 }}
        animate={{
          boxShadow: ready
            ? [
                "0 0 35px rgba(34,211,238,0.25), inset 0 0 22px rgba(255,255,255,0.10)",
                "0 0 80px rgba(34,211,238,0.52), inset 0 0 28px rgba(255,255,255,0.16)",
                "0 0 50px rgba(139,92,246,0.38), inset 0 0 24px rgba(255,255,255,0.12)",
              ]
            : [
                "0 0 25px rgba(34,211,238,0.18), inset 0 0 18px rgba(255,255,255,0.08)",
                "0 0 45px rgba(34,211,238,0.28), inset 0 0 22px rgba(255,255,255,0.10)",
                "0 0 28px rgba(139,92,246,0.18), inset 0 0 18px rgba(255,255,255,0.09)",
              ],
        }}
        transition={{ duration: ready ? 1.4 : 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-[18%] rounded-full border border-cyan-200/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-[28%] rounded-full border border-violet-200/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/65 blur-md"
          animate={{ scale: ready ? [1, 1.15, 1.04] : [0.95, 1.02, 0.98] }}
          transition={{ duration: ready ? 1.2 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.75)]"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(${compact ? -42 : -84}px)`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

function TelemetryBand({ ready }: { ready: boolean }) {
  const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">
        <span>telemetry</span>
        <span>{ready ? "conversation online" : "stabilizing runtime"}</span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {bars.map((bar) => (
          <motion.div
            key={bar}
            className="w-full rounded-full bg-cyan-300/65"
            animate={{
              height: ready
                ? [20 + (bar % 6) * 2, 10 + (bar % 10) * 2, 26 + (bar % 4) * 3]
                : [8 + (bar % 7) * 2, 18 + (bar % 4) * 3, 12 + (bar % 8) * 2],
              opacity: ready ? [0.4, 1, 0.55] : [0.2, 0.7, 0.35],
            }}
            transition={{
              duration: 1.2 + (bar % 6) * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: bar * 0.03,
            }}
          />
        ))}
      </div>
      <motion.div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-cyan-300/10 via-cyan-300/0 to-transparent"
        animate={{ x: [0, 240, 0] }}
        transition={{ duration: ready ? 2.8 : 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function BootRow({ phase, active, complete }: { phase: BootPhase; active: boolean; complete: boolean }) {
  const Icon = phase.icon;

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border px-3 py-3 transition-colors",
        complete
          ? "border-cyan-400/20 bg-cyan-400/[0.06]"
          : active
            ? "border-cyan-300/25 bg-white/[0.06]"
            : "border-white/8 bg-white/[0.03]"
      )}
      animate={{ scale: active ? 1.01 : 1, opacity: complete || active ? 1 : 0.7 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 rounded-xl border p-2",
            complete
              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
              : active
                ? "border-violet-300/20 bg-violet-300/10 text-violet-200"
                : "border-white/10 bg-white/[0.04] text-white/55"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white/90">{phase.label}</p>
            <div
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.22em]",
                complete
                  ? "bg-cyan-300/10 text-cyan-200/80"
                  : active
                    ? "bg-violet-300/10 text-violet-200/80"
                    : "bg-white/[0.05] text-white/40"
              )}
            >
              {complete ? "done" : active ? "active" : "queued"}
            </div>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">{phase.detail}</p>
        </div>
      </div>

      {active && (
        <motion.div
          className="absolute bottom-0 left-0 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/80 to-cyan-300/0"
          initial={{ width: "0%", opacity: 0.2 }}
          animate={{ width: ["0%", "100%"], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: phase.duration / 1000, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}

function StatusPill({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-white/35">
        <Icon className="h-3.5 w-3.5 text-cyan-200/65" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      layout
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -8, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isAssistant ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6",
          isAssistant
            ? "border border-cyan-300/15 bg-cyan-300/[0.08] text-white/88 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
            : "border border-violet-300/15 bg-violet-300/[0.10] text-white/92 shadow-[0_0_24px_rgba(139,92,246,0.08)]"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

export default function FuturisticBootToChat() {
  const { activeIndex, completedIds, progress, isReady } = useBootSequence(BOOT_PHASES);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isReady]);

  const handleSend = () => {
    const value = input.trim();
    if (!value) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: value,
    };

    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content:
        "Input received. Runtime is stable and ready for local reasoning, context assembly, and response generation.",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-[#060816] text-white antialiased">
      <div className="relative mx-auto flex min-h-screen max-w-[440px] items-stretch border-x border-white/6 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_28%),linear-gradient(180deg,#08101f_0%,#070b16_48%,#060813_100%)] shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_28px,28px_100%] opacity-[0.06]" />
          <motion.div
            className="absolute left-[-20%] top-[8%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
            animate={{ x: [0, 40, -10, 0], y: [0, 20, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[10%] right-[-25%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"
            animate={{ x: [0, -30, 15, 0], y: [0, -20, 10, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative flex w-full flex-col px-4 py-4 sm:px-5 sm:py-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.36em] text-cyan-200/55">SynAI Runtime</p>
              <h1 className="mt-1 text-sm font-medium text-white/90">
                {isReady ? "Conversation Core" : "Activation Sequence"}
              </h1>
            </div>
            <button className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white">
              <Settings className="h-4 w-4" />
            </button>
          </header>

          <AnimatePresence mode="wait">
            {!isReady ? (
              <motion.section
                key="boot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18, scale: 0.985 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="rounded-[28px] border border-white/8 bg-white/[0.035] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                  <div className="flex flex-col items-center">
                    <motion.div layoutId="orb-shell" transition={{ type: "spring", stiffness: 120, damping: 20 }}>
                      <Orb ready={false} />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: [0.4, 0.8, 0.55] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="mt-4 text-center"
                    >
                      <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/50">Local AI booting</p>
                      <p className="mt-2 text-lg font-medium text-white/92">Living control core coming online</p>
                      <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-6 text-white/50">
                        Local model, memory, and UI layers are synchronizing into a single active surface.
                      </p>
                    </motion.div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/42">
                      <span>readiness</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.4),rgba(34,211,238,0.95),rgba(139,92,246,0.75))]"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatusPill icon={Cpu} label="engine" value="local" />
                  <StatusPill icon={Sparkles} label="state" value="warming" />
                  <StatusPill icon={Bot} label="mode" value="boot" />
                </div>

                <div className="mt-4 flex-1 space-y-3 overflow-hidden">
                  <TelemetryBand ready={false} />
                  <div className="space-y-2 overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] p-2.5">
                    {BOOT_PHASES.map((phase, index) => (
                      <BootRow
                        key={phase.id}
                        phase={phase}
                        active={index === activeIndex}
                        complete={completedIds.includes(phase.id)}
                      />
                    ))}
                  </div>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="chat"
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                  <div className="flex items-center gap-3 rounded-[22px] border border-cyan-300/12 bg-black/20 px-3 py-3">
                    <motion.div layoutId="orb-shell" transition={{ type: "spring", stiffness: 120, damping: 20 }}>
                      <Orb ready compact />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">
                        <span>core active</span>
                        <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.85)]" />
                        <span>local inference ready</span>
                      </div>
                      <h2 className="mt-1 text-base font-medium text-white/92">Embodied conversation interface</h2>
                      <p className="mt-1 text-sm leading-6 text-white/52">
                        The runtime has transitioned into live chat. The orb now reflects active reasoning state.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatusPill icon={MessageSquare} label="surface" value="chat" />
                  <StatusPill icon={Database} label="memory" value="bound" />
                  <StatusPill icon={Cpu} label="engine" value="ready" />
                </div>

                <div className="mt-4 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03] p-3">
                  <TelemetryBand ready />

                  <div
                    ref={viewportRef}
                    className="mt-3 flex h-[calc(100%-4.5rem)] flex-col gap-3 overflow-y-auto pr-1"
                  >
                    <AnimatePresence initial={false}>
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-4 rounded-[28px] border border-white/8 bg-white/[0.035] p-3 backdrop-blur-xl">
                  <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-black/20 p-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Talk to the local AI…"
                      className="max-h-32 min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white/90 outline-none placeholder:text-white/28"
                    />
                    <button
                      onClick={handleSend}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/18"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
