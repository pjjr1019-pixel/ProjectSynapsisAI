import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import {
  ensureDir,
  normalizeSlashes,
  sha256Text,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { clearBrainRetrievalCache } from "./brain-retrieval.mjs";
import { buildBrainIrRuntime } from "./brain-ir-build.mjs";
import { clearBrainRuntimeCache, warmBrainRuntime } from "./brain-runtime-layer.mjs";
import {
  ensureBrainRuntimeHub,
  getBrainRuntimeHubPaths,
  migrateLegacyBrainRuntimeData,
} from "./brain-runtime-hub.mjs";
import {
  getCrawlerIds,
  getCrawlerSettings,
  readRuntimeSettings,
  summarizeCrawlerSettings,
  updateCrawlerSettings,
} from "./brain-runtime-settings.mjs";

const ROBOTS_CACHE_TTL_MS = 30 * 60 * 1000;
const SEEN_URL_TTL_MS = 24 * 60 * 60 * 1000;
const LEGACY_PRIMARY_CRAWLER_ID = "crawler1";

const INTERACTIVE_STATE = {
  activeRequests: 0,
  lastInteractiveAt: Date.now(),
};

const runtimeStates = new Map();

let artifactRefreshChain = Promise.resolve();

function getOrCreateCrawlerState(crawlerId) {
  if (!runtimeStates.has(crawlerId)) {
    runtimeStates.set(crawlerId, {
      started: false,
      timer: null,
      activeFetchWorkers: 0,
      cycleActive: false,
      stopRequested: false,
      activeControllers: new Set(),
      robotsCache: new Map(),
      logger: console,
    });
  }
  return runtimeStates.get(crawlerId);
}

const CRAWL_STATS_CONTENT_TYPE_RE =
  /^(?:text\/html|text\/plain|application\/xhtml\+xml|application\/json|application\/(?:rss|atom)\+xml|application\/xml|text\/xml)\b/i;

const CRAWL_STATS_ASSET_PATH_RE =
  /\.(?:css|js|mjs|map|woff2?|ttf|eot|otf|png|jpe?g|gif|webp|svg|ico|pdf|zip|gz|bz2|mp3|mp4|webm|mov|avi)(?:$|[?#])/i;

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function appendJsonl(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJsonl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function latestJsonlFile(root) {
  if (!fs.existsSync(root)) return null;
  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".jsonl"))
    .sort()
    .map((name) => path.join(root, name));
  return files.length ? files[files.length - 1] : null;
}

function compactUrl(url) {
  try {
    const parsed = new URL(String(url ?? ""));
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.hostname}${pathname}`.slice(0, 96);
  } catch {
    return String(url ?? "").slice(0, 96);
  }
}

function formatTerminalTs(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts ?? "").slice(11, 19);
  return date.toISOString().slice(11, 19);
}

function walkFilesRecursive(root) {
  if (!root || !fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFilesRecursive(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function summarizeDirectory(root, opts = {}) {
  const filter = typeof opts.filter === "function" ? opts.filter : null;
  const files = walkFilesRecursive(root).filter((filePath) => (filter ? filter(filePath) : true));
  const bytes = files.reduce((sum, filePath) => {
    try {
      return sum + Number(fs.statSync(filePath).size || 0);
    } catch {
      return sum;
    }
  }, 0);
  return {
    files,
    count: files.length,
    bytes,
  };
}

function getJsonlFileForDay(root, day) {
  if (!root || !day) return null;
  const filePath = path.join(root, `${day}.jsonl`);
  return fs.existsSync(filePath) ? filePath : null;
}

function isShareOrIntentUrl(url) {
  try {
    const parsed = new URL(String(url ?? ""));
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    if ((host === "twitter.com" || host === "x.com") && pathname.startsWith("/intent/")) return true;
    if (host === "facebook.com" && pathname.startsWith("/sharer")) return true;
    if (host === "linkedin.com" && pathname.startsWith("/sharearticle")) return true;
    if (host === "whatsapp.com" && pathname.startsWith("/send")) return true;
    if (host === "pinterest.com" && pathname.startsWith("/pin/create")) return true;
    return false;
  } catch {
    return false;
  }
}

function shouldCountProcessedDocForStats(doc) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.duplicate === true) return false;
  if (!CRAWL_STATS_CONTENT_TYPE_RE.test(String(doc.contentType || ""))) return false;
  const url = String(doc.url || "");
  if (!url) return false;
  if (isShareOrIntentUrl(url) || CRAWL_STATS_ASSET_PATH_RE.test(url)) return false;
  const text = cleanWhitespace(String(doc.text || ""));
  if (!text) return false;
  return true;
}

function classifyFetchStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value || value === "promoted") return "promoted";
  if (/^http_\d{3}$/.test(value)) return "error";
  if (value.endsWith("_error") || value.endsWith("_failed")) return "error";
  if (value === "robots_blocked") return "error";
  return "skipped";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUrlHostname(input) {
  try {
    return new URL(String(input ?? "")).hostname || "";
  } catch {
    return "";
  }
}

function getCrawlerFilePaths(crawlerId) {
  const hub = ensureBrainRuntimeHub();
  return {
    hub,
    queueFile: path.join(hub.queueRoot, `${crawlerId}.json`),
    statusFile: path.join(hub.stateRoot, `idle-training-status-${crawlerId}.json`),
    seenUrlsFile: path.join(hub.stateRoot, `seen-urls-${crawlerId}.json`),
    missTopicsFile: path.join(hub.stateRoot, `miss-topics-${crawlerId}.json`),
    domainStateFile: path.join(hub.stateRoot, `domain-state-${crawlerId}.json`),
    legacyQueueFile: crawlerId === LEGACY_PRIMARY_CRAWLER_ID ? hub.queueFile : null,
    legacyStatusFile: crawlerId === LEGACY_PRIMARY_CRAWLER_ID ? hub.learningStatusFile : null,
    legacySeenUrlsFile: crawlerId === LEGACY_PRIMARY_CRAWLER_ID ? hub.seenUrlsFile : null,
    legacyMissTopicsFile: crawlerId === LEGACY_PRIMARY_CRAWLER_ID ? hub.missTopicsFile : null,
    legacyDomainStateFile: crawlerId === LEGACY_PRIMARY_CRAWLER_ID ? hub.domainStateFile : null,
  };
}

function readCrawlerJson(filePath, fallback, legacyFilePath = null) {
  if (fs.existsSync(filePath)) return readJson(filePath, fallback);
  if (legacyFilePath && fs.existsSync(legacyFilePath)) return readJson(legacyFilePath, fallback);
  return fallback;
}

function writeCrawlerJson(filePath, payload, legacyFilePath = null) {
  writeJsonStable(filePath, payload);
  if (legacyFilePath) {
    writeJsonStable(legacyFilePath, payload);
  }
}

function loadQueue(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  const queue = readCrawlerJson(files.queueFile, [], files.legacyQueueFile);
  return Array.isArray(queue) ? queue : [];
}

function saveQueue(queue, crawlerId, maxQueueSize) {
  const files = getCrawlerFilePaths(crawlerId);
  writeCrawlerJson(files.queueFile, queue.slice(0, maxQueueSize), files.legacyQueueFile);
}

function loadSeenUrls(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  return readCrawlerJson(files.seenUrlsFile, {}, files.legacySeenUrlsFile);
}

function saveSeenUrls(payload, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  writeCrawlerJson(files.seenUrlsFile, payload, files.legacySeenUrlsFile);
}

function loadDomainState(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  return readCrawlerJson(files.domainStateFile, {}, files.legacyDomainStateFile);
}

function saveDomainState(payload, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  writeCrawlerJson(files.domainStateFile, payload, files.legacyDomainStateFile);
}

function loadMissTopics(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  return readCrawlerJson(files.missTopicsFile, {}, files.legacyMissTopicsFile);
}

function saveMissTopics(payload, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  writeCrawlerJson(files.missTopicsFile, payload, files.legacyMissTopicsFile);
}

function readStatus(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  return readCrawlerJson(
    files.statusFile,
    {
      crawlerId,
      active: false,
      enabled: false,
      lastRunStartedAt: null,
      lastRunFinishedAt: null,
      lastPromotionCount: 0,
      lastCycleId: null,
      lastError: null,
      queueSize: 0,
      lastManifestPath: null,
    },
    files.legacyStatusFile
  );
}

function writeStatus(patch = {}, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const files = getCrawlerFilePaths(crawlerId);
  const prev = readStatus(crawlerId);
  const next = {
    ...prev,
    ...patch,
    crawlerId,
    updatedAt: nowIso(),
  };
  writeCrawlerJson(files.statusFile, next, files.legacyStatusFile);
  return next;
}

function logFetch(event) {
  const day = nowIso().slice(0, 10);
  appendJsonl(path.join(ensureBrainRuntimeHub().fetchLogsRoot, `${day}.jsonl`), {
    ts: nowIso(),
    ...event,
  });
}

function logJob(event) {
  const day = nowIso().slice(0, 10);
  appendJsonl(path.join(ensureBrainRuntimeHub().jobLogsRoot, `${day}.jsonl`), {
    ts: nowIso(),
    ...event,
  });
}

function normalizeUrl(input) {
  try {
    const url = new URL(String(input ?? "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isLikelyBinary(url, contentType = "") {
  const lower = `${url} ${contentType}`.toLowerCase();
  return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|gz|mp4|mp3|woff2?|ttf|eot)(?:$|[?#])/.test(lower);
}

function slugFromUrl(url) {
  return sha256Text(String(url)).slice(0, 16);
}

function cleanWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  return cleanWhitespace(
    String(html ?? "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  );
}

function extractTitle(html, fallback = "") {
  const match = String(html ?? "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanWhitespace(match?.[1] || fallback);
}

function extractLinks(html, baseUrl, maxLinks) {
  const links = [];
  const seen = new Set();
  const re = /href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = re.exec(String(html ?? "")))) {
    try {
      const abs = new URL(match[1], baseUrl).toString();
      const normalized = normalizeUrl(abs);
      if (!normalized || seen.has(normalized) || isLikelyBinary(normalized)) continue;
      seen.add(normalized);
      links.push(normalized);
      if (links.length >= maxLinks) break;
    } catch {
      /* ignore bad links */
    }
  }
  return links;
}

function redactSensitiveText(text) {
  return String(text ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:sk|pk|rk|tok)_[A-Za-z0-9_-]{12,}\b/g, "[redacted-token]")
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[redacted-key]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]");
}

function sentences(text, limit = 4) {
  return cleanWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, limit);
}

function topKeywordSummary(text, limit = 8) {
  const counts = new Map();
  for (const token of tokenizeForRetrieval(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function scoreProcessedDocument({ title, text, publishDate, discoveredLinks }, seenUrls) {
  const textLen = String(text ?? "").length;
  const lengthScore = Math.min(1, textLen / 6000);
  const titleScore = String(title ?? "").trim() ? 0.18 : 0;
  const freshnessScore = publishDate ? 0.18 : 0.08;
  const linkScore = Math.min(0.12, (Array.isArray(discoveredLinks) ? discoveredLinks.length : 0) * 0.01);
  const baseScore = 0.16 + lengthScore * 0.4 + titleScore + freshnessScore + linkScore;
  const contentHash = sha256Text(String(text ?? ""));
  const duplicate = Object.values(seenUrls || {}).some(
    (row) => row && row.contentHash && row.contentHash === contentHash
  );
  return {
    contentHash,
    duplicate,
    score: duplicate ? Math.max(0, baseScore - 0.5) : Math.min(1, baseScore),
  };
}

async function fetchRobots(origin, logger, crawlerId) {
  const state = getOrCreateCrawlerState(crawlerId);
  const cached = state.robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) {
    return cached.rules;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: controller.signal });
    const text = res.ok ? await res.text() : "";
    const rules = parseRobots(text);
    state.robotsCache.set(origin, { fetchedAt: Date.now(), rules });
    return rules;
  } catch (error) {
    logger?.warn?.(`[idle-training:${crawlerId}] robots.txt fetch failed for ${origin}: ${error?.message || error}`);
    const permissive = { allows: [], disallows: [] };
    state.robotsCache.set(origin, { fetchedAt: Date.now(), rules: permissive });
    return permissive;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobots(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  let applies = false;
  const rules = { allows: [], disallows: [] };
  for (const line of lines) {
    const clean = line.replace(/#.*$/, "").trim();
    if (!clean) continue;
    const [rawKey, ...rest] = clean.split(":");
    const key = String(rawKey || "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      applies = value === "*" || value.toLowerCase() === "horizons-ai";
      continue;
    }
    if (!applies) continue;
    if (key === "disallow" && value) rules.disallows.push(value);
    if (key === "allow" && value) rules.allows.push(value);
  }
  return rules;
}

function pathAllowedByRobots(url, rules) {
  const pathname = new URL(url).pathname || "/";
  const allow = (rules?.allows || []).some((prefix) => pathname.startsWith(prefix));
  const disallow = (rules?.disallows || []).some((prefix) => prefix !== "/" && pathname.startsWith(prefix));
  if (allow) return true;
  return !disallow;
}

function shouldSkipRecentSeen(url, seenUrls) {
  const seen = seenUrls?.[url];
  if (!seen?.lastFetchedAt) return false;
  const age = Date.now() - new Date(seen.lastFetchedAt).getTime();
  return Number.isFinite(age) && age < SEEN_URL_TTL_MS;
}

function enqueueUrls(queue, urls, source, settings) {
  const maxQueueSize = settings.learning.maxQueueSize;
  const seen = new Set(queue.map((row) => row.url));
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (!normalized || seen.has(normalized)) continue;
    queue.push({
      url: normalized,
      source,
      addedAt: nowIso(),
    });
    seen.add(normalized);
    if (queue.length >= maxQueueSize) break;
  }
  return queue;
}

function enqueueMissTopicSearches(queue, settings, crawlerId) {
  const missTopics = loadMissTopics(crawlerId);
  const updates = { ...missTopics };
  const candidates = Object.entries(missTopics)
    .filter(([, row]) => Number(row?.count || 0) >= 3 && !row?.enqueuedAt)
    .sort((a, b) => Number(b[1].count || 0) - Number(a[1].count || 0))
    .slice(0, 3);
  for (const [topic] of candidates) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(topic)}`;
    enqueueUrls(queue, [searchUrl], "miss-topic", settings);
    updates[topic] = {
      ...updates[topic],
      enqueuedAt: nowIso(),
    };
  }
  saveMissTopics(updates, crawlerId);
}

function buildPromotedMarkdown(record) {
  const summaryLines = sentences(record.text, 4).map((line) => `- ${line}`).join("\n") || "- none";
  const keywords = topKeywordSummary(record.text, 8).map((term) => `- ${term}`).join("\n") || "- none";
  return [
    "---",
    `id: hz.web.${record.slug}`,
    `title: "${String(record.title || record.url).replace(/"/g, "'")}"`,
    "domain: web",
    "app: assistant",
    "kind: external-summary",
    "status: canonical",
    `confidence: ${Number(record.score || 0.55).toFixed(2)}`,
    `reviewedAt: "${record.fetchedAt}"`,
    `sourceUrl: "${record.url}"`,
    "---",
    "",
    `# ${record.title || record.url}`,
    "",
    `Source: ${record.url}`,
    "",
    `Fetched at: ${record.fetchedAt}`,
    "",
    "## Summary",
    "",
    summaryLines,
    "",
    "## Keywords",
    "",
    keywords,
    "",
    "## Excerpt",
    "",
    cleanWhitespace(record.text).slice(0, 3000),
    "",
  ].join("\n");
}

function persistCycleManifest(manifest) {
  const filePath = path.join(
    ensureBrainRuntimeHub().manifestsRoot,
    `cycle-${String(manifest.startedAt).replace(/[:.]/g, "-")}-${manifest.crawlerId}.json`
  );
  writeJsonStable(filePath, manifest);
  return filePath;
}

async function processUrl(entry, settings, seenUrls, domainState, logger, crawlerId) {
  const url = normalizeUrl(entry?.url);
  if (!url) {
    return { status: "invalid_url", discoveredUrls: [], promotedPath: null, promotionCount: 0 };
  }
  if (shouldSkipRecentSeen(url, seenUrls)) {
    return { status: "recently_seen", discoveredUrls: [], promotedPath: null, promotionCount: 0 };
  }
  const parsed = new URL(url);
  const cooldown = Number(domainState?.[parsed.hostname]?.lastFetchedAt || 0);
  if (cooldown && Date.now() - cooldown < settings.learning.perDomainCooldownMs) {
    return { status: "domain_cooldown", discoveredUrls: [], promotedPath: null, promotionCount: 0 };
  }
  const robots = await fetchRobots(parsed.origin, logger, crawlerId);
  if (!pathAllowedByRobots(url, robots)) {
    return { status: "robots_blocked", discoveredUrls: [], promotedPath: null, promotionCount: 0 };
  }

  const state = getOrCreateCrawlerState(crawlerId);
  const controller = new AbortController();
  state.activeControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), settings.learning.fetchTimeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HorizonsAI/1.0 (+local brain runtime learner)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.2",
      },
    });
    const contentType = String(res.headers.get("content-type") || "");
    if (!res.ok) {
      return { status: `http_${res.status}`, discoveredUrls: [], promotedPath: null, promotionCount: 0 };
    }
    if (isLikelyBinary(url, contentType)) {
      return { status: "binary_skipped", discoveredUrls: [], promotedPath: null, promotionCount: 0 };
    }
    const rawBody = await res.text();
    const title = extractTitle(rawBody, parsed.hostname);
    const text = redactSensitiveText(
      contentType.includes("html") ? stripHtml(rawBody) : cleanWhitespace(rawBody)
    ).slice(0, settings.learning.maxStoredTextChars);
    const discoveredUrls = contentType.includes("html")
      ? extractLinks(rawBody, url, settings.learning.maxDiscoveredLinksPerPage)
      : [];
    const publishDateMatch = rawBody.match(
      /\b(20\d{2}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d)?Z?)?)\b/
    );
    const publishDate = publishDateMatch?.[1] || null;
    const fetchedAt = nowIso();
    const scored = scoreProcessedDocument({ title, text, publishDate, discoveredLinks: discoveredUrls }, seenUrls);
    const slug = slugFromUrl(url);
    const paths = ensureBrainRuntimeHub();
    const rawFile = path.join(paths.rawRoot, `${slug}.json`);
    const processedFile = path.join(paths.processedRoot, `${slug}.json`);
    const quarantineFile = path.join(paths.quarantineRoot, `${slug}.json`);
    const payload = {
      crawlerId,
      url,
      title,
      fetchedAt,
      publishDate,
      contentType,
      source: entry?.source || "seed",
      discoveredUrls,
      text,
      score: scored.score,
      contentHash: scored.contentHash,
      duplicate: scored.duplicate,
      slug,
    };
    writeJsonStable(rawFile, { ...payload, rawSample: text.slice(0, 6000) });
    if (text.length < 350 || scored.score < 0.42 || scored.duplicate) {
      writeJsonStable(quarantineFile, {
        ...payload,
        quarantineReason:
          text.length < 350 ? "too_short" : scored.duplicate ? "duplicate" : "low_quality",
      });
      return {
        status: text.length < 350 ? "too_short" : scored.duplicate ? "duplicate" : "low_quality",
        discoveredUrls,
        promotedPath: null,
        promotionCount: 0,
        payload,
      };
    }
    writeJsonStable(processedFile, payload);
    const dayDir = path.join(paths.promotedRoot, fetchedAt.slice(0, 10));
    ensureDir(dayDir);
    const promotedPath = path.join(dayDir, `${slug}.md`);
    fs.writeFileSync(promotedPath, buildPromotedMarkdown(payload), "utf8");
    return {
      status: "promoted",
      discoveredUrls,
      promotedPath,
      promotionCount: 1,
      payload,
    };
  } finally {
    clearTimeout(timeout);
    state.activeControllers.delete(controller);
    domainState[parsed.hostname] = { lastFetchedAt: Date.now() };
  }
}

