import fs from "node:fs";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import {
  ensureBrainRuntimeHub,
  getBrainRuntimeHubPaths,
  migrateLegacyBrainRuntimeData,
} from "./brain-runtime-hub.mjs";

const SETTINGS_SCHEMA_VERSION = "2.0";
const CRAWLER_COUNT = 10;
const DEFAULT_LOG_ACCESS_MODE = "summaries-first";
const DEFAULT_SOURCE_SCOPE = "open-web-crawl";
const DEFAULT_PROMOTION_MODE = "full-auto-promote-broadly";
const MAX_PARALLEL_FETCH_WORKERS = 4;

const DEFAULT_SEED_URLS = [
  "https://news.ycombinator.com/",
  "https://www.reuters.com/technology/",
  "https://www.reuters.com/markets/",
  "https://apnews.com/hub/technology",
  "https://apnews.com/hub/business",
  "https://www.sec.gov/news/pressreleases",
  "https://www.federalreserve.gov/newsevents/pressreleases.htm",
  "https://www.federalreserve.gov/newsevents/speech.htm",
  "https://www.bls.gov/bls/newsrels.htm",
  "https://www.census.gov/newsroom.html",
  "https://www.ftc.gov/news-events/news/press-releases",
  "https://www.consumerfinance.gov/about-us/newsroom/",
  "https://www.nist.gov/news-events/news",
  "https://www.nasa.gov/news/all-news/",
  "https://www.noaa.gov/news",
  "https://www.cdc.gov/media/index.html",
  "https://www.nih.gov/news-events/news-releases",
  "https://medlineplus.gov/",
  "https://arxiv.org/list/cs.AI/recent",
  "https://arxiv.org/list/cs.LG/recent",
  "https://en.wikipedia.org/wiki/Portal:Current_events",
  "https://en.wikinews.org/wiki/Main_Page",
  "https://developer.mozilla.org/en-US/blog/",
  "https://docs.python.org/3/whatsnew/",
  "https://nodejs.org/en/blog",
  "https://react.dev/blog",
];

export const CRAWLER_IDS = Array.from({ length: CRAWLER_COUNT }, (_, index) => `crawler${index + 1}`);

export const DEFAULT_CRAWLER_LEARNING_SETTINGS = Object.freeze({
  sourceScope: DEFAULT_SOURCE_SCOPE,
  promotionMode: DEFAULT_PROMOTION_MODE,
  parallelFetchWorkers: 1,
  idleGraceMs: 20_000,
  loopIntervalMs: 15_000,
  maxUrlsPerCycle: 8,
  maxDiscoveredLinksPerPage: 18,
  maxStoredTextChars: 28_000,
  fetchTimeoutMs: 15_000,
  perDomainCooldownMs: 30_000,
  maxQueueSize: 2_500,
  seedUrls: DEFAULT_SEED_URLS,
});

function defaultCrawler(index) {
  return {
    id: CRAWLER_IDS[index],
    enabled: false,
    logAccessMode: DEFAULT_LOG_ACCESS_MODE,
    learning: {
      ...DEFAULT_CRAWLER_LEARNING_SETTINGS,
      seedUrls: [...DEFAULT_CRAWLER_LEARNING_SETTINGS.seedUrls],
    },
  };
}

export const DEFAULT_RUNTIME_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  crawlers: CRAWLER_IDS.map((_, index) => defaultCrawler(index)),
});

function normalizeSeedUrls(seedUrls) {
  if (!Array.isArray(seedUrls)) {
    return [...DEFAULT_CRAWLER_LEARNING_SETTINGS.seedUrls];
  }
  const unique = [...new Set(seedUrls.map((url) => String(url ?? "").trim()).filter(Boolean))];
  return unique.length ? unique.slice(0, 100) : [...DEFAULT_CRAWLER_LEARNING_SETTINGS.seedUrls];
}

function normalizeLogAccessMode(value) {
  return String(value ?? "").trim().toLowerCase() === "raw-logs-direct"
    ? "raw-logs-direct"
    : DEFAULT_LOG_ACCESS_MODE;
}

