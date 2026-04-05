import { getSessionHints, updateSessionHints } from "../../../portable_lib/brain-session-store.mjs";

function now() {
  return Date.now();
}

function keyFor(ns, key) {
  return `${String(ns || "default")}:${String(key)}`;
}

function compactSnapshot(entries) {
  return entries.map(([cacheKey, item]) => [cacheKey, { value: item.value, expiresAt: item.expiresAt }]);
}

export function createBrainMemoryCache({ namespace = "brain", sessionId = null } = {}) {
  const store = new Map();

  function cleanupExpired() {
    const stamp = now();
    for (const [cacheKey, item] of store.entries()) {
      if (item.expiresAt !== null && item.expiresAt <= stamp) {
        store.delete(cacheKey);
      }
    }
  }

  function persist() {
    if (!sessionId) return;
    const snapshot = compactSnapshot(store.entries());
    updateSessionHints(sessionId, {
      lastSource: `${namespace}:cache`,
      lastNormalized: JSON.stringify({ namespace, snapshot }).slice(0, 6000),
    });
  }

  function set(key, value, ttlMs) {
    const expiresAt = Number.isFinite(ttlMs) && ttlMs > 0 ? now() + ttlMs : null;
    store.set(keyFor(namespace, key), { value, expiresAt });
    persist();
    return value;
  }

  function get(key) {
    cleanupExpired();
    const item = store.get(keyFor(namespace, key));
    if (!item) return undefined;
    if (item.expiresAt !== null && item.expiresAt <= now()) {
      store.delete(keyFor(namespace, key));
      persist();
      return undefined;
    }
    return item.value;
  }

  function has(key) {
    return typeof get(key) !== "undefined";
  }

  function evict(key) {
    const removed = store.delete(keyFor(namespace, key));
    persist();
    return removed;
  }

  function clear(ns = null) {
    if (ns && ns !== namespace) return 0;
    const size = store.size;
    store.clear();
    persist();
    return size;
  }

  function snapshot() {
    cleanupExpired();
    return {
      namespace,
      size: store.size,
      entries: [...store.entries()].map(([cacheKey, item]) => ({
        key: cacheKey,
        value: item.value,
        expiresAt: item.expiresAt,
      })),
      sessionHints: sessionId ? getSessionHints(sessionId) : null,
    };
  }

  return Object.freeze({ set, get, has, evict, clear, snapshot });
}

export function createSharedBrainMemoryCache() {
  return createBrainMemoryCache({ namespace: "shared" });
}