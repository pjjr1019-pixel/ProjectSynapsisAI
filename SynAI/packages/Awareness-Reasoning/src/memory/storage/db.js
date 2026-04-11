import { dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const DEFAULT_DB_PATH = "SynAI/data/synai-db.json";
let dbPath = DEFAULT_DB_PATH;
let writeQueue = Promise.resolve();
let cache = null;
let loadQueue = null;
let mutateQueue = Promise.resolve();
const emptyDatabase = () => ({
    conversations: [],
    messages: [],
    memories: [],
    promptBehaviorMemories: [],
    summaries: [],
    capabilityRuns: [],
    capabilityCases: [],
    capabilityEvents: []
});
export const configureDatabasePath = (nextPath) => {
    dbPath = nextPath;
    cache = null;
    loadQueue = null;
    writeQueue = Promise.resolve();
    mutateQueue = Promise.resolve();
};
export const getDatabasePath = () => dbPath;
const cloneDatabase = (db) => structuredClone(db);
const ensureDbFile = async () => {
    await mkdir(dirname(dbPath), { recursive: true });
    try {
        await readFile(dbPath, "utf8");
    }
    catch {
        await writeFile(dbPath, JSON.stringify(emptyDatabase(), null, 2), "utf8");
    }
};
export const loadDatabase = async () => {
    if (cache) {
        return cloneDatabase(cache);
    }
    if (loadQueue) {
        return cloneDatabase(await loadQueue);
    }
    loadQueue = (async () => {
        await ensureDbFile();
        const raw = await readFile(dbPath, "utf8");
        const parsed = JSON.parse(raw);
        cache = {
            conversations: parsed.conversations ?? [],
            messages: parsed.messages ?? [],
            memories: parsed.memories ?? [],
            promptBehaviorMemories: parsed.promptBehaviorMemories ?? [],
            summaries: parsed.summaries ?? [],
            capabilityRuns: parsed.capabilityRuns ?? [],
            capabilityCases: parsed.capabilityCases ?? [],
            capabilityEvents: parsed.capabilityEvents ?? []
        };
        return cache;
    })();
    try {
        return cloneDatabase(await loadQueue);
    }
    finally {
        loadQueue = null;
    }
};
export const saveDatabase = async (db) => {
    await ensureDbFile();
    cache = cloneDatabase(db);
    writeQueue = writeQueue.then(() => writeFile(dbPath, JSON.stringify(cache), "utf8"));
    await writeQueue;
};
export const mutateDatabase = async (mutator) => {
    let nextDb = emptyDatabase();
    const runMutation = mutateQueue.then(async () => {
        const db = await loadDatabase();
        nextDb = await mutator(db);
        await saveDatabase(nextDb);
    });
    mutateQueue = runMutation.then(() => undefined, () => undefined);
    await runMutation;
    return cloneDatabase(nextDb);
};
