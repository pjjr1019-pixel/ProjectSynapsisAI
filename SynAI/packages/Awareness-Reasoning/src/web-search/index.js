import { ensureLocalEnvLoaded } from "../local-ai/env";
const DEFAULT_TIMEOUT_MS = 3500;
const DEFAULT_MAX_RESULTS = 5;
const RECENT_QUERY_PATTERNS = [
    /\bright now\b/i,
    /\blatest\b/i,
    /\brecent\b/i,
    /\btoday\b/i,
    /\bcurrently\b/i,
    /\bcurrent\b/i,
    /\bnews\b/i,
    /\bupdate\b/i,
    /\bupdates\b/i,
    /\bhappening\b/i,
    /\bbreaking\b/i,
    /\bthis week\b/i,
    /\bthis month\b/i,
    /\bas of\b/i
];
const VOLATILE_TOPIC_PATTERNS = [
    /\bstock market\b/i,
    /\bstocks?\b/i,
    /\bmarket\b/i,
    /\bearnings\b/i,
    /\bcrypto\b/i,
    /\bitcoin\b/i,
    /\binflation\b/i,
    /\bfed\b/i,
    /\binterest rates?\b/i,
    /\belection\b/i,
    /\bweather\b/i,
    /\bnews\b/i
];
const decodeEntities = (text) => text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
const stripTags = (text) => decodeEntities(text).replace(/<[^>]+>/g, " ");
const normalizeText = (text) => stripTags(text)
    .replace(/\s+/g, " ")
    .trim();
const readTag = (block, tagName) => {
    const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
    return match ? normalizeText(match[1]) : null;
};
const readSource = (block) => {
    const source = readTag(block, "source");
    return source || "Unknown source";
};
const getWebSearchConfig = () => {
    ensureLocalEnvLoaded();
    return {
        enabled: (process.env.WEB_SEARCH_ENABLED ?? "true").toLowerCase() !== "false",
        maxResults: Number.parseInt(process.env.WEB_SEARCH_MAX_RESULTS ?? `${DEFAULT_MAX_RESULTS}`, 10) || DEFAULT_MAX_RESULTS,
        timeoutMs: Number.parseInt(process.env.WEB_SEARCH_TIMEOUT_MS ?? `${DEFAULT_TIMEOUT_MS}`, 10) || DEFAULT_TIMEOUT_MS
    };
};
const createOffContext = (query) => ({
    status: "off",
    query,
    results: []
});
const createErrorContext = (query, error) => ({
    status: "error",
    query,
    results: [],
    error
});
const normalizeSearchQuery = (query) => query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tokenizeQuery = (query) => normalizeSearchQuery(query).split(" ").filter(Boolean);
const isTimeSensitiveQuery = (query, force = false) => force ||
    RECENT_QUERY_PATTERNS.some((pattern) => pattern.test(query)) ||
    VOLATILE_TOPIC_PATTERNS.some((pattern) => pattern.test(query));
