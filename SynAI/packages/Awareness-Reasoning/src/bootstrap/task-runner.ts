export interface BackgroundTaskRunnerHealth {
  status: "idle" | "running";
  activeTask: string | null;
  queueDepth: number;
  lastCompletedAt: string | null;
  lastError: string | null;
  recentDurationsMs: Record<string, number>;
}

export interface BackgroundTaskRunner {
  run<T>(label: string, task: () => Promise<T>): Promise<T>;
  getHealth(): BackgroundTaskRunnerHealth;
}

export const createBackgroundTaskRunner = (
  now: () => Date = () => new Date()
): BackgroundTaskRunner => {
  let chain = Promise.resolve();
  let activeTask: string | null = null;
  let queueDepth = 0;
  let lastCompletedAt: string | null = null;
  let lastError: string | null = null;
  const recentDurationsMs: Record<string, number> = {};

  const getHealth = (): BackgroundTaskRunnerHealth => ({
    status: activeTask ? "running" : "idle",
    activeTask,
    queueDepth,
    lastCompletedAt,
    lastError,
    recentDurationsMs: { ...recentDurationsMs }
  });

  return {
    run<T>(label: string, task: () => Promise<T>): Promise<T> {
      queueDepth += 1;
      const startedAtMs = Date.now();
      const next = chain.then(async () => {
        queueDepth = Math.max(0, queueDepth - 1);
        activeTask = label;
        try {
          const result = await task();
          lastError = null;
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          throw error;
        } finally {
          activeTask = null;
          lastCompletedAt = now().toISOString();
          recentDurationsMs[label] = Math.max(0, Date.now() - startedAtMs);
        }
      });

      chain = next.catch(() => undefined);
      return next;
    },
    getHealth
  };
};
