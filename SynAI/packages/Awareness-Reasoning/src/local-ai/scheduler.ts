import type { ModelLoadEvent, ModelSchedulerStatus, RuntimeSelectionSummary } from "../contracts/health";
import type { RuntimeTaskClass } from "../contracts/rag";
import type { OllamaConfig } from "./ollama";
import { PHASE_6_ESCALATION_POLICY, getEscalationModel, ESCALATION_MODEL_KEEP_ALIVE_MS } from "./escalation-config";

export interface ScheduledLocalAIOptions extends Partial<OllamaConfig> {
  taskClass?: RuntimeTaskClass;
  reason?: string;
  codingMode?: boolean;
  highQualityMode?: boolean;
  visionUsed?: boolean;
  // Phase 6: Escalation support
  escalationModel?: string; // If set, use escalation model instead of default
  escalationReason?: string; // Why escalation was triggered
}

interface ScheduledLocalAISelection {
  config: OllamaConfig;
  summary: RuntimeSelectionSummary;
}

const DEFAULT_KEEP_ALIVE_MS = 120_000;
const DEFAULT_EMBED_KEEP_ALIVE_MS = 15_000;
const DEFAULT_VISION_KEEP_ALIVE_MS = 0;
const MAX_RECENT_EVENTS = 8;

let chain: Promise<void> = Promise.resolve();
let queueDepth = 0;
let activeModel: string | null = null;
let activeTaskClass: RuntimeTaskClass | null = null;
let keepAliveExpiresAt: string | null = null;
let loadedModels: string[] = [];
let lastRuntimeSelection: RuntimeSelectionSummary | null = null;
const recentEvents: ModelLoadEvent[] = [];

const recordEvent = (event: ModelLoadEvent): void => {
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.length = MAX_RECENT_EVENTS;
  }
};

const getKeepAliveMs = (taskClass: RuntimeTaskClass, isEscalationModel: boolean = false): number => {
  // Escalation models have 0ms keep-alive: unload immediately after task
  if (isEscalationModel) {
    return ESCALATION_MODEL_KEEP_ALIVE_MS;
  }
  if (taskClass === "embedding") {
    return Number(process.env.OLLAMA_EMBED_KEEP_ALIVE_MS ?? DEFAULT_EMBED_KEEP_ALIVE_MS);
  }
  if (taskClass === "vision") {
    return Number(process.env.OLLAMA_VISION_KEEP_ALIVE_MS ?? DEFAULT_VISION_KEEP_ALIVE_MS);
  }
  return Number(process.env.OLLAMA_KEEP_ALIVE_MS ?? DEFAULT_KEEP_ALIVE_MS);
};

const maybeExpireActiveModel = (): void => {
  if (!keepAliveExpiresAt || !activeModel) {
    return;
  }
  if (Date.parse(keepAliveExpiresAt) > Date.now()) {
    return;
  }

  recordEvent({
    kind: "unload",
    model: activeModel,
    taskClass: activeTaskClass ?? "general",
    reason: "keep-alive-expired",
    happenedAt: new Date().toISOString()
  });
  activeModel = null;
  activeTaskClass = null;
  keepAliveExpiresAt = null;
  loadedModels = [];
};

export const getLocalAISchedulerStatus = (): ModelSchedulerStatus => {
  maybeExpireActiveModel();
  return {
    activeModel,
    activeTaskClass,
    queueDepth,
    keepAliveExpiresAt,
    loadedModels: [...loadedModels],
    recentEvents: [...recentEvents]
  };
};

export const getLastRuntimeSelection = (): RuntimeSelectionSummary | null => {
  maybeExpireActiveModel();
  return lastRuntimeSelection ? { ...lastRuntimeSelection } : null;
};

export const setLocalAISchedulerLoadedModels = (models: string[]): void => {
  loadedModels = [...new Set(models.filter(Boolean))];
};

export const resetLocalAISchedulerState = (): void => {
  chain = Promise.resolve();
  queueDepth = 0;
  activeModel = null;
  activeTaskClass = null;
  keepAliveExpiresAt = null;
  loadedModels = [];
  lastRuntimeSelection = null;
  recentEvents.length = 0;
};