function refreshRuntimeArtifacts(logger) {
  buildBrainIrRuntime({ logger: logger || console });
  clearBrainRuntimeCache();
  clearBrainRetrievalCache();
  warmBrainRuntime({ logger: logger || console, verifyHashes: false });
}

function queueRuntimeArtifactRefresh(logger) {
  const run = async () => refreshRuntimeArtifacts(logger);
  const pending = artifactRefreshChain.then(run, run);
  artifactRefreshChain = pending.catch(() => {});
  return pending;
}

function nextQueueBatch(queue, maxUrlsPerCycle) {
  const batch = [];
  const rest = [];
  for (const entry of queue) {
    if (batch.length < maxUrlsPerCycle) batch.push(entry);
    else rest.push(entry);
  }
  return { batch, rest };
}

async function runParallelFetchBatch(batch, settings, seenUrls, domainState, logger, cycleId, crawlerId) {
  const state = getOrCreateCrawlerState(crawlerId);
  const activeDomains = new Set();
  const entries = batch.map((entry, index) => ({
    ...entry,
    __index: index,
    __claimed: false,
    __done: false,
  }));
  const promotedPaths = [];
  const discoveredUrls = [];
  const fetchResults = [];

  function claimNextEntry() {
    for (const entry of entries) {
      if (entry.__claimed) continue;
      const hostname = getUrlHostname(entry.url);
      if (hostname && activeDomains.has(hostname)) continue;
      entry.__claimed = true;
      if (hostname) activeDomains.add(hostname);
      return { entry, hostname };
    }
    return null;
  }

  async function worker(workerId) {
    while (true) {
      if (state.stopRequested) return;
      const claimed = claimNextEntry();
      if (!claimed) {
        if (!entries.some((entry) => !entry.__claimed)) return;
        await sleep(20);
        continue;
      }

      const { entry, hostname } = claimed;
      state.activeFetchWorkers += 1;
      logJob({ level: "info", crawlerId, cycleId, workerId, event: "worker_claimed", url: entry.url });

      try {
        const result = await processUrl(entry, settings, seenUrls, domainState, logger, crawlerId);
        entry.__done = true;
        fetchResults.push({ url: entry.url, status: result.status, workerId });
        if (result.discoveredUrls?.length) discoveredUrls.push(...result.discoveredUrls);
        if (result.payload) {
          seenUrls[entry.url] = {
            url: entry.url,
            status: result.status,
            lastFetchedAt: nowIso(),
            contentHash: result.payload.contentHash,
            promotedPath: result.promotedPath ? normalizeSlashes(result.promotedPath) : "",
          };
        }
        if (result.promotedPath) promotedPaths.push(normalizeSlashes(result.promotedPath));
        logFetch({
          crawlerId,
          cycleId,
          workerId,
          url: entry.url,
          status: result.status,
          promotedPath: result.promotedPath ? normalizeSlashes(result.promotedPath) : null,
        });
      } catch (error) {
        entry.__done = true;
        const message = String(error?.message || error);
        fetchResults.push({ url: entry.url, status: "fetch_error", error: message, workerId });
        logFetch({
          crawlerId,
          cycleId,
          workerId,
          url: entry.url,
          status: "fetch_error",
          error: message,
          promotedPath: null,
        });
      } finally {
        state.activeFetchWorkers = Math.max(0, state.activeFetchWorkers - 1);
        if (hostname) activeDomains.delete(hostname);
        logJob({ level: "info", crawlerId, cycleId, workerId, event: "worker_released", url: entry.url });
      }
    }
  }

  const workerCount = Math.max(
    1,
    Math.min(Number(settings.learning.parallelFetchWorkers) || 1, batch.length || 1)
  );
  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1)));

  const unprocessedEntries = entries
    .filter((entry) => !entry.__done)
    .map(({ __index, __claimed, __done, ...rest }) => rest);

  if (state.stopRequested) {
    for (const entry of unprocessedEntries) {
      fetchResults.push({ url: entry.url, status: "stopped" });
    }
  }

  return {
    promotedPaths,
    discoveredUrls,
    fetchResults,
    unprocessedEntries,
  };
}

