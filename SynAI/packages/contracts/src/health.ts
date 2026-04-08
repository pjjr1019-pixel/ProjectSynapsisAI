export type HealthStatus = "connected" | "disconnected" | "busy" | "error";

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
}