function normalizeLearning(rawLearning = {}) {
  const learning = rawLearning && typeof rawLearning === "object" ? rawLearning : {};
  return {
    sourceScope:
      String(learning.sourceScope ?? "").trim().toLowerCase() === "allowlist"
        ? "allowlist"
        : DEFAULT_SOURCE_SCOPE,
    promotionMode:
      String(learning.promotionMode ?? "").trim().toLowerCase() === "auto-stage-only"
        ? "auto-stage-only"
        : DEFAULT_PROMOTION_MODE,
    parallelFetchWorkers: Math.max(
      1,
      Math.min(
        MAX_PARALLEL_FETCH_WORKERS,
        Number(learning.parallelFetchWorkers) || DEFAULT_CRAWLER_LEARNING_SETTINGS.parallelFetchWorkers
      )
    ),
    idleGraceMs: Math.max(
      5_000,
      Number(learning.idleGraceMs) || DEFAULT_CRAWLER_LEARNING_SETTINGS.idleGraceMs
    ),
    loopIntervalMs: Math.max(
      10_000,
      Number(learning.loopIntervalMs) || DEFAULT_CRAWLER_LEARNING_SETTINGS.loopIntervalMs
    ),
    maxUrlsPerCycle: Math.max(
      1,
      Math.min(12, Number(learning.maxUrlsPerCycle) || DEFAULT_CRAWLER_LEARNING_SETTINGS.maxUrlsPerCycle)
    ),
    maxDiscoveredLinksPerPage: Math.max(
      0,
      Math.min(
        50,
        Number(learning.maxDiscoveredLinksPerPage) ||
          DEFAULT_CRAWLER_LEARNING_SETTINGS.maxDiscoveredLinksPerPage
      )
    ),
    maxStoredTextChars: Math.max(
      2_000,
      Number(learning.maxStoredTextChars) || DEFAULT_CRAWLER_LEARNING_SETTINGS.maxStoredTextChars
    ),
    fetchTimeoutMs: Math.max(
      3_000,
      Number(learning.fetchTimeoutMs) || DEFAULT_CRAWLER_LEARNING_SETTINGS.fetchTimeoutMs
    ),
    perDomainCooldownMs: Math.max(
      1_000,
      Number(learning.perDomainCooldownMs) || DEFAULT_CRAWLER_LEARNING_SETTINGS.perDomainCooldownMs
    ),
    maxQueueSize: Math.max(
      50,
      Math.min(5_000, Number(learning.maxQueueSize) || DEFAULT_CRAWLER_LEARNING_SETTINGS.maxQueueSize)
    ),
    seedUrls: normalizeSeedUrls(learning.seedUrls),
  };
}

function normalizeCrawler(rawCrawler, index, legacyRoot = null) {
  const base = defaultCrawler(index);
  const raw = rawCrawler && typeof rawCrawler === "object" ? rawCrawler : {};
  const useLegacyRoot = index === 0 && legacyRoot && typeof legacyRoot === "object";
  const enabledSource = raw.enabled ?? (useLegacyRoot ? legacyRoot.idleTrainingEnabled : undefined);
  const learningSource =
    raw.learning && typeof raw.learning === "object"
      ? raw.learning
      : useLegacyRoot && legacyRoot.learning && typeof legacyRoot.learning === "object"
        ? legacyRoot.learning
        : {};
  return {
    id: base.id,
    enabled: enabledSource === true,
    logAccessMode: normalizeLogAccessMode(raw.logAccessMode ?? (useLegacyRoot ? legacyRoot.logAccessMode : null)),
    learning: normalizeLearning({
      ...base.learning,
      ...learningSource,
    }),
  };
}

function mergeRuntimeSettings(raw) {
  const legacyRoot = raw && typeof raw === "object" ? raw : {};
  const rawCrawlerMap = new Map();
  if (Array.isArray(raw?.crawlers)) {
    for (const crawler of raw.crawlers) {
      const id = String(crawler?.id ?? "").trim();
      if (id) rawCrawlerMap.set(id, crawler);
    }
  }
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    crawlers: CRAWLER_IDS.map((crawlerId, index) =>
      normalizeCrawler(rawCrawlerMap.get(crawlerId), index, rawCrawlerMap.size ? null : legacyRoot)
    ),
  };
}

function withMetadata(settings) {
  return {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
}

function cloneSettings(settings) {
  return {
    ...settings,
    crawlers: (settings?.crawlers || []).map((crawler) => ({
      ...crawler,
      learning: {
        ...crawler.learning,
        seedUrls: Array.isArray(crawler.learning?.seedUrls) ? [...crawler.learning.seedUrls] : [],
      },
    })),
  };
}

function resolveCrawlerId(settings, crawlerId = "crawler1") {
  const requested = String(crawlerId ?? "").trim() || "crawler1";
  const matched = settings?.crawlers?.find((crawler) => crawler.id === requested);
  return matched?.id || "crawler1";
}

export function readRuntimeSettings() {
  migrateLegacyBrainRuntimeData();
  const paths = ensureBrainRuntimeHub();
  if (!fs.existsSync(paths.settingsFile)) {
    const initial = withMetadata(mergeRuntimeSettings(DEFAULT_RUNTIME_SETTINGS));
    ensureDir(paths.settingsRoot);
    writeJsonStable(paths.settingsFile, initial);
    return initial;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(paths.settingsFile, "utf8"));
    const merged = withMetadata(mergeRuntimeSettings(raw));
    if (JSON.stringify(raw) !== JSON.stringify(merged)) {
      writeJsonStable(paths.settingsFile, merged);
    }
    return merged;
  } catch {
    const fallback = withMetadata(mergeRuntimeSettings(DEFAULT_RUNTIME_SETTINGS));
    writeJsonStable(paths.settingsFile, fallback);
    return fallback;
  }
}

