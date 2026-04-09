import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  OfficialKnowledgeContext,
  OfficialKnowledgeDocument,
  OfficialKnowledgeHit,
  OfficialKnowledgePolicy,
  OfficialKnowledgeSource
} from "../contracts/awareness";
import type { AwarenessIntentRoute } from "../contracts/awareness";
import { CURATED_OFFICIAL_WINDOWS_SOURCES, OFFICIAL_WINDOWS_ALLOWED_DOMAINS } from "./catalog";

const MIRROR_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_EXTRACTS = 8;
const MAX_QUERY_HITS = 4;
const IS_TEST_RUNTIME = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export interface OfficialKnowledgeRuntimePaths {
  runtimeRoot: string;
  mirrorPath: string;
  statusPath: string;
}

export interface OfficialKnowledgeStatus {
  ready: boolean;
  documentCount: number;
  lastRefreshedAt: string | null;
  mirrorFresh: boolean;
  policy: OfficialKnowledgePolicy;
  allowedDomains: string[];
}

export interface OfficialKnowledgeQueryOptions {
  policy?: OfficialKnowledgePolicy;
  windowsVersionHint?: string;
  allowLiveFetch?: boolean;
  route?: AwarenessIntentRoute | null;
}

export interface OfficialKnowledgeInitOptions {
  runtimeRoot: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  defaultPolicy?: OfficialKnowledgePolicy;
  backgroundRefresh?: boolean;
  allowLiveFetch?: boolean;
}

export interface OfficialKnowledgeState {
  readonly paths: OfficialKnowledgeRuntimePaths;
  readonly documents: OfficialKnowledgeDocument[];
  getStatus(): OfficialKnowledgeStatus;
  query(query: string, options?: OfficialKnowledgeQueryOptions): Promise<OfficialKnowledgeContext | null>;
  refresh(reason?: string): Promise<OfficialKnowledgeDocument[]>;
  close(): void;
}

interface OfficialKnowledgeMirrorFile {
  version: 1;
  generatedAt: string;
  documents: OfficialKnowledgeDocument[];
}

const normalizeText = (value: string): string =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value: string): string[] => normalizeQuery(value).split(/\s+/).filter(Boolean);

const scoreText = (haystack: string, query: string): number => {
  const normalizedHaystack = normalizeQuery(haystack);
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;
  for (const token of tokenize(normalizedQuery)) {
    if (normalizedHaystack.includes(token)) {
      score += token.length >= 5 ? 4 : 2;
    }
  }

  if (normalizedHaystack.includes(normalizedQuery)) {
    score += 8;
  }

  return score;
};

const uniqueStrings = (values: string[]): string[] => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const buildRuntimePaths = (runtimeRoot: string): OfficialKnowledgeRuntimePaths => ({
  runtimeRoot,
  mirrorPath: path.join(runtimeRoot, "mirror.json"),
  statusPath: path.join(runtimeRoot, "status.json")
});

const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const isAllowedOfficialUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return OFFICIAL_WINDOWS_ALLOWED_DOMAINS.includes(url.hostname as (typeof OFFICIAL_WINDOWS_ALLOWED_DOMAINS)[number]);
  } catch {
    return false;
  }
};

const extractTitle = (html: string, fallback: string): string => {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeText(titleMatch?.[1] ?? fallback) || fallback;
};