export function noteIdleTrainingActivityStart() {
  INTERACTIVE_STATE.activeRequests += 1;
  INTERACTIVE_STATE.lastInteractiveAt = Date.now();
}

export function noteIdleTrainingActivityEnd() {
  INTERACTIVE_STATE.activeRequests = Math.max(0, INTERACTIVE_STATE.activeRequests - 1);
  INTERACTIVE_STATE.lastInteractiveAt = Date.now();
}

/**
 * Return a snapshot of the interactive state for the optimizer telemetry collector.
 * @returns {{ activeRequests: number, lastInteractiveAt: number }}
 */
export function getInteractiveState() {
  return { ...INTERACTIVE_STATE };
}

export function recordIdleLearningMiss(message, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const text = cleanWhitespace(message);
  if (!text || text.length < 12) return;
  const topic = tokenizeForRetrieval(text).slice(0, 6).join(" ");
  if (!topic) return;
  const missTopics = loadMissTopics(crawlerId);
  const prev = missTopics[topic] || { count: 0 };
  missTopics[topic] = {
    ...prev,
    count: Number(prev.count || 0) + 1,
    lastSeenAt: nowIso(),
  };
  saveMissTopics(missTopics, crawlerId);
}

export function getIdleTrainingSnapshot(crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const settings = readRuntimeSettings();
  const state = getOrCreateCrawlerState(crawlerId);
  const status = readStatus(crawlerId);
  return {
    available: true,
    crawlerId,
    active: state.cycleActive,
    activeFetchWorkers: state.activeFetchWorkers,
    queueSize: loadQueue(crawlerId).length,
    ...summarizeCrawlerSettings(settings, status, crawlerId),
    status,
  };
}

