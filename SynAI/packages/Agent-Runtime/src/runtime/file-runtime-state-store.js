import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { cloneValue } from '../core';
const readJsonFile = async (filePath, fallback) => {
    try {
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return fallback;
    }
};
export class FileAgentRuntimeStateStore {
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    get jobsDir() {
        return path.join(this.rootDir, 'jobs');
    }
    get checkpointsDir() {
        return path.join(this.rootDir, 'checkpoints');
    }
    async ensureRoot() {
        await mkdir(this.jobsDir, { recursive: true });
        await mkdir(this.checkpointsDir, { recursive: true });
    }
    getJobPath(jobId) {
        return path.join(this.jobsDir, `${jobId}.json`);
    }
    getCheckpointPath(jobId, checkpointId) {
        return path.join(this.checkpointsDir, jobId, `${checkpointId}.json`);
    }
    async saveJob(job) {
        await this.ensureRoot();
        const cloned = cloneValue(job);
        await writeFile(this.getJobPath(cloned.id), JSON.stringify(cloned, null, 2), 'utf8');
        return cloneValue(cloned);
    }
    async getJob(jobId) {
        await this.ensureRoot();
        const job = await readJsonFile(this.getJobPath(jobId), null);
        return job ? cloneValue(job) : undefined;
    }
    async listJobs() {
        await this.ensureRoot();
        const entries = await readdir(this.jobsDir).catch(() => []);
        const jobs = await Promise.all(entries
            .filter((entry) => entry.endsWith('.json'))
            .map((entry) => readJsonFile(path.join(this.jobsDir, entry), null)));
        return jobs.filter((job) => Boolean(job)).map((job) => cloneValue(job));
    }
    async saveCheckpoint(checkpoint) {
        await this.ensureRoot();
        const cloned = cloneValue(checkpoint);
        const targetDir = path.join(this.checkpointsDir, cloned.jobId);
        await mkdir(targetDir, { recursive: true });
        await writeFile(this.getCheckpointPath(cloned.jobId, cloned.id), JSON.stringify(cloned, null, 2), 'utf8');
        return cloneValue(cloned);
    }
    async listCheckpoints(jobId) {
        await this.ensureRoot();
        const targetDir = path.join(this.checkpointsDir, jobId);
        const entries = await readdir(targetDir).catch(() => []);
        const checkpoints = await Promise.all(entries
            .filter((entry) => entry.endsWith('.json'))
            .map((entry) => readJsonFile(path.join(targetDir, entry), null)));
        return checkpoints
            .filter((checkpoint) => Boolean(checkpoint))
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
            .map((checkpoint) => cloneValue(checkpoint));
    }
    async getLatestCheckpoint(jobId) {
        const checkpoints = await this.listCheckpoints(jobId);
        const latest = checkpoints[checkpoints.length - 1];
        return latest ? cloneValue(latest) : undefined;
    }
}
