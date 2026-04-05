function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export async function retryBrainOperation({ fn, maxAttempts = 3, backoff = "linear", delayMs = 250 } = {}) {
  if (typeof fn !== "function") {
    throw new Error("retryBrainOperation: fn must be a function");
  }

  let attempts = 0;
  let lastError = null;

  while (attempts < Math.max(1, maxAttempts)) {
    attempts += 1;
    try {
      const result = await fn({ attempt: attempts });
      return { result, attempts, succeeded: true, lastError: null };
    } catch (error) {
      lastError = error;
      if (attempts >= maxAttempts) break;
      const factor = backoff === "exponential" ? Math.pow(2, attempts - 1) : attempts;
      await wait(delayMs * factor);
    }
  }

  return {
    result: null,
    attempts,
    succeeded: false,
    lastError: String(lastError?.message || lastError || "unknown error"),
  };
}

export function createRetryController(config = {}) {
  return (fn) => retryBrainOperation({ fn, ...config });
}