export function getAllIdleTrainingSnapshots() {
  const settings = readRuntimeSettings();
  return getCrawlerIds(settings).map((crawlerId) => getIdleTrainingSnapshot(crawlerId));
}

export function getIdleTrainingStatsSnapshot(opts = {}) {
  const crawlerId = opts.crawlerId || LEGACY_PRIMARY_CRAWLER_ID;
  const idle = opts.idleSnapshot || getIdleTrainingSnapshot(crawlerId);
  const paths = opts.paths || ensureBrainRuntimeHub();
  const day = String(opts.day || nowIso().slice(0, 10));

  const rawSummary = summarizeDirectory(paths.rawRoot);
  const processedSummary = summarizeDirectory(paths.processedRoot, {
    filter: (filePath) => filePath.endsWith(".json"),
  });
  const promotedSummary = summarizeDirectory(paths.promotedRoot, {
    filter: (filePath) => !normalizeSlashes(filePath).includes("/digests/"),
  });
  const quarantineSummary = summarizeDirectory(paths.quarantineRoot);

  const contentHosts = new Set();
  let contentPageCount = 0;

  for (const filePath of processedSummary.files) {
    const doc = readJson(filePath, null);
    if (!shouldCountProcessedDocForStats(doc)) continue;
    contentPageCount += 1;
    try {
      contentHosts.add(new URL(String(doc.url || "")).hostname.toLowerCase());
    } catch {
      /* ignore bad urls in stats */
    }
  }

  const jobRows = readJsonl(getJsonlFileForDay(paths.jobLogsRoot, day));
  const fetchRows = readJsonl(getJsonlFileForDay(paths.fetchLogsRoot, day));
  const finishedCycles = jobRows.filter(
    (row) => row?.event === "cycle_finished" && (!row?.crawlerId || row.crawlerId === crawlerId)
  );

  let errorCount = 0;
  let skippedCount = 0;
  for (const row of fetchRows) {
    if (row?.crawlerId && row.crawlerId !== crawlerId) continue;
    const classification = classifyFetchStatus(row?.status);
    if (classification === "error") errorCount += 1;
    if (classification === "skipped") skippedCount += 1;
  }

  return {
    totals: {
      contentSiteCount: contentHosts.size,
      contentPageCount,
      promotedDocCount: promotedSummary.count,
      savedBytesTotal:
        rawSummary.bytes + processedSummary.bytes + promotedSummary.bytes + quarantineSummary.bytes,
      savedBytesByTier: {
        raw: rawSummary.bytes,
        processed: processedSummary.bytes,
        promoted: promotedSummary.bytes,
        quarantine: quarantineSummary.bytes,
      },
    },
    today: {
      cycleCount: finishedCycles.length,
      promotionCount: finishedCycles.reduce((sum, row) => sum + Number(row?.promotionCount || 0), 0),
      errorCount,
      skippedCount,
    },
    live: {
      queueSize: Number(idle.queueSize || 0),
      lastRunAt: idle.lastRunAt ?? null,
      active: idle.active === true,
    },
  };
}

