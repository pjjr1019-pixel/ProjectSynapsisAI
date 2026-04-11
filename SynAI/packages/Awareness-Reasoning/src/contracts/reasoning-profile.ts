export const REASONING_PROFILES = ["chat", "research", "action"] as const;
export type ReasoningProfile = (typeof REASONING_PROFILES)[number];

export const PLANNING_POLICIES = ["off", "auto", "forced"] as const;
export type PlanningPolicy = (typeof PLANNING_POLICIES)[number];

export const DEFAULT_REASONING_PROFILE: ReasoningProfile = "chat";

export const isReasoningProfile = (value: unknown): value is ReasoningProfile =>
  typeof value === "string" && (REASONING_PROFILES as readonly string[]).includes(value);

export const isPlanningPolicy = (value: unknown): value is PlanningPolicy =>
  typeof value === "string" && (PLANNING_POLICIES as readonly string[]).includes(value);
