export const createBackgroundTaskRunner = (now = () => new Date()) => {
    let chain = Promise.resolve();
    let activeTask = null;
    let queueDepth = 0;
    let lastCompletedAt = null;
    let lastError = null;
    const recentDurationsMs = {};
    const getHealth = () => ({
        status: activeTask ? "running" : "idle",
        activeTask,
        queueDepth,
        lastCompletedAt,
        lastError,
        recentDurationsMs: { ...recentDurationsMs }
    });
    return {
        run(label, task) {
            queueDepth += 1;
            const startedAtMs = Date.now();
            const next = chain.then(async () => {
                queueDepth = Math.max(0, queueDepth - 1);
                activeTask = label;
                try {
                    const result = await task();
                    lastError = null;
                    return result;
                }
                catch (error) {
                    lastError = error instanceof Error ? error.message : String(error);
                    throw error;
                }
                finally {
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