function latestRunAt(crawlers) {
  return (
    crawlers
      .map((crawler) => crawler.lastRunAt)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null
  );
}

export function getIdleTrainingSystemSnapshot(opts = {}) {
  const crawlers = getAllIdleTrainingSnapshots();
  const aggregateIdle = {
    queueSize: crawlers.reduce((sum, crawler) => sum + Number(crawler.queueSize || 0), 0),
    lastRunAt: latestRunAt(crawlers),
    active: crawlers.some((crawler) => crawler.active === true),
  };
  return {
    available: true,
    crawlers,
    activeCrawlerCount: crawlers.filter((crawler) => crawler.active).length,
    enabledCrawlerCount: crawlers.filter((crawler) => crawler.idleTrainingEnabled).length,
    totalQueueSize: aggregateIdle.queueSize,
    totalActiveFetchWorkers: crawlers.reduce(
      (sum, crawler) => sum + Number(crawler.activeFetchWorkers || 0),
      0
    ),
    stats: getIdleTrainingStatsSnapshot({
      idleSnapshot: aggregateIdle,
      crawlerId: LEGACY_PRIMARY_CRAWLER_ID,
      day: opts.day,
    }),
  };
}

export function getIdleTrainingTerminalSnapshot(opts = {}) {
  const crawlerId = opts.crawlerId || LEGACY_PRIMARY_CRAWLER_ID;
  const limit = Math.max(10, Math.min(200, Number(opts.limit) || 80));
  const includeStats = opts.includeStats !== false;
  const idle = getIdleTrainingSnapshot(crawlerId);
  const paths = ensureBrainRuntimeHub();
  const rows = [];

  const jobFile = latestJsonlFile(paths.jobLogsRoot);
  const fetchFile = latestJsonlFile(paths.fetchLogsRoot);

  for (const row of jobFile ? readJsonl(jobFile) : []) {
    if (row?.crawlerId && row.crawlerId !== crawlerId) continue;
    rows.push({
      ts: row.ts || "",
      line: `${formatTerminalTs(row.ts)} [job ${crawlerId}${row.workerId ? ` w${row.workerId}` : ""}] ${
        row.event || row.level || "event"
      }${row.cycleId ? ` ${row.cycleId}` : ""}${row.error ? ` - ${row.error}` : ""}`,
    });
  }
  for (const row of fetchFile ? readJsonl(fetchFile) : []) {
    if (row?.crawlerId && row.crawlerId !== crawlerId) continue;
    rows.push({
      ts: row.ts || "",
      line: `${formatTerminalTs(row.ts)} [fetch ${crawlerId}${row.workerId ? ` w${row.workerId}` : ""}] ${
        row.status || "status"
      }${row.url ? ` ${compactUrl(row.url)}` : ""}${row.error ? ` - ${row.error}` : ""}`,
    });
  }

  rows.sort((a, b) => {
    const at = new Date(a.ts).getTime();
    const bt = new Date(b.ts).getTime();
    return at - bt;
  });

  return {
    ...idle,
    ...(includeStats
      ? { stats: getIdleTrainingStatsSnapshot({ idleSnapshot: idle, paths, day: opts.day, crawlerId }) }
      : {}),
    lines: rows.slice(-limit).map((row) => row.line),
  };
}

