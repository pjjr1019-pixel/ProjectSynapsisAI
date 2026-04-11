import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  WorkspaceChunkHit,
  WorkspaceIndexMode,
  WorkspaceIndexStatus
} from "../contracts/rag";
import { getEmbeddings } from "../local-ai/embeddings";

const INDEX_VERSION = 1;
const MAX_FILE_BYTES = 512 * 1024;
const CHUNK_TARGET_CHARS = 900;
const CHUNK_OVERLAP_CHARS = 180;
const MAX_QUERY_RESULTS = 6;
const MAX_DISCOVERED_FILES = 1200;
const MAX_TOTAL_CHUNKS = 900;
const MAX_TOTAL_CHUNK_CHARS = 1_200_000;
const MAX_INDEX_BYTES_ON_DISK = 16 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".css",
  ".csv",
  ".env",
  ".example",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".ps1",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

const KNOWN_TEXT_FILENAMES = new Set([
  ".env",
  ".gitignore",
  ".npmrc",
  ".prettierignore",
  ".prettierrc",
  ".prettierrc.json",
  "Dockerfile",
  "LICENSE",
  "README",
  "README.md"
]);

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".next",
  ".runtime",
  ".turbo",
  ".vercel",
  ".vite",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "target",
  "vendor"
]);

const IGNORED_FILE_PATTERNS = [/\.map$/i, /\.min\./i, /\.lock$/i];

interface WorkspaceIndexChunk {
  id: string;
  path: string;
  relativePath: string;
  startLine: number;
  endLine: number;
  text: string;
  keywords: string[];
  embedding: number[] | null;
}

interface WorkspaceIndexedFile {
  path: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAtMs: number;
  hash: string;
  chunkIds: string[];
}

interface WorkspaceIndexData {
  version: number;
  workspaceRoot: string;
  lastIndexedAt: string | null;
  files: WorkspaceIndexedFile[];
  chunks: WorkspaceIndexChunk[];
}

export interface WorkspaceQueryResult {
  hits: WorkspaceChunkHit[];
  status: WorkspaceIndexStatus;
}

export interface WorkspaceIndexOptions {
  workspaceRoot: string;
  runtimeRoot: string;
  enabled: boolean;
  mode?: WorkspaceIndexMode;
  maxResults?: number;
  embedder?: (text: string) => Promise<number[]>;
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9_\-/\\.\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .slice(0, 256);

const unique = (values: string[]): string[] => [...new Set(values)];

const normalizePath = (value: string): string => path.resolve(value);

const createEmptyIndex = (workspaceRoot: string): WorkspaceIndexData => ({
  version: INDEX_VERSION,
  workspaceRoot,
  lastIndexedAt: null,
  files: [],
  chunks: []
});

const createStatus = (
  options: WorkspaceIndexOptions,
  data: WorkspaceIndexData | null,
  detail: string | null,
  embeddingEnabled: boolean,
  pendingFileCount = 0
): WorkspaceIndexStatus => {
  const paths = getWorkspaceIndexPaths(options.runtimeRoot);
  return {
    enabled: options.enabled,
    ready: data !== null,
    mode: options.enabled ? options.mode ?? "incremental" : "off",
    workspaceRoot: options.enabled ? normalizePath(options.workspaceRoot) : null,
    indexPath: options.enabled ? paths.indexPath : null,
    embeddingEnabled,
    fileCount: data?.files.length ?? 0,
    chunkCount: data?.chunks.length ?? 0,
    pendingFileCount,
    lastIndexedAt: data?.lastIndexedAt ?? null,
    detail
  };
};

const getWorkspaceIndexPaths = (runtimeRoot: string): { retrievalRoot: string; indexPath: string } => {
  const retrievalRoot = path.join(normalizePath(runtimeRoot), "retrieval");
  return {
    retrievalRoot,
    indexPath: path.join(retrievalRoot, "workspace-index.json")
  };
};

const isIgnoredPath = (entryPath: string): boolean => IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(entryPath));

const shouldIndexFile = (filePath: string): boolean => {
  const basename = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (isIgnoredPath(filePath)) {
    return false;
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return true;
  }

  if (KNOWN_TEXT_FILENAMES.has(basename)) {
    return true;
  }

  return extension === "" && /^[A-Za-z0-9._-]+$/.test(basename);
};

