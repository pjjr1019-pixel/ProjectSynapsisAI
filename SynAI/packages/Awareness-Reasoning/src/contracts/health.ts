import type { AwarenessStartupDigest } from "./awareness";

export type HealthStatus = "connected" | "disconnected" | "busy" | "error";

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
}

export interface AppHealth {
  status: "ok";
  startedAt: string;
  version: string;
  awareness?: AwarenessRuntimeHealth;
  startupDigest?: AwarenessStartupDigest | null;
}
