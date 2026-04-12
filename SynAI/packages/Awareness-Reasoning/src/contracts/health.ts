import type { AwarenessStartupDigest } from "./awareness";
import type { RuntimeTaskClass } from "./rag";

export type HealthStatus = "connected" | "disconnected" | "busy" | "error";

export type ModelLoadEventKind = "load" | "reuse" | "swap" | "unload";

export interface ModelLoadEvent {
  kind: ModelLoadEventKind;
  model: string;
  taskClass: RuntimeTaskClass;
  reason: string;
  happenedAt: string;
}

export interface RuntimeSelectionSummary {
  taskClass: RuntimeTaskClass;
  model: string;
  requestedModel: string | null;
  reason: string;
  keepAliveMs: number;
  queueDepth: number;
  reusedActiveModel: boolean;
  codingMode: boolean;
  highQualityMode: boolean;
  visionUsed: boolean;
}

export interface ModelSchedulerStatus {
  activeModel: string | null;
  activeTaskClass: RuntimeTaskClass | null;
  queueDepth: number;
  keepAliveExpiresAt: string | null;
  loadedModels: string[];
  recentEvents: ModelLoadEvent[];
}

export interface AwarenessRuntimeHealth {
  initializing: boolean;
  ready: boolean;
  inFlightTargets: string[];
  backgroundWorkerStatus?: "idle" | "running";
  backgroundWorkerTask?: string | null;
  backgroundWorkerQueueDepth?: number;
  backgroundWorkerLastCompletedAt?: string | null;
  backgroundWorkerLastError?: string | null;
  recentDurationsMs?: Record<string, number>;
  lastInitDurationMs?: number | null;
  backgroundSamplerActive?: boolean;
  lastSampledAt?: string | null;
  samplerIntervalsMs?: Record<string, number>;
  startupDigestReady?: boolean;
  officialKnowledgeReady?: boolean;
  officialKnowledgeDocCount?: number;
  officialKnowledgeLastRefreshedAt?: string | null;
  volumeMonitorHealthy?: boolean;
}

export interface ModelHealth {
  status: HealthStatus;
  provider: "ollama";
  model: string;
  baseUrl: string;
  detail?: string;
  checkedAt: string;
  scheduler?: ModelSchedulerStatus | null;
}

export interface AppHealth {
  status: "ok";
  startedAt: string;
  version: string;
  awareness?: AwarenessRuntimeHealth;
  startupDigest?: AwarenessStartupDigest | null;
}