const isProbablyBinary = (buffer: Buffer): boolean => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }
  return suspicious > Math.floor(sample.length * 0.2);
};

const discoverWorkspaceFiles = async (workspaceRoot: string): Promise<string[]> => {
  const files: string[] = [];

  const walk = async (currentDir: string): Promise<void> => {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) {
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !shouldIndexFile(absolutePath)) {
        continue;
      }

      files.push(absolutePath);
    }
  };

  await walk(normalizePath(workspaceRoot));
  return files.sort((left, right) => left.localeCompare(right));
};

const buildChunks = async (
  filePath: string,
  relativePath: string,
  hash: string,
  content: string,
  embedder: ((text: string) => Promise<number[]>) | null
): Promise<WorkspaceIndexChunk[]> => {
  const lines = content.split(/\r?\n/);
  const rawChunks: Array<{ text: string; startLine: number; endLine: number }> = [];
  let cursor = 0;

  while (cursor < lines.length) {
    let chunkText = "";
    const startLine = cursor + 1;
    let endLine = startLine;
    while (cursor < lines.length) {
      const nextLine = lines[cursor] ?? "";
      const nextText = chunkText ? `${chunkText}\n${nextLine}` : nextLine;
      if (nextText.length > CHUNK_TARGET_CHARS && chunkText) {
        break;
      }
      chunkText = nextText;
      endLine = cursor + 1;
      cursor += 1;
    }

    const trimmed = chunkText.trim();
    if (trimmed) {
      rawChunks.push({
        text: trimmed,
        startLine,
        endLine
      });
    }

    if (cursor >= lines.length) {
      break;
    }

    let overlapChars = 0;
    while (cursor > 0 && overlapChars < CHUNK_OVERLAP_CHARS) {
      cursor -= 1;
      overlapChars += (lines[cursor]?.length ?? 0) + 1;
    }
  }

  const built: WorkspaceIndexChunk[] = [];
  for (let index = 0; index < rawChunks.length; index += 1) {
    const rawChunk = rawChunks[index];
    const embedding = embedder ? await embedder(rawChunk.text).catch(() => []) : [];
    built.push({
      id: `${relativePath}:${rawChunk.startLine}:${rawChunk.endLine}:${hash.slice(0, 12)}:${index}`,
      path: filePath,
      relativePath,
      startLine: rawChunk.startLine,
      endLine: rawChunk.endLine,
      text: rawChunk.text,
      keywords: unique(tokenize(rawChunk.text)).slice(0, 80),
      embedding: embedding.length > 0 ? embedding : null
    });
  }

  return built;
};

const loadIndex = async (runtimeRoot: string, workspaceRoot: string): Promise<WorkspaceIndexData | null> => {
  const paths = getWorkspaceIndexPaths(runtimeRoot);
  try {
    const indexStat = await stat(paths.indexPath);
    if (!indexStat.isFile() || indexStat.size > MAX_INDEX_BYTES_ON_DISK) {
      return createEmptyIndex(normalizePath(workspaceRoot));
    }
    const raw = await readFile(paths.indexPath, "utf8");
    const parsed = JSON.parse(raw) as WorkspaceIndexData;
    if (parsed.version !== INDEX_VERSION || normalizePath(parsed.workspaceRoot) !== normalizePath(workspaceRoot)) {
      return createEmptyIndex(normalizePath(workspaceRoot));
    }
    return parsed;
  } catch {
    return null;
  }
};