const extractBlocks = (html: string): string[] => {
  const matches = html.match(/<(p|li|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi) ?? [];
  return uniqueStrings(
    matches
      .map((block) => normalizeText(block))
      .filter((block) => block.length >= 40)
      .slice(0, MAX_EXTRACTS)
  );
};

const detectVersionMatch = (query: string, versionTags: string[], windowsVersionHint?: string): boolean => {
  const haystack = `${query} ${windowsVersionHint ?? ""}`.toLowerCase();
  return versionTags.some((tag) => haystack.includes(tag.toLowerCase()));
};

const toDocument = (source: OfficialKnowledgeSource, html: string, fetchedAt: string): OfficialKnowledgeDocument => {
  const title = extractTitle(html, source.title);
  const extracts = extractBlocks(html);

  return {
    id: source.id,
    sourceId: source.id,
    title,
    canonicalUrl: source.url,
    domain: source.domain,
    topic: source.topic,
    section: source.topic,
    fetchedAt,
    productTags: [...source.productTags],
    versionTags: [...source.versionTags],
    aliases: [...source.aliases],
    keywords: [...source.keywords],
    extracts,
    summary: extracts[0] ?? source.title
  };
};

const rankDocument = (
  document: OfficialKnowledgeDocument,
  query: string,
  windowsVersionHint?: string
): OfficialKnowledgeHit | null => {
  const score =
    scoreText(document.title, query) * 2 +
    scoreText(document.topic, query) +
    scoreText(document.summary, query) +
    scoreText(document.keywords.join(" "), query) * 2 +
    scoreText(document.aliases.join(" "), query) +
    scoreText(document.extracts.join(" "), query);

  if (score <= 0) {
    return null;
  }

  const versionMatched = detectVersionMatch(query, document.versionTags, windowsVersionHint);

  return {
    documentId: document.id,
    sourceId: document.sourceId,
    title: document.title,
    canonicalUrl: document.canonicalUrl,
    domain: document.domain,
    topic: document.topic,
    summary: document.summary,
    extract: document.extracts[0] ?? document.summary,
    score: versionMatched ? score + 10 : score,
    versionMatched,
    fetchedAt: document.fetchedAt
  };
};

const looksLikeWindowsKnowledgeQuery = (query: string, route?: AwarenessIntentRoute | null): boolean => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("windows") ||
    normalized.includes("ms settings") ||
    normalized.includes("ms settings") ||
    normalized.includes("setting") ||
    normalized.includes("registry") ||
    normalized.includes("service") ||
    normalized.includes("event viewer") ||
    normalized.includes("event log") ||
    normalized.includes("build") ||
    normalized.includes("known issue") ||
    normalized.includes("release health") ||
    normalized.includes("update") ||
    normalized.includes("control panel")
  ) {
    return true;
  }

  return route != null && ["settings-control-panel", "registry", "process-service-startup", "performance-diagnostic", "hardware"].includes(route.family);
};

