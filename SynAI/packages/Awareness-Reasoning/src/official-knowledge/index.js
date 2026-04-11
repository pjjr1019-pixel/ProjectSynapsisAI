import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { CURATED_OFFICIAL_WINDOWS_SOURCES, OFFICIAL_WINDOWS_ALLOWED_DOMAINS } from "./catalog";
const MIRROR_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_EXTRACTS = 8;
const MAX_QUERY_HITS = 4;
const IS_TEST_RUNTIME = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
const buildDefaultSourceStatus = (source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    domain: source.domain,
    enabled: true,
    provenance: "catalog",
    documentCount: 0,
    lastFetchedAt: null,
    lastStatus: "idle",
    error: null
});
const normalizeText = (value) => value
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
const normalizeQuery = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokenize = (value) => normalizeQuery(value).split(/\s+/).filter(Boolean);
const scoreText = (haystack, query) => {
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
const uniqueStrings = (values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
const buildRuntimePaths = (runtimeRoot) => ({
    runtimeRoot,
    mirrorPath: path.join(runtimeRoot, "mirror.json"),
    statusPath: path.join(runtimeRoot, "status.json"),
    sourcesPath: path.join(runtimeRoot, "sources.json")
});
const readJsonIfExists = async (filePath) => {
    try {
        const raw = await readFile(filePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const writeJson = async (filePath, value) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const isAllowedOfficialUrl = (value) => {
    try {
        const url = new URL(value);
        return OFFICIAL_WINDOWS_ALLOWED_DOMAINS.includes(url.hostname);
    }
    catch {
        return false;
    }
};
const extractTitle = (html, fallback) => {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return normalizeText(titleMatch?.[1] ?? fallback) || fallback;
};
const extractBlocks = (html) => {
    const matches = html.match(/<(p|li|h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi) ?? [];
    return uniqueStrings(matches
        .map((block) => normalizeText(block))
        .filter((block) => block.length >= 40)
        .slice(0, MAX_EXTRACTS));
};
const detectVersionMatch = (query, versionTags, windowsVersionHint) => {
    const haystack = `${query} ${windowsVersionHint ?? ""}`.toLowerCase();
    return versionTags.some((tag) => haystack.includes(tag.toLowerCase()));
};
const toDocument = (source, html, fetchedAt) => {
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
const rankDocument = (document, query, windowsVersionHint) => {
    const score = scoreText(document.title, query) * 2 +
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
const looksLikeWindowsKnowledgeQuery = (query, route) => {
    const normalized = normalizeQuery(query);
    if (!normalized) {
        return false;
    }
    if (normalized.includes("windows") ||
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
        normalized.includes("control panel")) {
        return true;
    }
    return route != null && ["settings-control-panel", "registry", "process-service-startup", "performance-diagnostic", "hardware"].includes(route.family);
};
const chooseLiveFallbackSources = (query) => [...CURATED_OFFICIAL_WINDOWS_SOURCES]
    .map((source) => ({
    source,
    score: scoreText(source.title, query) * 2 +
        scoreText(source.topic, query) +
        scoreText(source.keywords.join(" "), query) * 2 +
        scoreText(source.aliases.join(" "), query)
}))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.source);
export const buildOfficialKnowledgeContextSection = (context) => {
    if (!context || !context.used || context.hits.length === 0) {
        return null;
    }
    const lines = [
        `Official Windows knowledge (${context.source}): ${context.hits.length} Microsoft source${context.hits.length === 1 ? "" : "s"}.`,
        ...context.hits.slice(0, 3).map((hit) => `${hit.title} | ${hit.domain} | ${hit.extract} | ${hit.canonicalUrl}`)
    ];
    return lines.join("\n").slice(0, 1600);
};
export const initializeOfficialKnowledge = async (options) => {
    const now = options.now ?? (() => new Date());
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const defaultPolicy = options.defaultPolicy ?? "mirror-first";
    const backgroundRefresh = options.backgroundRefresh ?? !IS_TEST_RUNTIME;
    const allowLiveFetch = options.allowLiveFetch ?? !IS_TEST_RUNTIME;
    const paths = buildRuntimePaths(options.runtimeRoot);
    await mkdir(paths.runtimeRoot, { recursive: true });
    const mirrorFile = await readJsonIfExists(paths.mirrorPath);
    const sourceStateFile = await readJsonIfExists(paths.sourcesPath);
    let documents = mirrorFile?.documents ?? [];
    let lastRefreshedAt = mirrorFile?.generatedAt ?? null;
    let lastRefreshReason = null;
    let refreshTimer = null;
    let inFlightRefresh = null;
    const sourceStates = new Map(CURATED_OFFICIAL_WINDOWS_SOURCES.map((source) => {
        const persisted = sourceStateFile?.sources.find((entry) => entry.id === source.id);
        const defaultState = buildDefaultSourceStatus(source);
        return [
            source.id,
            persisted
                ? {
                    ...defaultState,
                    ...persisted,
                    id: source.id,
                    title: source.title,
                    url: source.url,
                    domain: source.domain
                }
                : defaultState
        ];
    }));
    const listSources = () => CURATED_OFFICIAL_WINDOWS_SOURCES.map((source) => sourceStates.get(source.id) ?? buildDefaultSourceStatus(source));
    const writeSourceState = async () => {
        await writeJson(paths.sourcesPath, {
            version: 1,
            generatedAt: now().toISOString(),
            sources: listSources()
        });
    };
    const updateSourceState = (sourceId, patch) => {
        const current = sourceStates.get(sourceId);
        if (!current) {
            return null;
        }
        const next = {
            ...current,
            ...patch,
            id: current.id,
            title: current.title,
            url: current.url,
            domain: current.domain
        };
        sourceStates.set(sourceId, next);
        return next;
    };
    const persist = async () => {
        const generatedAt = lastRefreshedAt ?? now().toISOString();
        await writeJson(paths.mirrorPath, {
            version: 1,
            generatedAt,
            documents
        });
        await writeSourceState();
        await writeJson(paths.statusPath, {
            ready: documents.length > 0,
            documentCount: documents.length,
            lastRefreshedAt,
            lastRefreshReason,
            mirrorFresh: lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false,
            policy: defaultPolicy,
            allowedDomains: [...OFFICIAL_WINDOWS_ALLOWED_DOMAINS],
            sourceCount: CURATED_OFFICIAL_WINDOWS_SOURCES.length,
            enabledSourceCount: listSources().filter((source) => source.enabled).length,
            sources: listSources()
        });
    };
    const refreshSourceDocument = async (source) => {
        const sourceState = sourceStates.get(source.id) ?? buildDefaultSourceStatus(source);
        if (!sourceState.enabled) {
            updateSourceState(source.id, {
                lastStatus: "disabled",
                lastFetchedAt: sourceState.lastFetchedAt,
                error: null,
                documentCount: documents.filter((document) => document.sourceId === source.id).length
            });
            return null;
        }
        if (!isAllowedOfficialUrl(source.url)) {
            updateSourceState(source.id, {
                lastStatus: "failed",
                error: "URL is not in the allowlist.",
                documentCount: 0
            });
            return null;
        }
        try {
            const response = await fetchImpl(source.url, {
                headers: {
                    "User-Agent": "SynAI/0.1"
                }
            });
            if (!response.ok) {
                updateSourceState(source.id, {
                    lastStatus: "failed",
                    error: `HTTP ${response.status}`,
                    documentCount: 0
                });
                return null;
            }
            const html = await response.text();
            const fetchedAt = now().toISOString();
            const document = toDocument(source, html, fetchedAt);
            updateSourceState(source.id, {
                lastFetchedAt: fetchedAt,
                lastStatus: "fetched",
                error: null,
                documentCount: 1
            });
            return document;
        }
        catch (error) {
            updateSourceState(source.id, {
                lastStatus: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
                documentCount: 0
            });
            return null;
        }
    };
    const refresh = async () => {
        if (!allowLiveFetch) {
            await persist();
            return documents;
        }
        if (inFlightRefresh) {
            return inFlightRefresh;
        }
        inFlightRefresh = (async () => {
            const nextDocuments = [];
            for (const source of CURATED_OFFICIAL_WINDOWS_SOURCES) {
                const document = await refreshSourceDocument(source);
                if (document) {
                    nextDocuments.push(document);
                }
            }
            documents = nextDocuments;
            lastRefreshReason = "full-refresh";
            lastRefreshedAt = nextDocuments.length > 0 ? now().toISOString() : lastRefreshedAt;
            await persist();
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
            return documents.filter((document) => sourceStates.get(document.sourceId)?.enabled !== false);
        },
        getStatus() {
            const mirrorFresh = lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false;
            const sources = listSources();
            return {
                ready: documents.filter((document) => sourceStates.get(document.sourceId)?.enabled !== false).length > 0,
                documentCount: documents.filter((document) => sourceStates.get(document.sourceId)?.enabled !== false).length,
                lastRefreshedAt,
                lastRefreshReason,
                mirrorFresh,
                policy: defaultPolicy,
                allowedDomains: [...OFFICIAL_WINDOWS_ALLOWED_DOMAINS],
                sourceCount: sources.length,
                enabledSourceCount: sources.filter((source) => source.enabled).length,
                sources
            };
        },
        async query(query, queryOptions = {}) {
            const trimmed = query.trim();
            if (!trimmed || !looksLikeWindowsKnowledgeQuery(trimmed, queryOptions.route)) {
                return null;
            }
            const policy = queryOptions.policy ?? defaultPolicy;
            const mirrorFresh = lastRefreshedAt != null ? now().getTime() - new Date(lastRefreshedAt).getTime() <= MIRROR_STALE_AFTER_MS : false;
            const visibleDocuments = documents.filter((document) => sourceStates.get(document.sourceId)?.enabled !== false);
            let hits = visibleDocuments
                .map((document) => rankDocument(document, trimmed, queryOptions.windowsVersionHint))
                .filter((hit) => Boolean(hit))
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_QUERY_HITS);
            let source = hits.length > 0 ? "mirror" : "none";
            if (policy === "live-fallback" &&
                allowLiveFetch &&
                queryOptions.allowLiveFetch !== false &&
                hits.length === 0) {
                const candidates = chooseLiveFallbackSources(trimmed);
                for (const sourceCandidate of candidates) {
                    if (sourceStates.get(sourceCandidate.id)?.enabled === false) {
                        continue;
                    }
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
                        documents = [document, ...documents.filter((item) => item.id !== document.id)];
                        updateSourceState(sourceCandidate.id, {
                            lastFetchedAt: document.fetchedAt,
                            lastStatus: "fetched",
                            error: null,
                            documentCount: 1
                        });
                        lastRefreshedAt = now().toISOString();
                        await persist();
                    }
                    catch {
                        continue;
                    }
                }
                hits = documents
                    .map((document) => rankDocument(document, trimmed, queryOptions.windowsVersionHint))
                    .filter((hit) => Boolean(hit))
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
            };
        },
        refresh,
        async refreshSource(sourceId, reason = "manual-source-refresh") {
            const source = CURATED_OFFICIAL_WINDOWS_SOURCES.find((entry) => entry.id === sourceId);
            if (!source) {
                return [];
            }
            if (!allowLiveFetch) {
                await persist();
                return documents.filter((document) => document.sourceId === sourceId);
            }
            const document = await refreshSourceDocument(source);
            lastRefreshReason = reason;
            if (document) {
                documents = [document, ...documents.filter((item) => item.id !== document.id)];
                lastRefreshedAt = now().toISOString();
            }
            await persist();
            return documents.filter((item) => item.sourceId === sourceId);
        },
        listSources() {
            return listSources();
        },
        async setSourceEnabled(sourceId, enabled) {
            const source = CURATED_OFFICIAL_WINDOWS_SOURCES.find((entry) => entry.id === sourceId);
            if (!source) {
                return null;
            }
            const next = updateSourceState(sourceId, {
                enabled,
                lastStatus: enabled ? "idle" : "disabled",
                error: enabled ? null : null,
                documentCount: enabled ? documents.filter((document) => document.sourceId === sourceId).length : 0
            });
            if (!enabled) {
                documents = documents.filter((document) => document.sourceId !== sourceId);
            }
            await persist();
            return next;
        },
        close() {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        }
    };
};
export * from "./catalog";