const cosineSimilarity = (left: number[], right: number[]): number => {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let numerator = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    numerator += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return numerator / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

const summarizeDetail = (
  embeddingEnabled: boolean,
  changedCount: number,
  constrainedByBudget: boolean
): string | null => {
  const messages = [
    changedCount > 0 ? `${changedCount} file${changedCount === 1 ? "" : "s"} refreshed` : "index up to date",
    embeddingEnabled ? "semantic ranking ready" : "keyword-only ranking"
  ];
  if (constrainedByBudget) {
    messages.push("index budget applied");
  }
  return messages.join(" | ");
};

const refreshWorkspaceIndex = async (
  options: WorkspaceIndexOptions
): Promise<{ data: WorkspaceIndexData; status: WorkspaceIndexStatus }> => {
  const workspaceRoot = normalizePath(options.workspaceRoot);
  const runtimeRoot = normalizePath(options.runtimeRoot);
  const embedder = options.embedder ?? getEmbeddings;
  const existing = (await loadIndex(runtimeRoot, workspaceRoot)) ?? createEmptyIndex(workspaceRoot);
  const existingFileMap = new Map(existing.files.map((file) => [file.path, file]));
  const existingChunksById = new Map(existing.chunks.map((chunk) => [chunk.id, chunk]));
  const nextFiles: WorkspaceIndexedFile[] = [];
  const nextChunks: WorkspaceIndexChunk[] = [];
  let totalChunkChars = 0;
  let constrainedByBudget = false;
  let changedCount = 0;

  const discoveredFiles = await discoverWorkspaceFiles(workspaceRoot);

  for (const filePath of discoveredFiles) {
    if (
      nextFiles.length >= MAX_DISCOVERED_FILES ||
      nextChunks.length >= MAX_TOTAL_CHUNKS ||
      totalChunkChars >= MAX_TOTAL_CHUNK_CHARS
    ) {
      constrainedByBudget = true;
      break;
    }

    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || !fileStat.isFile() || fileStat.size > MAX_FILE_BYTES) {
      continue;
    }

    const relativePath = path.relative(workspaceRoot, filePath) || path.basename(filePath);
    const existingFile = existingFileMap.get(filePath);
    if (existingFile && existingFile.sizeBytes === fileStat.size && existingFile.modifiedAtMs === fileStat.mtimeMs) {
      const preservedChunks: WorkspaceIndexChunk[] = [];
      let additionalChars = 0;
      for (const chunkId of existingFile.chunkIds) {
        const existingChunk = existingChunksById.get(chunkId);
        if (existingChunk) {
          preservedChunks.push(existingChunk);
          additionalChars += existingChunk.text.length;
        }
      }
      if (
        nextChunks.length + preservedChunks.length > MAX_TOTAL_CHUNKS ||
        totalChunkChars + additionalChars > MAX_TOTAL_CHUNK_CHARS
      ) {
        constrainedByBudget = true;
        break;
      }
      nextFiles.push(existingFile);
      nextChunks.push(...preservedChunks);
      totalChunkChars += additionalChars;
      continue;
    }

    const buffer = await readFile(filePath).catch(() => null);
    if (!buffer || isProbablyBinary(buffer)) {
      continue;
    }

    const text = buffer.toString("utf8").trim();
    if (!text) {
      continue;
    }

    const hash = createHash("sha1").update(buffer).digest("hex");
    const chunks = await buildChunks(filePath, relativePath, hash, text, embedder);
    const remainingChunkBudget = MAX_TOTAL_CHUNKS - nextChunks.length;
    const remainingCharBudget = MAX_TOTAL_CHUNK_CHARS - totalChunkChars;
    if (remainingChunkBudget <= 0 || remainingCharBudget <= 0) {
      constrainedByBudget = true;
      break;
    }

    const boundedChunks: WorkspaceIndexChunk[] = [];
    let boundedChars = 0;
    for (const chunk of chunks) {
      if (boundedChunks.length >= remainingChunkBudget) {
        constrainedByBudget = true;
        break;
      }
      const nextChars = boundedChars + chunk.text.length;
      if (nextChars > remainingCharBudget) {
        constrainedByBudget = true;
        break;
      }
      boundedChunks.push(chunk);
      boundedChars = nextChars;
    }
    if (boundedChunks.length === 0) {
      constrainedByBudget = true;
      break;
    }

    changedCount += 1;
    nextFiles.push({
      path: filePath,
      relativePath,
      sizeBytes: fileStat.size,
      modifiedAtMs: fileStat.mtimeMs,
      hash,
      chunkIds: boundedChunks.map((chunk) => chunk.id)
    });
    nextChunks.push(...boundedChunks);
    totalChunkChars += boundedChars;
  }

  const nextData: WorkspaceIndexData = {
    version: INDEX_VERSION,
    workspaceRoot,
    lastIndexedAt: new Date().toISOString(),
    files: nextFiles,
    chunks: nextChunks
  };

  const embeddingEnabled = nextChunks.some((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0);
  const paths = getWorkspaceIndexPaths(runtimeRoot);
  await mkdir(paths.retrievalRoot, { recursive: true });
  await writeFile(paths.indexPath, JSON.stringify(nextData), "utf8");

  return {
    data: nextData,
    status: createStatus(
      options,
      nextData,
      summarizeDetail(embeddingEnabled, changedCount, constrainedByBudget),
      embeddingEnabled
    )
  };
};

export const getWorkspaceIndexStatus = async (options: WorkspaceIndexOptions): Promise<WorkspaceIndexStatus> => {
  if (!options.enabled) {
    return createStatus(options, null, "workspace indexing disabled", false);
  }

  const existing = await loadIndex(options.runtimeRoot, options.workspaceRoot);
  const embeddingEnabled = existing?.chunks.some((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0) ?? false;
  return createStatus(options, existing, existing ? "workspace index available" : "workspace index pending", embeddingEnabled);
};

export const ensureWorkspaceIndex = async (options: WorkspaceIndexOptions): Promise<WorkspaceIndexStatus> => {
  if (!options.enabled) {
    return createStatus(options, null, "workspace indexing disabled", false);
  }

  const refreshed = await refreshWorkspaceIndex(options);
  return refreshed.status;
};

export const queryWorkspaceIndex = async (
  query: string,
  options: WorkspaceIndexOptions
): Promise<WorkspaceQueryResult> => {
  if (!options.enabled || !query.trim()) {
    return {
      hits: [],
      status: await getWorkspaceIndexStatus(options)
    };
  }

  const { data, status } = await refreshWorkspaceIndex(options);
  const queryTerms = unique(tokenize(query));
  const queryEmbedding = status.embeddingEnabled ? await (options.embedder ?? getEmbeddings)(query).catch(() => []) : [];
  const scored = data.chunks
    .map((chunk) => {
      const keywordHits = queryTerms.reduce((total, term) => (chunk.keywords.includes(term) ? total + 1 : total), 0);
      const keywordScore = queryTerms.length > 0 ? keywordHits / queryTerms.length : 0;
      const semanticScore =
        queryEmbedding.length > 0 && Array.isArray(chunk.embedding) && chunk.embedding.length === queryEmbedding.length
          ? Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding))
          : 0;
      const score =
        keywordScore > 0 && semanticScore > 0
          ? keywordScore * 0.45 + semanticScore * 0.55
          : semanticScore > 0
            ? semanticScore
            : keywordScore;

      if (score <= 0) {
        return null;
      }

      return {
        chunk,
        score,
        reason:
          keywordScore > 0 && semanticScore > 0
            ? "hybrid"
            : semanticScore > 0
              ? "semantic"
              : "keyword"
      };
    })
    .filter((entry): entry is { chunk: WorkspaceIndexChunk; score: number; reason: WorkspaceChunkHit["reason"] } => entry !== null)
    .sort((left, right) => right.score - left.score);

  const hits: WorkspaceChunkHit[] = [];
  const perFileCount = new Map<string, number>();
  const maxResults = Math.max(1, Math.min(options.maxResults ?? MAX_QUERY_RESULTS, MAX_QUERY_RESULTS));

  for (const entry of scored) {
    const seenForFile = perFileCount.get(entry.chunk.path) ?? 0;
    if (seenForFile >= 2) {
      continue;
    }

    hits.push({
      chunkId: entry.chunk.id,
      path: entry.chunk.path,
      relativePath: entry.chunk.relativePath,
      startLine: entry.chunk.startLine,
      endLine: entry.chunk.endLine,
      score: Number(entry.score.toFixed(3)),
      reason: entry.reason,
      excerpt: entry.chunk.text.slice(0, 440)
    });
    perFileCount.set(entry.chunk.path, seenForFile + 1);

    if (hits.length >= maxResults) {
      break;
    }
  }

  return { hits, status };
};
