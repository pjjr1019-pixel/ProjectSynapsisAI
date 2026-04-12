import { dirname } from "node:path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
const DEFAULT_DB_PATH = "SynAI/data/synai-db.json";
let dbPath = DEFAULT_DB_PATH;
let writeQueue = Promise.resolve();
let cache = null;
let loadQueue = null;
let mutateQueue = Promise.resolve();
let ensureQueue = null;
const emptyDatabase = () => ({
    conversations: [],
    messages: [],
    memories: [],
    promptBehaviorMemories: [],
    summaries: [],
    capabilityRuns: [],
    capabilityCases: [],
    capabilityEvents: [],
    improvementEvents: [],
    patchProposals: []
});
export const configureDatabasePath = (nextPath) => {
    dbPath = nextPath;
    cache = null;
    loadQueue = null;
    writeQueue = Promise.resolve();
    mutateQueue = Promise.resolve();
    ensureQueue = null;
};
export const getDatabasePath = () => dbPath;
const cloneDatabase = (db) => structuredClone(db);
const cloneValue = (value) => structuredClone(value);
const ensureDbFile = async () => {
    try {
        if (!ensureQueue) {
            ensureQueue = (async () => {
                await mkdir(dirname(dbPath), { recursive: true });
                try {
                    await access(dbPath);
                }
                catch {
                    await writeFile(dbPath, JSON.stringify(emptyDatabase(), null, 2), "utf8");
                }
            })();
        }
        await ensureQueue;
    }
    catch (error) {
        ensureQueue = null;
        throw error;
    }
};
const hydrateDatabase = (parsed) => ({
    conversations: parsed.conversations ?? [],
    messages: parsed.messages ?? [],
    memories: parsed.memories ?? [],
    promptBehaviorMemories: parsed.promptBehaviorMemories ?? [],
    summaries: parsed.summaries ?? [],
    capabilityRuns: parsed.capabilityRuns ?? [],
    capabilityCases: parsed.capabilityCases ?? [],
    capabilityEvents: parsed.capabilityEvents ?? [],
    improvementEvents: parsed.improvementEvents ?? [],
    patchProposals: parsed.patchProposals ?? []
});
const getCachedDatabase = async () => {
    if (cache) {
        return cache;
    }
    if (loadQueue) {
        return await loadQueue;
    }
    loadQueue = (async () => {
        await ensureDbFile();
        const raw = await readFile(dbPath, "utf8");
        const parsed = JSON.parse(raw);
        cache = hydrateDatabase(parsed);
        return cache;
    })();
    try {
        return await loadQueue;
    }
    finally {
        loadQueue = null;
    }
};
export const loadDatabase = async () => cloneDatabase(await getCachedDatabase());
export const readDatabaseValue = async (selector) => cloneValue(selector(await getCachedDatabase()));
export const saveDatabase = async (db) => {
    await ensureDbFile();
    const snapshot = cloneDatabase(db);
    const serialized = JSON.stringify(snapshot);
    cache = snapshot;
    loadQueue = null;
    writeQueue = writeQueue.catch(() => undefined).then(() => writeFile(dbPath, serialized, "utf8"));
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
