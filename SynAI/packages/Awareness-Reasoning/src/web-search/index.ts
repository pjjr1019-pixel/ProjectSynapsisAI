import { ensureLocalEnvLoaded } from "../local-ai/env";
import type { WebSearchContext, WebSearchResult } from "../contracts/memory";

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

interface WebSearchConfig {
  enabled: boolean;
  maxResults: number;
  timeoutMs: number;
}

const decodeEntities = (text: string): string =>
  text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const stripTags = (text: string): string => decodeEntities(text).replace(/<[^>]+>/g, " ");

const normalizeText = (text: string): string =>
  stripTags(text)
    .replace(/\s+/g, " ")
    .trim();

const readTag = (block: string, tagName: string): string | null => {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? normalizeText(match[1]) : null;
};

const readSource = (block: string): string => {
  const source = readTag(block, "source");
  return source || "Unknown source";
};

const getWebSearchConfig = (): WebSearchConfig => {
  ensureLocalEnvLoaded();

  return {
    enabled: (process.env.WEB_SEARCH_ENABLED ?? "true").toLowerCase() !== "false",
    maxResults: Number.parseInt(process.env.WEB_SEARCH_MAX_RESULTS ?? `${DEFAULT_MAX_RESULTS}`, 10) || DEFAULT_MAX_RESULTS,
    timeoutMs: Number.parseInt(process.env.WEB_SEARCH_TIMEOUT_MS ?? `${DEFAULT_TIMEOUT_MS}`, 10) || DEFAULT_TIMEOUT_MS
  };
};

const createOffContext = (query: string): WebSearchContext => ({
  status: "off",
  query,
  results: []
});

const createErrorContext = (query: string, error: string): WebSearchContext => ({
  status: "error",
  query,
  results: [],
  error
});

export const shouldUseRecentWebSearch = (query: string, force = false): boolean =>
  force || RECENT_QUERY_PATTERNS.some((pattern) => pattern.test(query));

const parseGoogleNewsRss = (xml: string, maxResults: number): WebSearchResult[] => {
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
        publishedAt: readTag(item, "pubDate")
      } satisfies WebSearchResult;
    })
    .filter((item): item is WebSearchResult => item !== null)
    .slice(0, maxResults);
};

const fetchGoogleNewsRss = async (query: string, config: WebSearchConfig): Promise<WebSearchResult[]> => {
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
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveRecentWebContext = async (
  query: string,
  force = false
): Promise<WebSearchContext> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return createOffContext(trimmedQuery);
  }

  const config = getWebSearchConfig();
  if (!config.enabled || !shouldUseRecentWebSearch(trimmedQuery, force)) {
    return createOffContext(trimmedQuery);
  }

  try {
    const results = await fetchGoogleNewsRss(trimmedQuery, config);
    return {
      status: results.length > 0 ? "used" : "no_results",
      query: trimmedQuery,
      results
    };
  } catch (error) {
    return createErrorContext(
      trimmedQuery,
      error instanceof Error ? error.message : "Recent web search failed"
    );
  }
};