export const resolveScheduledLocalAISelection = (
  baseConfig: OllamaConfig,
  options: ScheduledLocalAIOptions = {}
): ScheduledLocalAISelection => {
  maybeExpireActiveModel();
  const taskClass = options.taskClass ?? "general";
  const requestedModel = options.model?.trim() || null;
  const defaultCodeModel = process.env.OLLAMA_CODE_MODEL?.trim() || null;
  const defaultVisionModel = process.env.OLLAMA_VISION_MODEL?.trim() || null;
  
  // Phase 6: Check if escalation model should be used
  const isEscalationTask = Boolean(options.escalationModel);
  const resolvedModel = isEscalationTask
    ? options.escalationModel!  // Use escalation model if explicitly provided
    : taskClass === "embedding"
      ? baseConfig.embedModel ?? requestedModel ?? ""
      : taskClass === "code"
        ? defaultCodeModel ?? requestedModel ?? baseConfig.model
      : taskClass === "vision"
        ? defaultVisionModel ?? requestedModel ?? baseConfig.model
        : requestedModel ?? baseConfig.model;
  
  const keepAliveMs = getKeepAliveMs(taskClass, isEscalationTask);
  const reusedActiveModel = activeModel === resolvedModel;
  const reason =
    options.escalationReason ||
    (options.reason ?? 
      (taskClass === "embedding"
        ? "embedding request"
        : reusedActiveModel
          ? "reuse active model"
          : activeModel
            ? "swap active model for task"
            : "load model for task"));

  return {
    config: {
      ...baseConfig,
      model: resolvedModel
    },
    summary: {
      taskClass,
      model: resolvedModel,
      requestedModel,
      reason,
      keepAliveMs,
      queueDepth: Math.max(1, queueDepth),
      reusedActiveModel,
      codingMode: Boolean(options.codingMode),
      highQualityMode: Boolean(options.highQualityMode),
      visionUsed: Boolean(options.visionUsed)
    }
  };
};

export const withScheduledLocalAITask = async <T>(
  selection: ScheduledLocalAISelection,
  execute: (selection: ScheduledLocalAISelection) => Promise<T>
): Promise<{ result: T; selection: RuntimeSelectionSummary }> => {
  const previous = chain;
  let release: (() => void) | null = null;
  chain = new Promise<void>((resolve) => {
    release = resolve;
  });
  queueDepth += 1;

  try {
    await previous;
    maybeExpireActiveModel();
    const now = new Date().toISOString();
    const eventKind: ModelLoadEvent["kind"] =
      !activeModel ? "load" : activeModel === selection.summary.model ? "reuse" : "swap";
    recordEvent({
      kind: eventKind,
      model: selection.summary.model,
      taskClass: selection.summary.taskClass,
      reason: selection.summary.reason,
      happenedAt: now
    });
    activeModel = selection.summary.model;
    activeTaskClass = selection.summary.taskClass;
    keepAliveExpiresAt =
      selection.summary.keepAliveMs > 0
        ? new Date(Date.now() + selection.summary.keepAliveMs).toISOString()
        : null;
    loadedModels = [selection.summary.model];
    lastRuntimeSelection = { ...selection.summary, queueDepth: queueDepth };

    const result = await execute({
      ...selection,
      summary: {
        ...selection.summary,
        queueDepth
      }
    });

    if (selection.summary.keepAliveMs <= 0) {
      recordEvent({
        kind: "unload",
        model: selection.summary.model,
        taskClass: selection.summary.taskClass,
        reason: "no keep-alive",
        happenedAt: new Date().toISOString()
      });
      activeModel = null;
      activeTaskClass = null;
      keepAliveExpiresAt = null;
      loadedModels = [];
    }

    return {
      result,
      selection: lastRuntimeSelection ?? selection.summary
    };
  } finally {
    queueDepth = Math.max(0, queueDepth - 1);
    release?.();
  }
};
