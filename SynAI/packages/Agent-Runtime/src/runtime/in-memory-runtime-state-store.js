import { cloneValue } from '../core';
export class InMemoryAgentRuntimeStateStore {
    jobs = new Map();
    checkpointsByJob = new Map();
    saveJob(job) {
        const cloned = cloneValue(job);
        this.jobs.set(cloned.id, cloned);
        return cloneValue(cloned);
    }
    getJob(jobId) {
        const job = this.jobs.get(jobId);
        return job ? cloneValue(job) : undefined;
    }
    listJobs() {
        return Array.from(this.jobs.values()).map((job) => cloneValue(job));
    }
    saveCheckpoint(checkpoint) {
        const cloned = cloneValue(checkpoint);
        const existing = this.checkpointsByJob.get(cloned.jobId) ?? [];
        existing.push(cloned);
        this.checkpointsByJob.set(cloned.jobId, existing);
        return cloneValue(cloned);
    }
    listCheckpoints(jobId) {
        return (this.checkpointsByJob.get(jobId) ?? []).map((checkpoint) => cloneValue(checkpoint));
    }
    getLatestCheckpoint(jobId) {
        const checkpoints = this.checkpointsByJob.get(jobId) ?? [];
        const latest = checkpoints[checkpoints.length - 1];
        return latest ? cloneValue(latest) : undefined;
    }
}