function requestIdleTrainingStop(crawlerId) {
  const state = getOrCreateCrawlerState(crawlerId);
  state.stopRequested = true;
  stopIdleTrainingLoop(crawlerId);
  for (const controller of state.activeControllers) {
    try {
      controller.abort();
    } catch {
      /* ignore */
    }
  }
  logJob({ level: "info", crawlerId, event: "stop_requested" });
}

export function setIdleTrainingEnabled(enabled, crawlerId = LEGACY_PRIMARY_CRAWLER_ID) {
  const settings = updateCrawlerSettings(crawlerId, { enabled: enabled === true });
  const crawlerSettings = getCrawlerSettings(settings, crawlerId);
  const status = writeStatus({ enabled: crawlerSettings.enabled }, crawlerId);
  if (crawlerSettings.enabled) {
    const state = getOrCreateCrawlerState(crawlerId);
    state.stopRequested = false;
    startCrawlerWorker(crawlerId);
    scheduleIdleTrainingLoop(crawlerId, { immediate: true, forceCycle: true });
  } else {
    requestIdleTrainingStop(crawlerId);
  }
  return {
    settings,
    ...summarizeCrawlerSettings(settings, status, crawlerId),
    status,
  };
}

export async function runIdleTrainingCycle(opts = {}) {
  migrateLegacyBrainRuntimeData();
  const crawlerId = opts.crawlerId || LEGACY_PRIMARY_CRAWLER_ID;
  const state = getOrCreateCrawlerState(crawlerId);
  const logger = opts.logger || state.logger || console;
  const settings = readRuntimeSettings();
  const crawlerSettings = getCrawlerSettings(settings, crawlerId);
  const status = readStatus(crawlerId);
  if (!crawlerSettings.enabled && opts.force !== true) {
    return { skipped: "disabled", settings, status, crawlerId };
  }
  if (state.cycleActive) {
    return { skipped: "already_running", settings, status, crawlerId };
  }
  if (INTERACTIVE_STATE.activeRequests > 0 && opts.force !== true) {
    return { skipped: "busy", settings, status, crawlerId };
  }
  if (Date.now() - INTERACTIVE_STATE.lastInteractiveAt < crawlerSettings.learning.idleGraceMs && opts.force !== true) {
    return { skipped: "idle_grace", settings, status, crawlerId };
  }

  state.cycleActive = true;
  state.stopRequested = false;
  const startedAt = nowIso();
  const cycleId = `cycle-${startedAt.replace(/[:.]/g, "-")}-${crawlerId}`;
  writeStatus(
    {
      active: true,
      enabled: crawlerSettings.enabled,
      lastRunStartedAt: startedAt,
      lastCycleId: cycleId,
      lastError: null,
    },
    crawlerId
  );
  logJob({
    level: "info",
    crawlerId,
    cycleId,
    event: "cycle_started",
    parallelFetchWorkers: crawlerSettings.learning.parallelFetchWorkers,
  });

  let queue = loadQueue(crawlerId);
  queue = enqueueUrls(queue, crawlerSettings.learning.seedUrls, "seed", crawlerSettings);
  enqueueMissTopicSearches(queue, crawlerSettings, crawlerId);
  const { batch, rest } = nextQueueBatch(queue, crawlerSettings.learning.maxUrlsPerCycle);
  const seenUrls = loadSeenUrls(crawlerId);
  const domainState = loadDomainState(crawlerId);
  const promotedPaths = [];
  const discoveredUrls = [];
  const fetchResults = [];

  try {
    const batchResult = await runParallelFetchBatch(
      batch,
      crawlerSettings,
      seenUrls,
      domainState,
      logger,
      cycleId,
      crawlerId
    );
    promotedPaths.push(...batchResult.promotedPaths);
    discoveredUrls.push(...batchResult.discoveredUrls);
    fetchResults.push(...batchResult.fetchResults);

    queue = [...batchResult.unprocessedEntries, ...rest];
    queue = enqueueUrls(queue, discoveredUrls, "discovered", crawlerSettings);
    saveQueue(queue, crawlerId, crawlerSettings.learning.maxQueueSize);
    saveSeenUrls(seenUrls, crawlerId);
    saveDomainState(domainState, crawlerId);

    const finishedAt = nowIso();
    const rebuildTriggered = promotedPaths.length > 0;
    const manifest = {
      artifactType: "idle-training-cycle",
      crawlerId,
      cycleId,
      startedAt,
      finishedAt,
      idleTrainingEnabled: crawlerSettings.enabled,
      sourceScope: crawlerSettings.learning.sourceScope,
      promotionMode: crawlerSettings.learning.promotionMode,
      seedUrls: crawlerSettings.learning.seedUrls,
      processedCount: batch.length,
      discoveredCount: discoveredUrls.length,
      promotionCount: promotedPaths.length,
      promotedPaths,
      rebuildTriggered,
      fetchResults,
    };
    const manifestPath = persistCycleManifest(manifest);
    if (rebuildTriggered) {
      await queueRuntimeArtifactRefresh(logger);
    }
    const nextStatus = writeStatus(
      {
        active: false,
        enabled: crawlerSettings.enabled,
        lastRunFinishedAt: finishedAt,
        lastRunAt: finishedAt,
        lastPromotionCount: promotedPaths.length,
        queueSize: queue.length,
        lastManifestPath: normalizeSlashes(manifestPath),
        lastError: null,
      },
      crawlerId
    );
    logJob({
      level: "info",
      crawlerId,
      cycleId,
      event: "cycle_finished",
      promotionCount: promotedPaths.length,
      queueSize: queue.length,
      parallelFetchWorkers: crawlerSettings.learning.parallelFetchWorkers,
    });
    return {
      crawlerId,
      cycleId,
      processedCount: batch.length,
      promotionCount: promotedPaths.length,
      queueSize: queue.length,
      manifestPath: normalizeSlashes(manifestPath),
      status: nextStatus,
      settings,
    };
  } catch (error) {
    const message = String(error?.message || error);
    const nextStatus = writeStatus(
      {
        active: false,
        enabled: crawlerSettings.enabled,
        lastRunFinishedAt: nowIso(),
        lastError: message,
        queueSize: loadQueue(crawlerId).length,
      },
      crawlerId
    );
    logJob({ level: "error", crawlerId, cycleId, event: "cycle_failed", error: message });
    return {
      crawlerId,
      cycleId,
      error: message,
      status: nextStatus,
      settings,
    };
  } finally {
    state.activeFetchWorkers = 0;
    state.cycleActive = false;
    state.stopRequested = false;
  }
}

