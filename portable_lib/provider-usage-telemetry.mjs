import process from "node:process";

const providerStates = new Map();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") {
    return toText(headers.get(name));
  }
  if (typeof headers === "object" && headers !== null) {
    return toText(headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()]);
  }
  return "";
}

function parseResetAt(value) {
  const raw = toText(value);
  if (!raw) return null;
  const numeric = toNumber(raw);
  if (numeric !== null) {
    if (numeric > 1_000_000_000_000) return new Date(numeric).toISOString();
    if (numeric > 1_000_000_000) return new Date(numeric * 1000).toISOString();
    return new Date(Date.now() + numeric * 1000).toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseRateLimits(headers, statusCode = 0) {
  const requestLimit =
    toNumber(getHeader(headers, "x-ratelimit-limit-requests")) ??
    toNumber(getHeader(headers, "ratelimit-limit")) ??
    toNumber(getHeader(headers, "x-ratelimit-limit"));
  const requestRemaining =
    toNumber(getHeader(headers, "x-ratelimit-remaining-requests")) ??
    toNumber(getHeader(headers, "ratelimit-remaining")) ??
    toNumber(getHeader(headers, "x-ratelimit-remaining"));
  const requestReset =
    parseResetAt(getHeader(headers, "x-ratelimit-reset-requests")) ??
    parseResetAt(getHeader(headers, "ratelimit-reset")) ??
    parseResetAt(getHeader(headers, "x-ratelimit-reset"));

  const tokenLimit = toNumber(getHeader(headers, "x-ratelimit-limit-tokens"));
  const tokenRemaining = toNumber(getHeader(headers, "x-ratelimit-remaining-tokens"));
  const tokenReset = parseResetAt(getHeader(headers, "x-ratelimit-reset-tokens"));
  const retryAfterSeconds = toNumber(getHeader(headers, "retry-after"));

  let state = "not_available";
  if (statusCode === 429 || retryAfterSeconds) {
    state = "rate_limited";
  } else if (
    (requestLimit && requestRemaining !== null) ||
    (tokenLimit && tokenRemaining !== null) ||
    requestReset ||
    tokenReset
  ) {
    state = "ok";
    if (
      (requestLimit && requestRemaining !== null && requestLimit > 0 && requestRemaining / requestLimit <= 0.1) ||
      (tokenLimit && tokenRemaining !== null && tokenLimit > 0 && tokenRemaining / tokenLimit <= 0.1)
    ) {
      state = "near_limit";
    }
  }

  return {
    state,
    requests: { limit: requestLimit, remaining: requestRemaining, resetAt: requestReset },
    tokens: { limit: tokenLimit, remaining: tokenRemaining, resetAt: tokenReset },
    retryAfterSeconds,
  };
}

function ensureState(key, meta = {}) {
  const existing = providerStates.get(key);
  if (existing) return existing;
  const created = {
    key,
    provider: meta.provider || key,
    model: meta.model || null,
    kind: meta.kind || "provider",
    status: "unknown",
    available: false,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: null,
    lastStatusCode: null,
    lastDurationMs: null,
    rateLimits: {
      state: "not_available",
      requests: { limit: null, remaining: null, resetAt: null },
      tokens: { limit: null, remaining: null, resetAt: null },
      retryAfterSeconds: null,
    },
  };
  providerStates.set(key, created);
  return created;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function recordProviderSuccess(input = {}) {
  const key = toText(input.key) || "provider";
  const previous = ensureState(key, input);
  const now = new Date().toISOString();
  const next = {
    ...previous,
    provider: input.provider || previous.provider,
    model: input.model ?? previous.model,
    kind: input.kind || previous.kind,
    status: parseRateLimits(input.headers, input.statusCode).state === "rate_limited" ? "rate_limited" : "online",
    available: true,
    lastAttemptAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastStatusCode: input.statusCode ?? previous.lastStatusCode,
    lastDurationMs: Number.isFinite(Number(input.durationMs)) ? Math.max(0, Number(input.durationMs)) : previous.lastDurationMs,
    rateLimits: parseRateLimits(input.headers, input.statusCode),
  };
  providerStates.set(key, next);
  return clone(next);
}

export function recordProviderFailure(input = {}) {
  const key = toText(input.key) || "provider";
  const previous = ensureState(key, input);
  const now = new Date().toISOString();
  const rateLimits = parseRateLimits(input.headers, input.statusCode);
  const next = {
    ...previous,
    provider: input.provider || previous.provider,
    model: input.model ?? previous.model,
    kind: input.kind || previous.kind,
    status: input.statusCode === 429 || rateLimits.state === "rate_limited" ? "rate_limited" : "error",
    available: false,
    lastAttemptAt: now,
    lastErrorAt: now,
    lastError: toText(input.error) || "provider_error",
    lastStatusCode: input.statusCode ?? previous.lastStatusCode,
    lastDurationMs: Number.isFinite(Number(input.durationMs)) ? Math.max(0, Number(input.durationMs)) : previous.lastDurationMs,
    rateLimits,
  };
  providerStates.set(key, next);
  return clone(next);
}

export function getProviderUsageSnapshot(key) {
  const normalizedKey = toText(key);
  if (!normalizedKey) return null;
  const state = providerStates.get(normalizedKey);
  return state ? clone(state) : null;
}

export function listProviderUsageSnapshots() {
  return [...providerStates.values()].map((value) => clone(value));
}

export function resetProviderUsageTelemetry() {
  if (process.env.NODE_ENV === "production") return;
  providerStates.clear();
}