export function writeRuntimeSettings(nextSettings) {
  const paths = getBrainRuntimeHubPaths();
  ensureBrainRuntimeHub();
  const normalized = withMetadata(mergeRuntimeSettings(nextSettings));
  writeJsonStable(paths.settingsFile, normalized);
  return normalized;
}

export function getCrawlerIds(settings = null) {
  const source = settings?.crawlers?.length ? settings : readRuntimeSettings();
  return source.crawlers.map((crawler) => crawler.id);
}

export function getCrawlerSettings(settings, crawlerId = "crawler1") {
  const source = settings?.crawlers?.length ? settings : readRuntimeSettings();
  const resolvedId = resolveCrawlerId(source, crawlerId);
  const matched = source.crawlers.find((crawler) => crawler.id === resolvedId);
  return cloneSettings({ crawlers: [matched] }).crawlers[0];
}

export function readCrawlerSettings(crawlerId = "crawler1") {
  return getCrawlerSettings(readRuntimeSettings(), crawlerId);
}

export function updateCrawlerSettings(crawlerId = "crawler1", patch = {}) {
  const current = readRuntimeSettings();
  const resolvedId = resolveCrawlerId(current, crawlerId);
  const next = cloneSettings(current);
  next.crawlers = next.crawlers.map((crawler) => {
    if (crawler.id !== resolvedId) return crawler;
    return normalizeCrawler(
      {
        ...crawler,
        ...patch,
        learning: {
          ...crawler.learning,
          ...(patch.learning && typeof patch.learning === "object" ? patch.learning : {}),
        },
      },
      CRAWLER_IDS.indexOf(crawler.id)
    );
  });
  return writeRuntimeSettings(next);
}

export function updateRuntimeSettings(patch = {}) {
  const current = readRuntimeSettings();
  if (patch && typeof patch === "object" && Array.isArray(patch.crawlers)) {
    return writeRuntimeSettings({
      ...current,
      ...patch,
      crawlers: patch.crawlers.map((crawler, index) => normalizeCrawler(crawler, index)),
    });
  }

  if (
    patch &&
    typeof patch === "object" &&
    (Object.prototype.hasOwnProperty.call(patch, "idleTrainingEnabled") ||
      Object.prototype.hasOwnProperty.call(patch, "learning") ||
      Object.prototype.hasOwnProperty.call(patch, "logAccessMode"))
  ) {
    return updateCrawlerSettings("crawler1", {
      enabled: patch.idleTrainingEnabled,
      logAccessMode: patch.logAccessMode,
      learning: patch.learning,
    });
  }

  return writeRuntimeSettings({
    ...current,
    ...patch,
  });
}

export function summarizeCrawlerSettings(settings, status = {}, crawlerId = "crawler1") {
  const crawler = getCrawlerSettings(settings, crawlerId);
  const active = crawler?.enabled === true;
  return {
    crawlerId: crawler.id,
    idleTrainingEnabled: active,
    lastRunAt: status.lastRunFinishedAt || status.lastRunAt || null,
    lastPromotionCount: Number(status.lastPromotionCount || 0),
    parallelFetchWorkers: Number(crawler?.learning?.parallelFetchWorkers || 1),
    modeSummary: {
      sourceScope:
        crawler?.learning?.sourceScope === "allowlist" ? "Trusted Allowlist" : "Open Web Crawl",
      promotionMode:
        crawler?.learning?.promotionMode === "auto-stage-only"
          ? "Auto Stage Only"
          : "Full Auto Promote Broadly",
      logAccessMode:
        crawler?.logAccessMode === "raw-logs-direct" ? "Raw Logs Direct" : "Summaries First",
    },
  };
}

export function summarizeRuntimeSettings(settings, status = {}) {
  return summarizeCrawlerSettings(settings, status, "crawler1");
}

