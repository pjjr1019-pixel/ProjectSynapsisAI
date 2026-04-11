import { cloneValue } from '../core';
export const cloneRuntimeJob = (job) => cloneValue(job);
export const cloneRuntimeCheckpoint = (checkpoint) => cloneValue(checkpoint);
export const persistRuntimeRunResult = async (store, result) => {
    if (!store) {
        return;
    }
    await Promise.resolve(store.saveJob(cloneRuntimeJob(result.job)));
    await Promise.resolve(store.saveCheckpoint(cloneRuntimeCheckpoint(result.checkpoint)));
};