export const shouldUseRecentWebSearch = (query, force = false) => isTimeSensitiveQuery(query, force);
const parseGoogleNewsRss = (xml, maxResults) => {
    const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
    return items
        .map((item) => {
        const title = readTag(item, "title");
        const url = readTag(item, "link");
        const snippet = readTag(item, "description");
        if (!title || !url) {
            return null;
        }
        return {
            title: title.replace(/\s+-\s+[^-]+$/, ""),
            url,
            source: readSource(item),
            snippet: snippet || "No snippet available.",
            publishedAt: readTag(item, "pubDate"),
            sourceFamily: "news"
        };
    })
        .filter((item) => item !== null)
        .slice(0, maxResults);
};
const decodeSearchUrl = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return trimmed;
    }
    try {
        if (trimmed.startsWith("//")) {
            return new URL(`https:${trimmed}`).toString();
        }
        const url = new URL(trimmed.startsWith("/") ? `https://duckduckgo.com${trimmed}` : trimmed);
        const uddg = url.searchParams.get("uddg");
        if (uddg) {
            return decodeURIComponent(uddg);
        }
        return url.toString();
    }
    catch {
        return trimmed;
    }
};
const inferSourceFamily = (url, fallback = "web") => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (hostname.endsWith("learn.microsoft.com") || hostname.endsWith("support.microsoft.com")) {
            return "official-doc";
        }
        if (hostname.endsWith(".gov") ||
            hostname.endsWith(".edu") ||
            hostname.endsWith(".int") ||
            hostname.endsWith(".ac.uk") ||
            hostname.endsWith(".org")) {
            return "authoritative";
        }
        return fallback;
    }
    catch {
        return fallback;
    }
};
const inferSearchRelevance = (query, text) => {
    const normalizedHaystack = normalizeSearchQuery(text);
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) {
        return 0;
    }
    let score = 0;
    for (const token of tokenizeQuery(normalizedQuery)) {
        if (normalizedHaystack.includes(token)) {
            score += token.length >= 5 ? 4 : 2;
        }
    }
    if (normalizedHaystack.includes(normalizedQuery)) {
        score += 8;
    }
    return score;
};
const parseDuckDuckGoHtml = (html, maxResults) => {
    const resultBlocks = html.match(/<div class="result__body"[\s\S]*?<\/div>\s*<\/div>/gi) ??
        html.match(/<article[^>]*class="result"[\s\S]*?<\/article>/gi) ??
        [];
    const results = resultBlocks
        .map((block) => {
        const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/[a-z]+>/i) ??
            block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const title = titleMatch ? normalizeText(titleMatch[2]) : null;
        const rawUrl = titleMatch?.[1] ?? null;
        const url = rawUrl ? decodeSearchUrl(rawUrl) : null;
        if (!title || !url) {
            return null;
        }
        const family = inferSourceFamily(url);
        const source = (() => {
            try {
                return new URL(url).hostname.replace(/^www\./, "");
            }
            catch {
                return family;
            }
        })();
        return {
            title,
            url,
            source,
            snippet: snippetMatch ? normalizeText(snippetMatch[1]) || "No snippet available." : "No snippet available.",
            publishedAt: null,
            sourceFamily: family
        };
    })
        .filter((item) => item !== null)
        .slice(0, maxResults);
    return results;
};
const fetchGoogleNewsRss = async (query, config) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
        const feedUrl = new URL("https://news.google.com/rss/search");
        feedUrl.searchParams.set("q", query);
        feedUrl.searchParams.set("hl", "en-US");
        feedUrl.searchParams.set("gl", "US");
        feedUrl.searchParams.set("ceid", "US:en");
        const response = await fetch(feedUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "SynAI/0.1"
            }
        });
        if (!response.ok) {
            throw new Error(`Web search failed (${response.status})`);
        }
        return parseGoogleNewsRss(await response.text(), config.maxResults);
    }
    finally {
        clearTimeout(timeout);
    }
};
const fetchDuckDuckGoHtml = async (query, config) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
        const searchUrl = new URL("https://html.duckduckgo.com/html/");
        searchUrl.searchParams.set("q", query);
        const response = await fetch(searchUrl.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "SynAI/0.1",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });
        if (!response.ok) {
            throw new Error(`Web search failed (${response.status})`);
        }
        return parseDuckDuckGoHtml(await response.text(), config.maxResults);
    }
    finally {
        clearTimeout(timeout);
    }
};
const dedupeSearchResults = (results) => {
    const seen = new Set();
    const deduped = [];
    for (const result of results) {
        const key = normalizeSearchQuery(result.url);
        if (!key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(result);
    }
    return deduped;
};
const scoreSearchResult = (query, result) => {
    const queryText = normalizeSearchQuery(query);
    const titleScore = inferSearchRelevance(queryText, result.title) * 4;
    const snippetScore = inferSearchRelevance(queryText, result.snippet) * 2;
    const sourceScore = inferSearchRelevance(queryText, result.source);
    const recentBoost = (() => {
        if (!result.publishedAt) {
            return 0;
        }
        const ageMs = Date.now() - new Date(result.publishedAt).getTime();
        if (!Number.isFinite(ageMs) || ageMs < 0) {
            return 0;
        }
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays <= 1) {
            return 6;
        }
        if (ageDays <= 7) {
            return 4;
        }
        if (ageDays <= 30) {
            return 2;
        }
        return 0;
    })();
    const family = result.sourceFamily ?? inferSourceFamily(result.url);
    const familyWeight = isTimeSensitiveQuery(queryText)
        ? {
            news: 24,
            web: 14,
            "official-doc": 12,
            authoritative: 12
        }[family]
        : {
            news: 8,
            web: 16,
            "official-doc": 24,
            authoritative: 22
        }[family];
    return familyWeight + titleScore + snippetScore + sourceScore + recentBoost;
};
const rankSearchResults = (query, results) => dedupeSearchResults(results)
    .map((result) => ({
    ...result,
    sourceFamily: result.sourceFamily ?? inferSourceFamily(result.url)
}))
    .sort((left, right) => scoreSearchResult(query, right) - scoreSearchResult(query, left));
export const resolveRecentWebContext = async (query, force = false) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return createOffContext(trimmedQuery);
    }
    const config = getWebSearchConfig();
    if (!config.enabled || !shouldUseRecentWebSearch(trimmedQuery, force)) {
        return createOffContext(trimmedQuery);
    }
    try {
        const [newsResults, webResults] = await Promise.all([
            fetchGoogleNewsRss(trimmedQuery, config).catch(() => []),
            fetchDuckDuckGoHtml(trimmedQuery, config).catch(() => [])
        ]);
        const results = rankSearchResults(trimmedQuery, [...newsResults, ...webResults]).slice(0, config.maxResults);
        return {
            status: results.length > 0 ? "used" : "no_results",
            query: trimmedQuery,
            results
        };
    }
    catch (error) {
        return createErrorContext(trimmedQuery, error instanceof Error ? error.message : "Recent web search failed");
    }
};
