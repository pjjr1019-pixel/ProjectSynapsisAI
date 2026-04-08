import { dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { SynAIDatabase } from "../types";

const DEFAULT_DB_PATH = "SynAI/data/synai-db.json";

let dbPath = DEFAULT_DB_PATH;
let writeQueue = Promise.resolve();
let cache: SynAIDatabase | null = null;
let loadQueue: Promise<SynAIDatabase> | null = null;
let mutateQueue = Promise.resolve();

const emptyDatabase = (): SynAIDatabase => ({
  conversations: [],
  messages: [],
  memories: [],
  summaries: []
});

export const configureDatabasePath = (nextPath: string): void => {
  dbPath = nextPath;
  cache = null;
  loadQueue = null;
  writeQueue = Promise.resolve();
  mutateQueue = Promise.resolve();
};

export const getDatabasePath = (): string => dbPath;

const cloneDatabase = (db: SynAIDatabase): SynAIDatabase => structuredClone(db);

const ensureDbFile = async (): Promise<void> => {
  await mkdir(dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(emptyDatabase(), null, 2), "utf8");
  }
};

export const loadDatabase = async (): Promise<SynAIDatabase> => {
  if (cache) {
    return cloneDatabase(cache);
  }

  if (loadQueue) {
    return cloneDatabase(await loadQueue);
  }

  loadQueue = (async () => {
    await ensureDbFile();
    const raw = await readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SynAIDatabase>;
    cache = {
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? [],
      memories: parsed.memories ?? [],
      summaries: parsed.summaries ?? []
    };
    return cache;
  })();

  try {
    return cloneDatabase(await loadQueue);
  } finally {
    loadQueue = null;
  }
};

export const saveDatabase = async (db: SynAIDatabase): Promise<void> => {
  await ensureDbFile();
  cache = cloneDatabase(db);
  writeQueue = writeQueue.then(() =>
    writeFile(dbPath, JSON.stringify(cache, null, 2), "utf8")
  );
  await writeQueue;
};

export const mutateDatabase = async (
  mutator: (db: SynAIDatabase) => SynAIDatabase | Promise<SynAIDatabase>
): Promise<SynAIDatabase> => {
  let nextDb: SynAIDatabase = emptyDatabase();

  const runMutation = mutateQueue.then(async () => {
    const db = await loadDatabase();
    nextDb = await mutator(db);
    await saveDatabase(nextDb);
  });

  mutateQueue = runMutation.then(
    () => undefined,
    () => undefined
  );

  await runMutation;
  return cloneDatabase(nextDb);
};