const chooseLiveFallbackSources = (query: string): OfficialKnowledgeSource[] =>
  [...CURATED_OFFICIAL_WINDOWS_SOURCES]
    .map((source) => ({
      source,
      score:
        scoreText(source.title, query) * 2 +
        scoreText(source.topic, query) +
        scoreText(source.keywords.join(" "), query) * 2 +
        scoreText(source.aliases.join(" "), query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.source);

export const buildOfficialKnowledgeContextSection = (
  context: OfficialKnowledgeContext | null | undefined
): string | null => {
  if (!context || !context.used || context.hits.length === 0) {
    return null;
  }

  const lines = [
    `Official Windows knowledge (${context.source}): ${context.hits.length} Microsoft source${context.hits.length === 1 ? "" : "s"}.`,
    ...context.hits.slice(0, 3).map(
      (hit) =>
        `${hit.title} | ${hit.domain} | ${hit.extract} | ${hit.canonicalUrl}`
    )
  ];

  return lines.join("\n").slice(0, 1600);
};

export const initializeOfficialKnowledge = async (
  options: OfficialKnowledgeInitOptions
): Promise<OfficialKnowledgeState> => {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const defaultPolicy = options.defaultPolicy ?? "mirror-first";
  const backgroundRefresh = options.backgroundRefresh ?? !IS_TEST_RUNTIME;
  const allowLiveFetch = options.allowLiveFetch ?? !IS_TEST_RUNTIME;
  const paths = buildRuntimePaths(options.runtimeRoot);
  await mkdir(paths.runtimeRoot, { recursive: true });

  const mirrorFile = await readJsonIfExists<OfficialKnowledgeMirrorFile>(paths.mirrorPath);
  let documents = mirrorFile?.documents ?? [];
  let lastRefreshedAt = mirrorFile?.generatedAt ?? null;
  let refreshTimer: NodeJS.Timeout | null = null;
  let inFlightRefresh: Promise<OfficialKnowledgeDocument[]> | null = null;

  const persist = async (): Promise<void> => {
    const generatedAt = lastRefreshedAt ?? now().toISOString();
    await writeJson(paths.mirrorPath, {
      version: 1,
      generatedAt,
      documents
    } satisfies OfficialKnowledgeMirrorFile);
    await writeJson(paths.statusPath, {
      ready: documents.length > 0,
      documentCount: documents.length,
      lastRefreshedAt,
      mirrorFresh:
        lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false,
      policy: defaultPolicy,
      allowedDomains: [...OFFICIAL_WINDOWS_ALLOWED_DOMAINS]
    } satisfies OfficialKnowledgeStatus);
  };

  const refresh = async (): Promise<OfficialKnowledgeDocument[]> => {
    if (!allowLiveFetch) {
      await persist();
      return documents;
    }

    if (inFlightRefresh) {
      return inFlightRefresh;
    }

    inFlightRefresh = (async () => {
      const nextFetchedAt = now().toISOString();
      const nextDocuments: OfficialKnowledgeDocument[] = [];
      for (const source of CURATED_OFFICIAL_WINDOWS_SOURCES) {
        if (!isAllowedOfficialUrl(source.url)) {
          continue;
        }
        try {
          const response = await fetchImpl(source.url, {
            headers: {
              "User-Agent": "SynAI/0.1"
            }
          });
          if (!response.ok) {
            continue;
          }
          const html = await response.text();
          nextDocuments.push(toDocument(source, html, nextFetchedAt));
        } catch {
          continue;
        }
      }
      if (nextDocuments.length > 0) {
        documents = nextDocuments;
        lastRefreshedAt = nextFetchedAt;
        await persist();
      }
      return documents;
    })().finally(() => {
      inFlightRefresh = null;
    });

    return inFlightRefresh;
  };

  if (backgroundRefresh && allowLiveFetch) {
    refreshTimer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, MIRROR_STALE_AFTER_MS);
    refreshTimer.unref?.();
  }

  if (!IS_TEST_RUNTIME) {
    void persist();
  }

  return {
    paths,
    get documents() {
      return [...documents];
    },
    getStatus() {
      const mirrorFresh =
        lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false;
      return {
        ready: documents.length > 0,
        documentCount: documents.length,
        lastRefreshedAt,
        mirrorFresh,
        policy: defaultPolicy,
        allowedDomains: [...OFFICIAL_WINDOWS_ALLOWED_DOMAINS]
      };
    },
    async query(query, queryOptions = {}) {
      const trimmed = query.trim();
      if (!trimmed || !looksLikeWindowsKnowledgeQuery(trimmed, queryOptions.route)) {
        return null;
      }

      const policy = queryOptions.policy ?? defaultPolicy;
      const mirrorFresh =
        lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false;

      let hits = documents
        .map((document) => rankDocument(document, trimmed, queryOptions.windowsVersionHint))
        .filter((hit): hit is OfficialKnowledgeHit => Boolean(hit))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_QUERY_HITS);

      let source: OfficialKnowledgeContext["source"] = hits.length > 0 ? "mirror" : "none";

      if (
        policy === "live-fallback" &&
        allowLiveFetch &&
        queryOptions.allowLiveFetch !== false &&
        hits.length === 0
      ) {
        const candidates = chooseLiveFallbackSources(trimmed);
        for (const sourceCandidate of candidates) {
          try {
            const response = await fetchImpl(sourceCandidate.url, {
              headers: {
                "User-Agent": "SynAI/0.1"
              }
            });
            if (!response.ok) {
              continue;
            }
            const html = await response.text();
            const document = toDocument(sourceCandidate, html, now().toISOString());
            documents = [
              document,
              ...documents.filter((item) => item.id !== document.id)
            ];
            lastRefreshedAt = now().toISOString();
            await persist();
          } catch {
            continue;
          }
        }

        hits = documents
          .map((document) => rankDocument(document, trimmed, queryOptions.windowsVersionHint))
          .filter((hit): hit is OfficialKnowledgeHit => Boolean(hit))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_QUERY_HITS);
        source = hits.length > 0 ? "live-fallback" : "none";
      }

      return {
        query: trimmed,
        policy,
        used: hits.length > 0,
        source,
        generatedAt: now().toISOString(),
        lastRefreshedAt,
        mirrorFresh,
        hitCount: hits.length,
        hits
      } satisfies OfficialKnowledgeContext;
    },
    refresh,
    close() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    }
  };
};

export * from "./catalog";