function scheduleIdleTrainingLoop(crawlerId, opts = {}) {
  const state = getOrCreateCrawlerState(crawlerId);
  if (!state.started) return;
  const settings = readRuntimeSettings();
  const crawlerSettings = getCrawlerSettings(settings, crawlerId);
  stopIdleTrainingLoop(crawlerId);
  if (!crawlerSettings.enabled) return;
  state.timer = setTimeout(async () => {
    await runIdleTrainingCycle({
      crawlerId,
      logger: state.logger,
      force: opts.forceCycle === true,
    });
    scheduleIdleTrainingLoop(crawlerId);
  }, opts.immediate ? 50 : crawlerSettings.learning.loopIntervalMs);
}

function stopIdleTrainingLoop(crawlerId) {
  const state = getOrCreateCrawlerState(crawlerId);
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
}

function startCrawlerWorker(crawlerId, opts = {}) {
  const state = getOrCreateCrawlerState(crawlerId);
  if (state.started) return getIdleTrainingSnapshot(crawlerId);
  migrateLegacyBrainRuntimeData();
  state.logger = opts.logger || state.logger || console;
  state.started = true;
  writeStatus(
    {
      active: false,
      enabled: getCrawlerSettings(readRuntimeSettings(), crawlerId).enabled,
      queueSize: loadQueue(crawlerId).length,
    },
    crawlerId
  );
  if (getCrawlerSettings(readRuntimeSettings(), crawlerId).enabled) {
    scheduleIdleTrainingLoop(crawlerId, { immediate: false });
  }
  return getIdleTrainingSnapshot(crawlerId);
}

export function startIdleTrainingWorker(opts = {}) {
  if (opts.crawlerId) return startCrawlerWorker(opts.crawlerId, opts);
  return startIdleTrainingWorkers(opts);
}

export function startIdleTrainingWorkers(opts = {}) {
  for (const crawlerId of getCrawlerIds(readRuntimeSettings())) {
    startCrawlerWorker(crawlerId, opts);
  }
  return getIdleTrainingSystemSnapshot();
}
