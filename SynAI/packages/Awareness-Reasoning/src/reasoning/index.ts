export * from "./chat";
export * from "./grounding";
export * from "./resource-usage";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import type {
  AwarenessArea,
  AwarenessAnswerCard,
  AwarenessAnswerMode,
  AwarenessAnomalyDiagnostic,
  AwarenessConfidenceLevel,
  AwarenessConversationContext,
  AwarenessCurrentUiDiagnostic,
  AwarenessDigest,
  AwarenessEventLogDiagnostic,
  AwarenessGroundingStatus,
  AwarenessIntentFamily,
  AwarenessIntentPlan,
  AwarenessIntentRoute,
  AwarenessMode,
  AwarenessPerformanceDiagnostic,
  AwarenessQueryAnswer,
  AwarenessQueryClarification,
  AwarenessQueryScope,
  AwarenessScopeSummary,
  AwarenessStorageDiagnostic,
  AwarenessStartupDiagnostic,
  AwarenessSummaryMode,
  AwarenessSummaryScope,
  EvidenceRef,
  OfficialKnowledgeContext,
  OfficialKnowledgeHit,
  OfficialKnowledgeSource,
  AwarenessResourceHotspotEntry,
  FileAwarenessSnapshot,
  FileAwarenessSummary,
  FileChangeEntry,
  FileMediaKind,
  FreshnessMetadata,
  LastReportedBaseline,
  MachineAnomalyFinding,
  MachineAwarenessSnapshot,
  MachineBaseline,
  AwarenessRecurringPattern,
  RepoBaseline,
  RepoWorkingTreeEntry,
  ResourceHotspotGrouping,
  ResourceHotspotResource,
  ScreenAwarenessSnapshot,
  ScreenDiffSummary,
  ScreenUiElement,
  SessionBaseline
} from "../contracts/awareness";
import { createFreshnessMetadata } from "../context";
import {
  compactPath,
  formatBytes,
  isWithinPath,
  normalizePathForMatch
} from "../files/shared";
import {
  findControlPanelEntry,
  findRegistryZoneEntry,
  findSettingsMapEntry,
  searchControlPanelEntries,
  searchRegistryZoneEntries,
  searchSettingsMapEntries
} from "../machine";
import {
  collectUiHighlights,
  findFocusedUiElement,
  formatWindowSummary,
  summarizeRecentEvents
} from "../screen/shared";
import {
  formatResourceUsageMetric,
  parseResourceUsageTargets,
  pickResourceUsageFindings,
  resourceUsageSelectionTitle,
  type ResourceUsageSelection
} from "./resource-usage";

export interface AwarenessHistoryView {
  session: SessionBaseline;
  repo: RepoBaseline;
  machine: MachineBaseline;
  machineAwareness: MachineAwarenessSnapshot;
  fileAwarenessSummary: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessSnapshot | null;
  digest: AwarenessDigest;
  lastReportedBaseline: LastReportedBaseline | null;
}

export interface AwarenessView extends AwarenessHistoryView {
  fileAwarenessSnapshot?: FileAwarenessSnapshot | null;
}

export interface AwarenessPathView {
  currentSessionPath: string;
  previousSessionPath: string;
  lastReportedBaselinePath: string;
  lastReportedSnapshotPath?: string;
  latestDigestPath: string;
  eventsPath: string;
  fileCurrentCatalogPath?: string;
  filePreviousCatalogPath?: string;
  fileRecentChangesPath?: string;
  fileLatestSummaryPath?: string;
  screenCurrentPath?: string;
  screenPreviousPath?: string;
  screenLatestSummaryPath?: string;
  screenEventsPath?: string;
}

export interface AwarenessQueryBuildInput {
  query: string;
  route?: AwarenessIntentRoute;
  intentPlan?: AwarenessIntentPlan | null;
  conversationContext?: AwarenessConversationContext | null;
  officialKnowledge?: OfficialKnowledgeContext | null;
  scope?: AwarenessQueryScope;
  mode?: AwarenessSummaryMode;
  answerMode?: AwarenessAnswerMode;
  force?: boolean;
  strictGrounding?: boolean;
  scanTimedOut?: boolean;
  scanTargets?: string[];
  current: AwarenessView;
  startup?: AwarenessHistoryView | null;
  previous?: AwarenessHistoryView | null;
  lastReport?: AwarenessHistoryView | null;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessSummaryBuildInput {
  scope: AwarenessSummaryScope;
  mode?: AwarenessSummaryMode;
  current: AwarenessView;
  startup?: AwarenessHistoryView | null;
  previous?: AwarenessHistoryView | null;
  lastReport?: AwarenessHistoryView | null;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessPerformanceDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessStartupDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessCurrentUiDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessStorageDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessEventLogDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessAnomalyDiagnosticInput {
  current: AwarenessView;
  paths: AwarenessPathView;
  now?: Date;
}

const MODE_LIMITS: Record<AwarenessSummaryMode, number> = {
  short: 1,
  medium: 2,
  detailed: 4
};

const RESOURCE_HOTSPOT_DEFAULT_TOP_N = 5;
const RESOURCE_HOTSPOT_MAX_TOP_N = 10;

const resourceHotspotDisplayLabel = (resource: ResourceHotspotResource): string =>
  resource === "disk" ? "Disk" : resource.toUpperCase();

const QUERY_CONFIDENCE_THRESHOLD = 0.25;

const SYSTEM_STATS_QUERY_INTROS = [
  "show",
  "give me",
  "tell me",
  "i need",
  "can i get",
  "let me see",
  "what are",
  "what is",
  "display",
  "pull up"
] as const;

const SYSTEM_STATS_QUERY_TARGETS = [
  "my system stats",
  "my pc stats",
  "my computer stats",
  "my machine stats",
  "my windows stats",
  "my hardware stats",
  "my device stats",
  "my resource stats",
  "my system health stats",
  "my performance stats"
] as const;

export const SYSTEM_STATS_QUERY_VARIANTS: string[] = SYSTEM_STATS_QUERY_INTROS.flatMap((intro) =>
  SYSTEM_STATS_QUERY_TARGETS.map((target) => `${intro} ${target}`)
);

const INTENT_LABELS: Record<AwarenessIntentFamily, string> = {
  "repo-change": "Repo / change awareness",
  "file-folder-media": "File / folder / media awareness",
  "process-service-startup": "Process / service / startup awareness",
  "settings-control-panel": "Settings / control panel awareness",
  registry: "Registry awareness",
  "live-usage": "Live usage awareness",
  hardware: "Hardware awareness",
  "resource-hotspot": "Resource hotspot awareness",
  "performance-diagnostic": "Performance / diagnostic awareness",
  "on-screen": "On-screen awareness"
};

const INTENT_TARGET_AREAS: Record<AwarenessIntentFamily, AwarenessArea[]> = {
  "repo-change": ["repo", "session", "files", "journal"],
  "file-folder-media": ["files", "media"],
  "process-service-startup": ["machine", "context"],
  "settings-control-panel": ["machine", "context"],
  registry: ["machine", "privacy"],
  "live-usage": ["machine"],
  hardware: ["machine"],
  "resource-hotspot": ["machine"],
  "performance-diagnostic": ["machine", "session"],
  "on-screen": ["screen", "assist", "ui", "interaction"]
};

const INTENT_KEYWORDS: Record<AwarenessIntentFamily, string[]> = {
  "repo-change": [
    "changed",
    "change",
    "diff",
    "git",
    "commit",
    "branch",
    "restart",
    "session",
    "since restart",
    "since startup",
    "since boot",
    "last session",
    "last report",
    "last told",
    "what changed"
  ],
  "file-folder-media": [
    "file",
    "files",
    "folder",
    "folders",
    "media",
    "photo",
    "photos",
    "video",
    "videos",
    "audio",
    "document",
    "documents",
    "download",
    "downloads",
    "desktop",
    "picture",
    "pictures",
    "largest",
    "newest",
    "largest files",
    "biggest files",
    "taking up space",
    "taking the most space",
    "taking up",
    "taking the most space",
    "changed today",
    "changed recently"
  ],
  "process-service-startup": [
    "process",
    "processes",
    "service",
    "services",
    "startup",
    "launch",
    "launching",
    "running",
    "task manager",
    "service tied",
    "app",
    "apps"
  ],
  "settings-control-panel": [
    "setting",
    "settings",
    "control panel",
    "ms-settings",
    "where is this setting",
    "windows update",
    "bluetooth",
    "wifi",
    "wi fi",
    "wireless",
    "airplane mode",
    "flight mode",
    "radio",
    "display",
    "sound",
    "taskbar",
    "default apps"
  ],
  registry: [
    "registry",
    "regedit",
    "hklm",
    "hkcu",
    "run key",
    "uninstall",
    "policies",
    "shell",
    "winlogon",
    "diagnostics"
  ],
  "live-usage": [
    "usage",
    "used",
    "load",
    "how much",
    "how many",
    "system stats",
    "pc stats",
    "computer stats",
    "machine stats",
    "hardware stats",
    "device stats",
    "resource stats",
    "system health stats",
    "performance stats",
    "cpu usage",
    "ram usage",
    "memory usage",
    "gpu usage",
    "vram usage",
    "disk usage",
    "storage usage",
    "cpu load",
    "ram load",
    "memory load",
    "gpu load",
    "uptime",
    "what's my cpu",
    "what is my cpu",
    "what's my ram",
    "what is my ram",
    "what's my gpu",
    "what is my gpu",
    "what's my vram",
    "what is my vram",
    "what's my disk",
    "what is my disk",
    "what's my system stats",
    "free space",
    "free storage",
    "available space",
    "space left",
    "disk space",
    "drive space",
    "hard drive space",
    "space on c",
    "space on c drive"
  ],
  hardware: [
    "hardware",
    "cpu",
    "cpu model",
    "processor",
    "processor spec",
    "gpu",
    "graphics",
    "vram",
    "memory",
    "ram",
    "disk",
    "drive",
    "network",
    "display",
    "monitor"
  ],
  "resource-hotspot": [
    "what's using",
    "whats using",
    "what is using",
    "using all my",
    "using the most",
    "top process",
    "top processes",
    "top program",
    "top programs",
    "top app",
    "top apps",
    "resource hog",
    "hogging",
    "which process",
    "which program",
    "who is using",
    "most ram",
    "most memory",
    "most cpu",
    "most gpu",
    "most disk",
    "all my ram",
    "all my memory",
    "all my cpu",
    "all my gpu",
    "all my disk",
    "ram hog",
    "cpu hog",
    "gpu hog",
    "disk hog",
    "memory hog",
    "using ram",
    "using cpu",
    "using gpu",
    "using disk",
    "using memory",
    "using storage",
    "using all ram",
    "using all cpu",
    "using all gpu",
    "using all disk",
    "processes using ram",
    "processes using cpu",
    "programs using ram",
    "programs using cpu",
    "apps using ram",
    "apps using cpu",
    "what is taking up",
    "taking up the most"
  ],
  "performance-diagnostic": [
    "slow",
    "slowing",
    "lag",
    "stuck",
    "freeze",
    "performance",
    "diagnostic",
    "anomaly",
    "anomalies",
    "event log",
    "event logs",
    "event viewer",
    "critical error",
    "warnings",
    "bottleneck",
    "resource hog",
    "root cause",
    "anomaly burst"
  ],
  "on-screen": [
    "window",
    "screen",
    "foreground",
    "button",
    "menu",
    "tab",
    "click",
    "hover",
    "cursor",
    "active window",
    "what am i looking at",
    "where should i click",
    "what tab is active"
  ]
};

const stripPunctuation = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const uniqueStrings = (values: string[]): string[] => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const limitStrings = (values: string[], limit: number): string[] => uniqueStrings(values).slice(0, limit);

const formatCpuSeconds = (value: number | null | undefined): string =>
  value != null ? `${value.toFixed(1)}s CPU` : "CPU n/a";

const formatUptime = (value: number): string => {
  const totalMinutes = Math.max(0, Math.floor(value / 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const normalizeQuery = (query: string): string => stripPunctuation(query);

const tokenizeNormalized = (value: string): string[] => value.split(/\s+/).map((token) => token.trim()).filter(Boolean);

const typoBudgetForToken = (token: string): number => {
  const length = token.length;
  if (length <= 2) {
    return 0;
  }
  if (length <= 5) {
    return 1;
  }
  if (length <= 10) {
    return 2;
  }
  return 3;
};

const boundedLevenshtein = (left: string, right: string, maxDistance: number): number => {
  if (left === right) {
    return 0;
  }

  if (maxDistance <= 0) {
    return maxDistance + 1;
  }

  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previousRow = new Array<number>(right.length + 1);
  for (let index = 0; index <= right.length; index += 1) {
    previousRow[index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];
    let rowMin = currentRow[0] ?? maxDistance + 1;
    const leftCharCode = left.charCodeAt(leftIndex - 1);

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = leftCharCode === right.charCodeAt(rightIndex - 1) ? 0 : 1;
      const deletion = (previousRow[rightIndex] ?? maxDistance + 1) + 1;
      const insertion = (currentRow[rightIndex - 1] ?? maxDistance + 1) + 1;
      const substitution = (previousRow[rightIndex - 1] ?? maxDistance + 1) + substitutionCost;
      const distance = Math.min(deletion, insertion, substitution);
      currentRow[rightIndex] = distance;
      if (distance < rowMin) {
        rowMin = distance;
      }
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    previousRow = currentRow;
  }

  return previousRow[right.length] ?? maxDistance + 1;
};

const tokensRoughlyMatch = (left: string, right: string): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const maxDistance = Math.min(typoBudgetForToken(left), typoBudgetForToken(right));
  if (maxDistance <= 0 || Math.abs(left.length - right.length) > maxDistance) {
    return false;
  }

  if (maxDistance === 1 && Math.min(left.length, right.length) <= 3 && left[0] !== right[0]) {
    return false;
  }

  return boundedLevenshtein(left, right, maxDistance) <= maxDistance;
};

const hasTypoTolerantPhraseMatch = (queryTokens: string[], phraseTokens: string[]): boolean => {
  if (queryTokens.length === 0 || phraseTokens.length === 0) {
    return false;
  }

  if (phraseTokens.length === 1) {
    const target = phraseTokens[0] ?? "";
    return queryTokens.some((token) => tokensRoughlyMatch(token, target));
  }

  if (queryTokens.length < phraseTokens.length) {
    return false;
  }

  const lastStart = queryTokens.length - phraseTokens.length;
  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true;
    for (let index = 0; index < phraseTokens.length; index += 1) {
      const queryToken = queryTokens[start + index] ?? "";
      const phraseToken = phraseTokens[index] ?? "";
      if (!tokensRoughlyMatch(queryToken, phraseToken)) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }

  return false;
};

const queryMatchesPhrase = (normalizedQuery: string, queryTokens: string[], phrase: string): boolean => {
  const normalizedPhrase = normalizeQuery(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  if (normalizedQuery.includes(normalizedPhrase)) {
    return true;
  }

  return hasTypoTolerantPhraseMatch(queryTokens, tokenizeNormalized(normalizedPhrase));
};

const includesAny = (query: string, phrases: string[]): boolean => {
  const normalized = normalizeQuery(query);
  const queryTokens = tokenizeNormalized(normalized);
  return phrases.some((phrase) => queryMatchesPhrase(normalized, queryTokens, phrase));
};

const DRIVE_CAPACITY_PHRASES = [
  "hard drive",
  "drive space",
  "disk space",
  "free space",
  "space left",
  "available space",
  "free storage",
  "space on c",
  "space on c drive",
  "space on my drive",
  "storage on my hard drive",
  "storage on my drive"
];

const FILE_STORAGE_PHRASES = [
  "largest files",
  "biggest files",
  "what files",
  "which files",
  "taking up space",
  "taking the most space",
  "folder",
  "folders",
  "downloads",
  "documents",
  "desktop",
  "videos",
  "pictures",
  "media"
];

const STORAGE_SURFACE_PHRASES = [
  "storage",
  "disk",
  "drive",
  "space",
  "hard drive"
];

const AMBIGUOUS_STORAGE_PHRASES = [
  "what about storage",
  "what about the storage",
  "how about storage",
  "what about disk",
  "what about the disk",
  "storage",
  "disk"
];

const storageDrivePattern = /\bspace on ([a-z])(?:\s+drive)?\b/;

const isDriveCapacityStorageQuery = (query: string): boolean => {
  const normalized = normalizeQuery(query);
  return includesAny(normalized, DRIVE_CAPACITY_PHRASES) || storageDrivePattern.test(normalized);
};

const isFileStorageQuery = (query: string): boolean => includesAny(query, FILE_STORAGE_PHRASES);

const isAmbiguousStorageQuery = (query: string): boolean => {
  const normalized = normalizeQuery(query);
  if (!includesAny(normalized, STORAGE_SURFACE_PHRASES)) {
    return false;
  }

  if (
    isDriveCapacityStorageQuery(normalized) ||
    isFileStorageQuery(normalized) ||
    includesAny(normalized, [
      "usage",
      "load",
      "what's using",
      "whats using",
      "what is using",
      "using all my",
      "top process",
      "top program",
      "top app"
    ])
  ) {
    return false;
  }

  return includesAny(normalized, AMBIGUOUS_STORAGE_PHRASES) || tokenizeNormalized(normalized).length <= 3;
};

const resolveStorageFamilyFromConversation = (
  query: string,
  conversationContext?: AwarenessConversationContext | null
): AwarenessIntentFamily | null => {
  if (!conversationContext || !isAmbiguousStorageQuery(query)) {
    return null;
  }

  const recentMessages = [...(conversationContext.recentUserMessages ?? [])].reverse();
  let sawStorageContext = false;
  for (const message of recentMessages) {
    if (!message || normalizeQuery(message) === normalizeQuery(query)) {
      continue;
    }

    if (includesAny(message, STORAGE_SURFACE_PHRASES)) {
      sawStorageContext = true;
    }

    if (isDriveCapacityStorageQuery(message)) {
      return "live-usage";
    }

    if (isFileStorageQuery(message)) {
      return "file-folder-media";
    }
  }

  if (!sawStorageContext) {
    return null;
  }

  if (conversationContext.lastAwarenessIntentFamily === "file-folder-media") {
    return "file-folder-media";
  }

  if (
    conversationContext.lastAwarenessIntentFamily === "live-usage" ||
    conversationContext.lastAwarenessIntentFamily === "hardware"
  ) {
    return "live-usage";
  }

  return null;
};

export const buildStorageClarification = (
  query: string,
  conversationContext?: AwarenessConversationContext | null
): AwarenessQueryClarification | null =>
  isAmbiguousStorageQuery(query) && !resolveStorageFamilyFromConversation(query, conversationContext)
    ? {
        question: "Do you mean free space on your drive, or which files and folders are taking up space?",
        options: ["Drive free space", "Files and folders using space"]
      }
    : null;

const extractTopCountFromQuery = (query: string, fallback = RESOURCE_HOTSPOT_DEFAULT_TOP_N): number => {
  const normalized = normalizeQuery(query);
  const topMatch = normalized.match(/\btop\s+(\d{1,2})\b/);
  if (topMatch) {
    const parsed = Number(topMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(RESOURCE_HOTSPOT_MAX_TOP_N, Math.max(1, Math.floor(parsed)));
    }
  }

  const firstMatch = normalized.match(/\b(?:first|top|show|list)\s+(\d{1,2})\b/);
  if (firstMatch) {
    const parsed = Number(firstMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(RESOURCE_HOTSPOT_MAX_TOP_N, Math.max(1, Math.floor(parsed)));
    }
  }

  return Math.min(RESOURCE_HOTSPOT_MAX_TOP_N, Math.max(1, Math.floor(fallback)));
};

const resourceHotspotResourceForQuery = (query: string): ResourceHotspotResource => {
  const normalized = normalizeQuery(query);
  if (
    includesAny(normalized, ["gpu", "graphics", "graphics card", "video card", "vram", "video memory"]) &&
    !includesAny(normalized, ["cpu", "ram", "memory", "disk", "storage"])
  ) {
    return "gpu";
  }

  if (includesAny(normalized, ["cpu", "processor", "processor usage", "processor load", "core usage"])) {
    return "cpu";
  }

  if (includesAny(normalized, ["disk", "storage", "drive", "space", "i/o", "io", "read write", "read/write"])) {
    return "disk";
  }

  return "ram";
};

const resourceHotspotGroupingForQuery = (query: string): ResourceHotspotGrouping => {
  const normalized = normalizeQuery(query);
  if (includesAny(normalized, ["program", "programs", "app", "apps", "application", "applications"])) {
    return "program";
  }

  return "process";
};

const isSystemStatsVariantQuery = (query: string): boolean =>
  includesAny(query, SYSTEM_STATS_QUERY_VARIANTS) ||
  includesAny(query, [
    "system stats",
    "system status",
    "system health",
    "system info",
    "system information",
    "pc stats",
    "computer stats",
    "machine stats",
    "device stats",
    "hardware stats",
    "resource stats"
  ]);

const collectSignals = (query: string, phrases: string[]): string[] => {
  const normalized = normalizeQuery(query);
  const queryTokens = tokenizeNormalized(normalized);
  return uniqueStrings(phrases.filter((phrase) => queryMatchesPhrase(normalized, queryTokens, phrase)));
};

const countKeywordHits = (query: string, phrases: string[]): number => collectSignals(query, phrases).length;

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const confidenceLevelFor = (confidence: number): AwarenessConfidenceLevel =>
  confidence >= 0.85 ? "high" : confidence >= 0.55 ? "medium" : "low";

const groundingStatusFor = (input: {
  confidence: number;
  evidenceTraceCount: number;
  verifiedCount: number;
}): AwarenessGroundingStatus => {
  if (input.evidenceTraceCount === 0 || input.verifiedCount === 0 || input.confidence < 0.4) {
    return "weak";
  }

  if (input.confidence < 0.65 || input.evidenceTraceCount < 2) {
    return "partial";
  }

  return "grounded";
};

const restampFreshness = (freshness: FreshnessMetadata, now = new Date()): FreshnessMetadata =>
  createFreshnessMetadata(freshness.capturedAt, freshness.generatedAt, now);

const makeEvidenceRef = (id: string, kind: EvidenceRef["kind"], label: string, pathValue?: string): EvidenceRef => ({
  id,
  kind,
  label,
  path: pathValue
});

const trimEvidenceRefs = (refs: EvidenceRef[], limit = 4): EvidenceRef[] => {
  const seen = new Set<string>();
  const trimmed: EvidenceRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    trimmed.push(ref);
    if (trimmed.length >= limit) {
      break;
    }
  }
  return trimmed;
};

const chooseMode = (query: string, requestedMode?: AwarenessSummaryMode): AwarenessSummaryMode => {
  if (requestedMode) {
    return requestedMode;
  }

  const normalized = normalizeQuery(query);
  if (normalized.includes("detailed") || normalized.includes("full") || normalized.includes("deep")) {
    return "detailed";
  }

  if (normalized.includes("short") || normalized.includes("brief") || normalized.includes("quick")) {
    return "short";
  }

  return "medium";
};

const isFeatureSummaryQuery = (query: string): boolean => {
  return includesAny(query, [
    "whats new",
    "what s new",
    "new feature",
    "new features",
    "release notes",
    "changelog",
    "change log",
    "updates",
    "since last run",
    "since last launch"
  ]);
};

const chooseScopeForQuery = (query: string): AwarenessQueryScope => {
  if (includesAny(query, ["current ui", "what am i looking at", "what tab"])) {
    return "current-ui";
  }

  if (isFeatureSummaryQuery(query)) {
    return "previous-session";
  }

  if (includesAny(query, ["last report", "last told", "since you last"])) {
    return "last-report";
  }

  if (includesAny(query, ["last session", "previous session"])) {
    return "previous-session";
  }

  if (includesAny(query, ["since restart", "since startup", "since boot"])) {
    return "session";
  }

  return "current-machine";
};

const buildSummaryText = (sections: string[], mode: AwarenessSummaryMode): string => {
  const limit = MODE_LIMITS[mode];
  return sections.slice(0, limit * 3).join(" | ");
};

const buildCompactSummary = (
  verifiedFindings: string[],
  likelyInterpretation: string[],
  uncertainty: string[],
  suggestedNextChecks: string[],
  safeNextAction: string | null,
  mode: AwarenessSummaryMode
): string => {
  const limit = MODE_LIMITS[mode];
  const parts = [
    verifiedFindings.length > 0 ? `Verified: ${verifiedFindings.slice(0, limit).join("; ")}` : null,
    likelyInterpretation.length > 0 ? `Likely: ${likelyInterpretation.slice(0, limit).join("; ")}` : null,
    uncertainty.length > 0 ? `Uncertainty: ${uncertainty.slice(0, limit).join("; ")}` : null,
    suggestedNextChecks.length > 0 ? `Next: ${suggestedNextChecks.slice(0, limit).join("; ")}` : null,
    safeNextAction ? `Safe next: ${safeNextAction}` : null
  ].filter((part): part is string => Boolean(part));

  return parts.join(" | ");
};

const buildEvidenceBundle = (input: {
  freshness: FreshnessMetadata;
  verifiedFindings: string[];
  officialVerified?: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction?: string | null;
  confidence: number;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  mode: AwarenessSummaryMode;
  strictGrounding?: boolean;
  recurringPatterns?: AwarenessRecurringPattern[];
  screenDiff?: ScreenDiffSummary | null;
  correlationHighlights?: string[];
  officialEvidence?: OfficialKnowledgeHit[];
}): AwarenessQueryAnswer["bundle"] => {
  const freshnessPenalty = input.freshness.isFresh ? 0 : 0.12;
  const weakEvidencePenalty = input.strictGrounding && input.verifiedFindings.length === 0 ? 0.2 : 0;
  const traceBonus = input.evidenceRefs.length >= 3 && input.verifiedFindings.length >= 2 && input.freshness.isFresh ? 0.05 : 0;
  const confidence = clamp(input.confidence - freshnessPenalty - weakEvidencePenalty + traceBonus);
  const verified = limitStrings(input.verifiedFindings, MODE_LIMITS[input.mode] + 2);
  const likelyBase = limitStrings(input.likelyInterpretation, MODE_LIMITS[input.mode] + 2);
  const inferred = input.strictGrounding
    ? likelyBase.map((item) => (item.toLowerCase().startsWith("inference:") ? item : `Inference: ${item}`))
    : [];
  const likely = input.strictGrounding ? inferred : likelyBase;
  const evidenceRefs = trimEvidenceRefs(input.evidenceRefs);
  const evidenceTraceIds = uniqueStrings(evidenceRefs.map((ref) => `${ref.kind}:${ref.id}`));
  const groundingStatus = groundingStatusFor({
    confidence,
    evidenceTraceCount: evidenceTraceIds.length,
    verifiedCount: verified.length
  });
  const includeGuidance = verified.length === 0 || groundingStatus !== "grounded";
  const uncertainty = limitStrings(
    [
      ...input.uncertainty,
      ...(!input.freshness.isFresh
        ? [`Freshness is stale: captured ${Math.round(input.freshness.ageMs / 1000)}s ago.`]
        : []),
      ...(input.strictGrounding && groundingStatus !== "grounded"
        ? [
            groundingStatus === "weak"
              ? "Grounding is weak: limited verified evidence was available."
              : "Grounding is partial: some claims rely on inference."
          ]
        : [])
    ],
    MODE_LIMITS[input.mode] + 2
  );
  const checks = includeGuidance
    ? limitStrings(
        [
          ...input.suggestedNextChecks,
          ...(input.strictGrounding && groundingStatus !== "grounded"
            ? ["Run a narrow refresh/scan for stronger evidence before trusting high-impact conclusions."]
            : [])
        ],
        MODE_LIMITS[input.mode] + 2
      )
    : [];

  return {
    verifiedFindings: verified,
    officialVerified: limitStrings(input.officialVerified ?? [], MODE_LIMITS[input.mode] + 2),
    likelyInterpretation: likely,
    inferredFindings: inferred,
    uncertainty,
    suggestedNextChecks: checks,
    safeNextAction: input.safeNextAction ?? null,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    groundingStatus,
    evidenceTraceIds,
    freshness: input.freshness,
    evidenceRefs,
    affectedAreas: uniqueStrings(input.affectedAreas) as AwarenessArea[],
    compactSummary: buildCompactSummary(verified, likely, uncertainty, checks, input.safeNextAction ?? null, input.mode),
    recurringPatterns: input.recurringPatterns?.slice(0, 3) ?? [],
    screenDiff: input.screenDiff ?? null,
    correlationHighlights: input.correlationHighlights?.slice(0, 4) ?? [],
    officialEvidence: input.officialEvidence?.slice(0, 4) ?? []
  };
};

const buildAnswer = (input: {
  query: string;
  intent: AwarenessIntentRoute;
  intentPlan?: AwarenessIntentPlan | null;
  scope: AwarenessQueryScope;
  mode: AwarenessSummaryMode;
  answerMode?: AwarenessAnswerMode;
  strictGrounding?: boolean;
  scanTimedOut?: boolean;
  scanTargets?: string[];
  includeInContext: boolean;
  bundle: AwarenessQueryAnswer["bundle"];
  clarification?: AwarenessQueryClarification | null;
  card?: AwarenessAnswerCard | null;
  officialSources?: OfficialKnowledgeSource[];
  officialEvidence?: OfficialKnowledgeHit[];
  versionMatched?: boolean;
  officialKnowledgeUsed?: boolean;
}): AwarenessQueryAnswer => ({
  id: randomUUID(),
  query: input.query,
  generatedAt: new Date().toISOString(),
  intent: input.intent,
  intentPlan: input.intentPlan ?? null,
  scope: input.scope,
  mode: input.mode,
  answerMode: input.answerMode,
  strictGrounding: input.strictGrounding,
  scanTimedOut: input.scanTimedOut,
  scanTargets: input.scanTargets,
  includeInContext: input.includeInContext,
  summary: `${input.intent.label}: ${input.bundle.compactSummary}`,
  bundle: input.bundle,
  officialSources: input.officialSources ?? [],
  officialEvidence: input.officialEvidence ?? [],
  versionMatched: input.versionMatched ?? false,
  officialKnowledgeUsed: input.officialKnowledgeUsed ?? false,
  clarification: input.clarification ?? null,
  card: input.card ?? null
});

const toOfficialSource = (hit: OfficialKnowledgeHit): OfficialKnowledgeSource => ({
  id: hit.sourceId,
  title: hit.title,
  url: hit.canonicalUrl,
  domain: hit.domain,
  topic: hit.topic,
  keywords: [],
  aliases: [],
  productTags: [],
  versionTags: []
});

const applyOfficialKnowledge = (
  answer: AwarenessQueryAnswer,
  input: AwarenessQueryBuildInput,
  route: AwarenessIntentRoute
): AwarenessQueryAnswer => {
  const officialContext = input.officialKnowledge;
  if (!officialContext?.used || officialContext.hits.length === 0) {
    return answer;
  }

  const officialHits = officialContext.hits.slice(0, 3);
  const officialVerified = officialHits.map(
    (hit) => `Microsoft: ${hit.title} — ${hit.extract}`
  );
  const officialSources = uniqueStrings(officialHits.map((hit) => hit.sourceId))
    .map((sourceId) => officialHits.find((hit) => hit.sourceId === sourceId))
    .filter((hit): hit is OfficialKnowledgeHit => Boolean(hit))
    .map(toOfficialSource);
  const officialEvidenceRefs = officialHits.map((hit) =>
    makeEvidenceRef(hit.canonicalUrl, "official", hit.title, hit.canonicalUrl)
  );
  const versionMatched = officialHits.some((hit) => hit.versionMatched);
  const localFirstFamilies = new Set<AwarenessIntentFamily>([
    "live-usage",
    "hardware",
    "resource-hotspot",
    "performance-diagnostic",
    "file-folder-media",
    "repo-change",
    "on-screen"
  ]);

  answer.bundle.officialVerified = limitStrings(
    [...(answer.bundle.officialVerified ?? []), ...officialVerified],
    MODE_LIMITS[answer.mode] + 2
  );
  answer.bundle.officialEvidence = officialHits;
  answer.bundle.evidenceRefs = trimEvidenceRefs([
    ...answer.bundle.evidenceRefs,
    ...officialEvidenceRefs
  ]);
  answer.bundle.evidenceTraceIds = uniqueStrings(
    answer.bundle.evidenceRefs.map((ref) => `${ref.kind}:${ref.id}`)
  );

  if (!versionMatched) {
    answer.bundle.uncertainty = limitStrings(
      [
        ...answer.bundle.uncertainty,
        "Microsoft guidance may target a different Windows build or release."
      ],
      MODE_LIMITS[answer.mode] + 2
    );
  }

  if (!localFirstFamilies.has(route.family)) {
    if (answer.bundle.verifiedFindings.length === 0) {
      answer.bundle.verifiedFindings = limitStrings(
        officialVerified,
        MODE_LIMITS[answer.mode] + 1
      );
    } else if (officialVerified[0]) {
      answer.bundle.likelyInterpretation = limitStrings(
        [...answer.bundle.likelyInterpretation, officialVerified[0]],
        MODE_LIMITS[answer.mode] + 2
      );
    }
  } else if (officialVerified[0]) {
    answer.bundle.likelyInterpretation = limitStrings(
      [...answer.bundle.likelyInterpretation, `Microsoft documentation: ${officialHits[0].extract}`],
      MODE_LIMITS[answer.mode] + 2
    );
  }

  answer.bundle.compactSummary = buildCompactSummary(
    answer.bundle.verifiedFindings.length > 0
      ? answer.bundle.verifiedFindings
      : answer.bundle.officialVerified,
    answer.bundle.likelyInterpretation,
    answer.bundle.uncertainty,
    answer.bundle.suggestedNextChecks,
    answer.bundle.safeNextAction,
    answer.mode
  );
  answer.summary = `${answer.intent.label}: ${answer.bundle.compactSummary}`;
  answer.officialSources = officialSources;
  answer.officialEvidence = officialHits;
  answer.versionMatched = versionMatched;
  answer.officialKnowledgeUsed = true;

  return answer;
};

const buildClarificationAnswer = (
  input: AwarenessQueryBuildInput,
  route: AwarenessIntentRoute,
  clarification: AwarenessQueryClarification
): AwarenessQueryAnswer => {
  const mode = chooseMode(input.query, input.mode);
  const bundle = buildEvidenceBundle({
    freshness: restampFreshness(input.current.machineAwareness.freshness, input.now),
    verifiedFindings: [],
    likelyInterpretation: [],
    uncertainty: ["The question could mean either drive free space or which files are taking space."],
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: clamp(0.35),
    evidenceRefs: [],
    affectedAreas: ["machine", "files"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query: input.query,
    intent: route,
    intentPlan: input.intentPlan ?? null,
    scope: input.scope ?? "current-machine",
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: false,
    bundle,
    clarification
  });
};

const buildIntentSecondaryNotes = (
  plan: AwarenessIntentPlan | null | undefined,
  current: AwarenessView
): string[] => {
  if (!plan || plan.secondary.length === 0) {
    return [];
  }

  return plan.secondary
    .map((route) => {
      switch (route.family) {
        case "repo-change":
          return `Also relevant: repo ${current.repo.branch ?? "no-git"} is ${current.repo.dirtyState} with ${current.repo.workingTree.totalCount} working-tree changes.`;
        case "file-folder-media":
          return current.fileAwarenessSummary
            ? `Also relevant: file awareness shows ${current.fileAwarenessSummary.counts.recentChanges} recent file changes.`
            : null;
        case "process-service-startup":
          return `Also relevant: ${current.machineAwareness.summary.counts.services} services and ${current.machineAwareness.summary.counts.startupEntries} startup items are linked to this machine snapshot.`;
        case "settings-control-panel":
          return `Also relevant: ${current.machineAwareness.summary.counts.settings} settings-map entries are available for Windows navigation.`;
        case "registry":
          return `Also relevant: ${current.machineAwareness.summary.counts.registryZones} registry zones are indexed for read-only lookup.`;
        case "live-usage":
          return current.machineAwareness.rollingMetrics?.samples.at(-1)
            ? `Also relevant: live CPU is ${current.machineAwareness.rollingMetrics.samples.at(-1)?.cpuLoadPercent ?? "n/a"}% with ${current.machineAwareness.rollingMetrics.cpuTrend.summary.toLowerCase()}.`
            : null;
        case "hardware":
          return `Also relevant: ${current.machine.machineName} is running ${current.machine.osVersion}.`;
        case "resource-hotspot": {
          const hotspot = current.machineAwareness.correlationGraph?.processLinks[0];
          return hotspot ? `Also relevant: ${hotspot.processName} is linked to ${hotspot.description}.` : null;
        }
        case "performance-diagnostic":
          return `Also relevant: ${current.machineAwareness.summary.counts.eventLogErrors} recent event-log errors were captured.`;
        case "on-screen":
          return current.screenAwareness?.summary.diff?.summary
            ? `Also relevant: screen diff says ${current.screenAwareness.summary.diff.summary}.`
            : current.screenAwareness?.summary.summary ?? null;
        default:
          return null;
      }
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);
};

const buildCorrelationHighlights = (machine: MachineAwarenessSnapshot): string[] =>
  (machine.correlationGraph?.processLinks ?? [])
    .slice(0, 3)
    .map((entry) => entry.description)
    .filter(Boolean);

const describeDriveFreeSpace = (
  drive: MachineAwarenessSnapshot["systemIdentity"]["hardware"]["drives"][number] | null
): string => {
  if (!drive) {
    return "Drive details were not available.";
  }

  const driveLabel = `${drive.deviceId}${drive.volumeLabel ? ` (${drive.volumeLabel})` : ""}`;
  if (drive.totalBytes == null) {
    return `I can see ${driveLabel}, but its total size was not captured.`;
  }

  return `You have ${formatBytes(drive.freeBytes ?? 0)} free on ${driveLabel} out of ${formatBytes(drive.totalBytes)} total.`;
};

const buildAwarenessAnswerCard = (answer: AwarenessQueryAnswer): AwarenessAnswerCard | null => {
  if (answer.clarification) {
    return null;
  }

  if (answer.intent.family === "live-usage") {
    const selection: ResourceUsageSelection = parseResourceUsageTargets(answer.query);
    const focusedLines = pickResourceUsageFindings(answer.bundle.verifiedFindings, selection);
    const metricLines = selection.mode === "focused" && focusedLines.length > 0 ? focusedLines : answer.bundle.verifiedFindings.slice(0, 4);
    return {
      kind: "live-usage",
      title: resourceUsageSelectionTitle(selection),
      subtitle: "Updated just now",
      metrics:
        selection.mode === "focused" && focusedLines.length > 0
          ? focusedLines.map((line, index) => formatResourceUsageMetric(selection.targets[index] ?? selection.targets[0] ?? "cpu", line))
          : metricLines.map((line) => {
              const [label, ...rest] = line.split(":");
              return {
                label: label.trim(),
                value: rest.join(":").trim() || line
              };
            }),
      sections: answer.bundle.recurringPatterns && answer.bundle.recurringPatterns.length > 0
        ? [
            {
              label: "Recurring",
              items: answer.bundle.recurringPatterns.map((pattern) => pattern.title)
            }
          ]
        : [],
      footer: answer.bundle.uncertainty[0] ?? null
    };
  }

  if (answer.bundle.resourceHotspots && answer.bundle.resourceHotspots.length > 0) {
    const topHotspot = answer.bundle.resourceHotspots[0];
    return {
      kind: "resource-hotspot",
      title: `${topHotspot.label} is the top ${topHotspot.resource.toUpperCase()} ${
        topHotspot.grouping === "program" ? "program" : "process"
      }`,
      subtitle: topHotspot.grouping === "program" ? "Grouped by program" : "Per process",
      metrics: answer.bundle.resourceHotspots.slice(0, 3).map((entry) => ({
        label: `${entry.rank}. ${entry.label}`,
        value: entry.resourceAmount
      })),
      sections: [
        {
          label: "Top details",
          items: answer.bundle.resourceHotspots.slice(0, 3).map((entry) => entry.description)
        }
      ],
      footer: answer.bundle.uncertainty[0] ?? null
    };
  }

  if (answer.intent.family === "repo-change" || answer.intent.family === "performance-diagnostic" || answer.intent.family === "on-screen") {
    return {
      kind: "awareness-summary",
      title: answer.intent.label,
      subtitle: answer.scope,
      metrics: [],
      sections: [
        {
          label: "What changed",
          items: answer.bundle.verifiedFindings.slice(0, 4)
        },
        ...(answer.bundle.likelyInterpretation.length > 0
          ? [
              {
                label: "Why it matters",
                items: answer.bundle.likelyInterpretation.slice(0, 3)
              }
            ]
          : [])
      ],
      footer: answer.bundle.uncertainty[0] ?? null
    };
  }

  return null;
};

const scoreIntent = (query: string, family: AwarenessIntentFamily): { score: number; signals: string[] } => {
  const keywords = INTENT_KEYWORDS[family];
  const signals = collectSignals(query, keywords);
  const score = countKeywordHits(query, keywords);
  return { score, signals };
};

export const routeAwarenessIntent = (
  query: string,
  conversationContext?: AwarenessConversationContext | null
): AwarenessIntentRoute => {
  const normalized = query.trim();
  if (!normalized) {
    return {
      family: "repo-change",
      label: INTENT_LABELS["repo-change"],
      confidence: 0,
      signals: [],
      targetAreas: INTENT_TARGET_AREAS["repo-change"]
    };
  }

  const scored = (Object.keys(INTENT_KEYWORDS) as AwarenessIntentFamily[]).map((family) => {
    const { score, signals } = scoreIntent(normalized, family);
    return {
      family,
      score,
      signals
    };
  });

  scored.sort((left, right) => right.score - left.score);
  let winner = scored[0];
  if (!winner) {
    return {
      family: "repo-change",
      label: INTENT_LABELS["repo-change"],
      confidence: 0,
      signals: [],
      targetAreas: INTENT_TARGET_AREAS["repo-change"]
    };
  }

  const fileCandidate = scored.find((entry) => entry.family === "file-folder-media");
  const liveUsageCandidate = scored.find((entry) => entry.family === "live-usage");
  const hardwareCandidate = scored.find((entry) => entry.family === "hardware");
  const resourceHotspotCandidate = scored.find((entry) => entry.family === "resource-hotspot");
  const performanceCandidate = scored.find((entry) => entry.family === "performance-diagnostic");
  const resourceUsageSelection = parseResourceUsageTargets(normalized);
  const driveCapacitySignals = isDriveCapacityStorageQuery(normalized);
  const fileStorageSignals = isFileStorageQuery(normalized);
  const conversationStorageFamily = resolveStorageFamilyFromConversation(normalized, conversationContext);
  const fileSpecificSignals = includesAny(normalized, [
    "file",
    "files",
    "folder",
    "folders",
    "desktop",
    "documents",
    "downloads",
    "pictures",
    "videos",
    "photos",
    "audio",
    "media",
    "largest",
    "newest",
    "recently",
    "today",
    "changed in",
    "changed today"
  ]);
  const repoSpecificSignals = includesAny(normalized, [
    "git",
    "commit",
    "branch",
    "session",
    "startup",
    "restart",
    "boot",
    "last report",
    "last session"
  ]);
  const liveUsageSpecificSignals = includesAny(normalized, [
    "system stats",
    "pc stats",
    "computer stats",
    "machine stats",
    "hardware stats",
    "device stats",
    "resource stats",
    "system health stats",
    "performance stats",
    "cpu usage",
    "ram usage",
    "memory usage",
    "gpu usage",
    "vram usage",
    "disk usage",
    "storage usage",
    "cpu load",
    "ram load",
    "memory load",
    "gpu load",
    "cpu at",
    "ram at",
    "memory at",
    "gpu at",
    "vram at",
    "disk at",
    "storage at",
    "what's my cpu at",
    "what is my cpu at",
    "what's my ram at",
    "what is my ram at",
    "what's my gpu at",
    "what is my gpu at",
    "what's my vram at",
    "what is my vram at",
    "how much ram",
    "how much memory",
    "how much cpu",
    "how much gpu",
    "how much vram",
    "how much disk",
    "uptime"
  ]);
  const performanceSpecificSignals = includesAny(normalized, [
    "resource hog",
    "slow",
    "slowing",
    "slowdown",
    "freeze",
    "stuck",
    "lag",
    "bottleneck",
    "performance",
    "task manager",
    "event log",
    "event logs",
    "event viewer",
    "critical error",
    "warnings",
    "diagnostic",
    "anomaly",
    "anomalies",
    "root cause"
  ]);
  const systemStatsVariant = isSystemStatsVariantQuery(normalized);
  const systemStatsUsageSignals = includesAny(normalized, [
    "usage",
    "used",
    "using",
    "load",
    "resource",
    "performance",
    "available",
    "free",
    "current",
    "right now"
  ]);
  const systemStatsHardwareSignals = includesAny(normalized, [
    "hardware",
    "device",
    "machine",
    "windows",
    "specs",
    "spec",
    "processor",
    "gpu"
  ]);
  const ramUsageSignals = includesAny(normalized, [
    "ram usage",
    "ram used",
    "memory usage",
    "memory used",
    "available ram",
    "free ram",
    "available memory"
  ]);
  const ramCapacitySignals = includesAny(normalized, [
    "ram size",
    "how much ram",
    "total ram",
    "memory capacity",
    "memory totals"
  ]);
  const cpuUsageSignals = includesAny(normalized, [
    "cpu usage",
    "cpu load",
    "high cpu",
    "using cpu"
  ]);
  const cpuCapacitySignals = includesAny(normalized, [
    "cpu model",
    "what cpu",
    "which cpu",
    "processor model",
    "processor name",
    "processor spec"
  ]);
  const resourceHotspotSpecificSignals = includesAny(normalized, [
    "what's using",
    "whats using",
    "what is using",
    "using all my",
    "using the most",
    "top process",
    "top processes",
    "top program",
    "top programs",
    "top app",
    "top apps",
    "resource hog",
    "hogging",
    "which process",
    "which program",
    "who is using",
    "most ram",
    "most memory",
    "most cpu",
    "most gpu",
    "most disk",
    "all my ram",
    "all my memory",
    "all my cpu",
    "all my gpu",
    "all my disk",
    "using ram",
    "using cpu",
    "using gpu",
    "using disk",
    "using memory",
    "using storage",
    "processes using ram",
    "processes using cpu",
    "programs using ram",
    "programs using cpu",
    "apps using ram",
    "apps using cpu",
    "taking up the most"
  ]);
  const resourceTargetSignals = includesAny(normalized, ["ram", "memory", "cpu", "gpu", "disk", "storage"]);
  const resourceUsageSignals = includesAny(normalized, [
    "usage",
    "used",
    "using",
    "right now",
    "currently",
    "load",
    "resource"
  ]);
  const diagnosticSpecificSignals = includesAny(normalized, [
    "slow",
    "slowing",
    "slowdown",
    "lag",
    "stuck",
    "freeze",
    "bottleneck",
    "task manager",
    "event log",
    "event logs",
    "event viewer",
    "anomaly",
    "anomalies",
    "critical error",
    "warnings"
  ]);
  const strongWindowsSurfaceSignals = includesAny(normalized, [
    "windows",
    "bluetooth",
    "control panel",
    "ms settings",
    "ms-settings",
    "registry",
    "cpu",
    "ram",
    "memory",
    "drive",
    "disk",
    "service",
    "services",
    "task manager",
    "device manager",
    "event viewer"
  ]);
  const bareSettingsSignals = includesAny(normalized, ["setting", "settings"]) && !strongWindowsSurfaceSignals;
  const bareStartupSignals =
    normalized.includes("startup") &&
    !includesAny(normalized, [
      "windows",
      "startup apps",
      "app",
      "apps",
      "program",
      "programs",
      "service",
      "services",
      "task manager",
      "launch on login"
    ]);

  if (driveCapacitySignals && !resourceHotspotSpecificSignals) {
    winner = liveUsageCandidate || hardwareCandidate || winner;
  }
  if (fileStorageSignals && fileCandidate) {
    winner = fileCandidate;
  }
  if (conversationStorageFamily) {
    winner =
      scored.find((entry) => entry.family === conversationStorageFamily) ??
      (conversationStorageFamily === "live-usage" ? liveUsageCandidate : fileCandidate) ??
      winner;
  }

  if (winner.score === 0) {
    if (systemStatsVariant) {
      winner = liveUsageCandidate || hardwareCandidate || winner;
    } else if (driveCapacitySignals) {
      winner = liveUsageCandidate || hardwareCandidate || winner;
    } else if (conversationStorageFamily) {
      winner =
        scored.find((entry) => entry.family === conversationStorageFamily) ??
        (conversationStorageFamily === "live-usage" ? liveUsageCandidate : fileCandidate) ??
        winner;
    } else {
      return {
        family: "repo-change",
        label: INTENT_LABELS["repo-change"],
        confidence: 0,
        signals: [],
        targetAreas: INTENT_TARGET_AREAS["repo-change"]
      };
    }
  }
  const hardwareSpecificSignals = includesAny(normalized, [
    "cpu model",
    "gpu",
    "vram",
    "video memory",
    "graphics card",
    "hardware",
    "drive",
    "display",
    "network adapter",
    "memory totals",
    "ram size",
    "processor spec"
  ]);

  if (winner.family === "repo-change" && fileCandidate && fileSpecificSignals && !repoSpecificSignals) {
    winner = fileCandidate;
  }
  if (
    winner.family === "hardware" &&
    performanceCandidate &&
    (performanceSpecificSignals || ramUsageSignals || cpuUsageSignals) &&
    !hardwareSpecificSignals &&
    !ramCapacitySignals &&
    !cpuCapacitySignals &&
    !resourceHotspotSpecificSignals
  ) {
    winner = performanceCandidate;
  }
  if (
    winner.family === "hardware" &&
    performanceCandidate &&
    resourceUsageSignals &&
    resourceTargetSignals &&
    !hardwareSpecificSignals &&
    !ramCapacitySignals &&
    !cpuCapacitySignals &&
    !resourceHotspotSpecificSignals
  ) {
    winner = performanceCandidate;
  }
  const bareResourceComboQuery =
    resourceUsageSelection.mode === "focused" &&
    resourceUsageSelection.targets.length >= 2 &&
    !includesAny(normalized, ["do i have", "what do i have", "have i", "spec", "specs", "specification", "model", "models", "installed"]);

  if (bareResourceComboQuery && !diagnosticSpecificSignals && !resourceHotspotSpecificSignals) {
    winner = liveUsageCandidate || winner;
  }
  if (resourceHotspotCandidate && resourceHotspotSpecificSignals) {
    winner = resourceHotspotCandidate;
  }
  if (systemStatsVariant && !resourceHotspotSpecificSignals) {
    winner = liveUsageCandidate || winner;
  }

  if (
    (systemStatsVariant || liveUsageSpecificSignals) &&
    liveUsageCandidate &&
    !diagnosticSpecificSignals &&
    !resourceHotspotSpecificSignals
  ) {
    winner = liveUsageCandidate;
  }
  if (winner.family === "settings-control-panel" && bareSettingsSignals) {
    winner = scored.find((entry) => entry.family === "repo-change") ?? winner;
  }
  if (winner.family === "process-service-startup" && bareStartupSignals) {
    winner = scored.find((entry) => entry.family === "repo-change") ?? winner;
  }
  const supportingSignals = uniqueStrings([
    ...winner.signals,
    ...(driveCapacitySignals ? ["drive-storage"] : []),
    ...(fileStorageSignals ? ["file-storage"] : []),
    ...(conversationStorageFamily ? ["storage-context"] : []),
    ...(systemStatsVariant ? ["system-stats"] : []),
    ...(winner.family === "live-usage" ? ["live-usage"] : []),
    ...(winner.family === "repo-change" && includesAny(normalized, ["since restart", "since startup", "since last session", "what changed"])
      ? ["change"]
      : []),
    ...(winner.family === "performance-diagnostic" && includesAny(normalized, ["slow", "lag", "ram", "cpu", "memory"])
      ? ["diagnostic"]
      : []),
    ...(winner.family === "resource-hotspot" ? ["hotspot"] : []),
    ...(winner.family === "on-screen" && includesAny(normalized, ["window", "button", "tab", "click", "hover"])
      ? ["ui"]
      : [])
  ]);

  const confidence = clamp(0.2 + winner.score * 0.14 + Math.min(0.16, supportingSignals.length * 0.04));

  return {
    family: winner.family,
    label: INTENT_LABELS[winner.family],
    confidence,
    signals: supportingSignals,
    targetAreas: INTENT_TARGET_AREAS[winner.family]
  };
};

export const planAwarenessIntents = (
  query: string,
  conversationContext?: AwarenessConversationContext | null
): AwarenessIntentPlan => {
  const primary = routeAwarenessIntent(query, conversationContext);
  const normalized = normalizeQuery(query);
  const conjunctionHint =
    normalized.includes(" and ") ||
    normalized.includes(" also ") ||
    normalized.includes(" plus ") ||
    normalized.includes(" while ") ||
    normalized.includes(" then ");
  const threshold = conjunctionHint ? 0.2 : 0.35;

  const secondary = (Object.keys(INTENT_KEYWORDS) as AwarenessIntentFamily[])
    .filter((family) => family !== primary.family)
    .map((family) => {
      const { score, signals } = scoreIntent(query, family);
      return { family, score, signals };
    })
    .filter((entry) => entry.score >= threshold || entry.signals.length >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(
      (entry) =>
        ({
          family: entry.family,
          label: INTENT_LABELS[entry.family],
          confidence: clamp(0.15 + entry.score * 0.14 + Math.min(0.12, entry.signals.length * 0.03)),
          signals: uniqueStrings(entry.signals),
          targetAreas: INTENT_TARGET_AREAS[entry.family]
        }) satisfies AwarenessIntentRoute
    );

  return {
    primary,
    secondary
  };
};

const fileRootsByName = (snapshot: FileAwarenessSnapshot, query: string): string | null => {
  const normalized = normalizeQuery(query);
  const root = snapshot.roots.find((candidate) => {
    const rootName = normalizeQuery(candidate.label || path.basename(candidate.path));
    return normalized.includes(rootName);
  });

  return root ? normalizePathForMatch(root.path) : null;
};

const filterChangesByPath = (
  changes: FileChangeEntry[],
  folderPath: string,
  onlyToday = false,
  now = new Date()
): FileChangeEntry[] => {
  const normalized = normalizePathForMatch(folderPath);
  const today = now.toDateString();
  return changes.filter((change) => {
    const inFolder =
      isWithinPath(change.path, normalized) ||
      (change.previousPath ? isWithinPath(change.previousPath, normalized) : false);
    if (!inFolder) {
      return false;
    }
    if (!onlyToday) {
      return true;
    }
    return new Date(change.timestamp).toDateString() === today;
  });
};

const findMatchingFileKinds = (query: string): FileMediaKind[] => {
  const normalized = normalizeQuery(query);
  const kinds: FileMediaKind[] = [];
  if (normalized.includes("photo") || normalized.includes("picture") || normalized.includes("image")) {
    kinds.push("photo");
  }
  if (normalized.includes("video")) {
    kinds.push("video");
  }
  if (normalized.includes("audio") || normalized.includes("music")) {
    kinds.push("audio");
  }
  if (normalized.includes("document") || normalized.includes("doc")) {
    kinds.push("document");
  }
  return uniqueStrings(kinds) as FileMediaKind[];
};

const findLikelyProcessMatches = (
  snapshot: MachineAwarenessSnapshot,
  query: string
): MachineAwarenessSnapshot["processSnapshot"]["processes"] => {
  const normalized = normalizeQuery(query);
  const scored = snapshot.processSnapshot.processes
    .map((process) => {
      const haystack = [
        process.name,
        process.executablePath,
        process.commandLine,
        process.windowTitle,
        process.publisher,
        process.signer
      ]
        .filter(Boolean)
        .join(" ");
      const score = normalizeQuery(haystack)
        .split(/\s+/)
        .reduce((total, token) => (normalized.includes(token) ? total + 1 : total), 0);
      return { process, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || (right.process.memoryBytes ?? 0) - (left.process.memoryBytes ?? 0)
    );

  return scored.slice(0, 3).map((item) => item.process);
};

const relatedServicesForProcess = (
  machine: MachineAwarenessSnapshot,
  process: MachineAwarenessSnapshot["processSnapshot"]["processes"][number]
): string[] => {
  const tokens = uniqueStrings(
    [process.name, process.executablePath, process.windowTitle, process.publisher].filter(
      (value): value is string => Boolean(value)
    )
  ).map((value) => normalizeQuery(value));
  const related = machine.serviceSnapshot.services
    .filter((service) => {
      if (service.linkedProcessId === process.pid) {
        return true;
      }

      const haystack = normalizeQuery(
        [service.serviceName, service.displayName, service.executablePath, service.account].filter(Boolean).join(" ")
      );
      return tokens.some((token) => token && haystack.includes(token));
    })
    .map((service) => service.displayName || service.serviceName);

  return uniqueStrings(related);
};

const linkedProcessesForService = (machine: MachineAwarenessSnapshot, serviceName: string): number[] => {
  const normalized = normalizeQuery(serviceName);
  const service = machine.serviceSnapshot.services.find((candidate) =>
    normalizeQuery([candidate.serviceName, candidate.displayName].filter(Boolean).join(" ")).includes(normalized)
  );
  return service?.linkedProcessId ? [service.linkedProcessId] : [];
};

const summarizeProcessFocus = (
  current: MachineAwarenessSnapshot["processSnapshot"]["processes"][number],
  machine: MachineAwarenessSnapshot
): string => {
  const memory = current.memoryBytes != null ? formatBytes(current.memoryBytes) : "n/a";
  const cpu =
    current.cpuPercent != null
      ? `${current.cpuPercent.toFixed(0)}% CPU`
      : current.cpuSeconds != null
        ? `${current.cpuSeconds.toFixed(1)}s CPU`
        : "CPU n/a";
  const services = relatedServicesForProcess(machine, current);
  return `${current.name}#${current.pid} (${memory}, ${cpu})${services.length > 0 ? ` | services: ${services.join(", ")}` : ""}`;
};

const findLikelyInstalledAppForProcess = (
  machine: MachineAwarenessSnapshot,
  process: MachineAwarenessSnapshot["processSnapshot"]["processes"][number]
): MachineAwarenessSnapshot["installedAppsSnapshot"]["apps"][number] | null => {
  const exactMatch = machine.installedAppsSnapshot.apps.find(
    (app) => app.associatedProcessIds.includes(process.pid) || app.associatedProcessNames.includes(process.name)
  );
  if (exactMatch) {
    return exactMatch;
  }

  const processTokens = uniqueStrings(
    [process.name, process.executablePath, process.commandLine, process.windowTitle, process.publisher, process.signer]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => tokenizeNormalized(normalizeQuery(value)))
      .filter((token) => token.length > 2)
  );

  const scored = machine.installedAppsSnapshot.apps
    .map((app) => {
      const haystack = normalizeQuery(
        [app.name, app.publisher, app.installLocation, app.displayIcon, app.uninstallCommand, app.quietUninstallCommand]
          .filter(Boolean)
          .join(" ")
      );
      const score =
        (app.publisher && process.publisher && normalizeQuery(app.publisher) === normalizeQuery(process.publisher) ? 3 : 0) +
        (app.name && normalizeQuery(process.name).includes(normalizeQuery(app.name)) ? 2 : 0) +
        processTokens.reduce((total, token) => (haystack.includes(token) ? total + 1 : total), 0);
      return {
        app,
        score
      };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.score ? scored[0].app : null;
};

const formatHotspotAmount = (
  resource: ResourceHotspotResource,
  value: number,
  options: {
    metricKind: "memory" | "cpu-percent" | "cpu-seconds" | "io-rate" | "io-bytes" | "gpu-percent";
  }
): string => {
  switch (resource) {
    case "ram":
      return formatBytes(value);
    case "cpu":
      return options.metricKind === "cpu-percent" ? `${value.toFixed(0)}% CPU` : `${value.toFixed(1)}s CPU`;
    case "gpu":
      return `${value.toFixed(0)}% GPU`;
    case "disk":
      return options.metricKind === "io-rate" ? `${formatBytes(value)}/s I/O` : `${formatBytes(value)} I/O`;
    default:
      return `${value.toFixed(1)}`;
  }
};

const buildHotspotDescription = (input: {
  appName: string | null;
  processName: string;
  pid: number | null;
  executablePath: string | null;
  publisher: string | null;
  linkedServices: string[];
  windowTitle: string | null;
}): string => {
  const parts = [
    input.appName ? `App: ${input.appName}` : null,
    `Process: ${input.processName}${input.pid != null ? `#${input.pid}` : ""}`,
    input.executablePath ? `Path: ${input.executablePath}` : null,
    input.publisher ? `Publisher: ${input.publisher}` : null,
    input.windowTitle ? `Window: ${input.windowTitle}` : null,
    input.linkedServices.length > 0 ? `Services: ${input.linkedServices.join(", ")}` : null
  ].filter((value): value is string => Boolean(value));

  return parts.join(" | ");
};

const buildResourceHotspotEntries = (input: {
  machine: MachineAwarenessSnapshot;
  resource: ResourceHotspotResource;
  grouping: ResourceHotspotGrouping;
  topN: number;
}): {
  entries: AwarenessResourceHotspotEntry[];
  fallbackNotice: string | null;
} => {
  const { machine, resource, grouping, topN } = input;
  const processes = machine.processSnapshot.processes;
  const hasCpuPercent = resource === "cpu" && processes.some((process) => process.cpuPercent != null);
  const hasDiskRate = resource === "disk" && processes.some((process) => process.ioReadBytesPerSec != null || process.ioWriteBytesPerSec != null);
  const hasGpuPercent = resource === "gpu" && processes.some((process) => process.gpuPercent != null);

  if (resource === "gpu" && !hasGpuPercent) {
    return {
      entries: [],
      fallbackNotice: "Windows did not expose per-process GPU attribution in this snapshot."
    };
  }

  const processSignals = processes
    .map((process) => {
      const app = findLikelyInstalledAppForProcess(machine, process);
      const linkedServices = relatedServicesForProcess(machine, process);
      let metricKind: "memory" | "cpu-percent" | "cpu-seconds" | "io-rate" | "io-bytes" | "gpu-percent" = "memory";
      let rawValue: number | null = null;
      let resourceAmount = "n/a";

      switch (resource) {
        case "ram": {
          rawValue = process.memoryBytes ?? null;
          metricKind = "memory";
          resourceAmount = rawValue != null ? formatBytes(rawValue) : "n/a";
          break;
        }
        case "cpu": {
          if (hasCpuPercent && process.cpuPercent != null) {
            rawValue = process.cpuPercent;
            metricKind = "cpu-percent";
            resourceAmount = `${process.cpuPercent.toFixed(0)}% CPU`;
          } else if (process.cpuSeconds != null) {
            rawValue = process.cpuSeconds;
            metricKind = "cpu-seconds";
            resourceAmount = `${process.cpuSeconds.toFixed(1)}s CPU`;
          }
          break;
        }
        case "disk": {
          if (hasDiskRate) {
            const ioPerSec = (process.ioReadBytesPerSec ?? 0) + (process.ioWriteBytesPerSec ?? 0);
            rawValue = ioPerSec;
            metricKind = "io-rate";
            resourceAmount = `${formatBytes(ioPerSec)}/s I/O`;
          } else {
            const ioBytes = (process.ioReadBytes ?? 0) + (process.ioWriteBytes ?? 0);
            rawValue = ioBytes;
            metricKind = "io-bytes";
            resourceAmount = `${formatBytes(ioBytes)} I/O`;
          }
          break;
        }
        case "gpu": {
          rawValue = process.gpuPercent ?? null;
          metricKind = "gpu-percent";
          resourceAmount = rawValue != null ? `${rawValue.toFixed(0)}% GPU` : "n/a";
          break;
        }
      }

      return {
        process,
        app,
        linkedServices,
        rawValue,
        resourceAmount,
        metricKind
      };
    })
    .filter((entry) => entry.rawValue != null && entry.rawValue >= 0)
    .sort((left, right) => (right.rawValue ?? 0) - (left.rawValue ?? 0));

  const totalResourceValue =
    resource === "ram"
      ? machine.systemIdentity.hardware.memory.totalBytes
      : processSignals.reduce((total, entry) => total + (entry.rawValue ?? 0), 0);

  const grouped = new Map<
    string,
    {
      label: string;
      processName: string;
      pid: number | null;
      appName: string | null;
      executablePath: string | null;
      publisher: string | null;
      linkedServices: string[];
      description: string;
      cpuPercent: number | null;
      memoryBytes: number | null;
      ioBytes: number | null;
      gpuPercent: number | null;
      windowTitle: string | null;
      resourceValue: number;
      metricKind: "memory" | "cpu-percent" | "cpu-seconds" | "io-rate" | "io-bytes" | "gpu-percent";
      processes: number;
    }
  >();

  for (const entry of processSignals) {
    const process = entry.process;
    const app = entry.app;
    const groupKey =
      grouping === "program" && app
        ? `app:${normalizeQuery([app.name, app.publisher ?? ""].filter(Boolean).join(" "))}`
        : `process:${process.pid}`;
    const currentValue = entry.rawValue ?? 0;
    const existing = grouped.get(groupKey);
    const label = grouping === "program" && app ? app.name : `${process.name}#${process.pid}`;
    const description = buildHotspotDescription({
      appName: grouping === "program" ? app?.name ?? null : app?.name ?? null,
      processName: process.name,
      pid: process.pid,
      executablePath: process.executablePath,
      publisher: app?.publisher ?? process.publisher,
      linkedServices: entry.linkedServices,
      windowTitle: process.windowTitle
    });

    if (!existing) {
      grouped.set(groupKey, {
        label,
        processName: process.name,
        pid: process.pid,
        appName: app?.name ?? null,
        executablePath: process.executablePath,
        publisher: app?.publisher ?? process.publisher,
        linkedServices: [...entry.linkedServices],
        description,
        cpuPercent: process.cpuPercent ?? null,
        memoryBytes: process.memoryBytes ?? null,
        ioBytes: (process.ioReadBytes ?? 0) + (process.ioWriteBytes ?? 0),
        gpuPercent: process.gpuPercent ?? null,
        windowTitle: process.windowTitle,
        resourceValue: currentValue,
        metricKind: entry.metricKind,
        processes: 1
      });
      continue;
    }

    existing.resourceValue += currentValue;
    existing.processes += 1;
    existing.linkedServices = uniqueStrings([...existing.linkedServices, ...entry.linkedServices]);
    if (grouping === "program" && !existing.appName && app?.name) {
      existing.appName = app.name;
      existing.label = app.name;
    }
    existing.ioBytes += (process.ioReadBytes ?? 0) + (process.ioWriteBytes ?? 0);
  }

  const entries = [...grouped.values()]
    .sort((left, right) => right.resourceValue - left.resourceValue || left.label.localeCompare(right.label))
    .slice(0, topN)
    .map((entry, index) => {
      const resourceShare =
        totalResourceValue > 0 ? clamp(entry.resourceValue / totalResourceValue) : null;
      const resourceAmount = formatHotspotAmount(resource, entry.resourceValue, {
        metricKind: entry.metricKind
      });

      return {
        resource,
        grouping,
        rank: index + 1,
        label: entry.label,
        processName: entry.processName,
        pid: entry.pid,
        appName: entry.appName,
        resourceAmount,
        resourceShare,
        executablePath: entry.executablePath,
        publisher: entry.publisher,
        linkedServices: uniqueStrings(entry.linkedServices).slice(0, 4),
        description: entry.description,
        cpuPercent: entry.cpuPercent,
        memoryBytes: entry.memoryBytes,
        ioBytes: entry.ioBytes,
        gpuPercent: entry.gpuPercent,
        windowTitle: entry.windowTitle
      } satisfies AwarenessResourceHotspotEntry;
    });

  return {
    entries,
    fallbackNotice: null
  };
};

const describeUiElement = (element: ScreenUiElement | null | undefined): string | null => {
  if (!element) {
    return null;
  }

  const label = element.name ?? element.localizedControlType ?? element.controlType;
  if (!label) {
    return null;
  }

  return element.controlType && element.controlType !== "Pane" ? `${label} (${element.controlType})` : label;
};

const summarizeFileAwareness = (
  snapshot: FileAwarenessSnapshot | null | undefined,
  query: string,
  mode: AwarenessSummaryMode,
  now = new Date()
): {
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction: string | null;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  confidence: number;
  freshness: FreshnessMetadata | null;
} => {
  if (!snapshot) {
    return {
      verifiedFindings: [],
      likelyInterpretation: [],
      uncertainty: ["No file catalog is available right now."],
      suggestedNextChecks: ["Refresh file awareness for the current workspace."],
      safeNextAction: "Refresh file awareness for the relevant folder.",
      evidenceRefs: [],
      affectedAreas: ["files"],
      confidence: 0.1,
      freshness: null
    };
  }

  const normalized = normalizeQuery(query);
  const folderPath = fileRootsByName(snapshot, query);
  const folderSummary = folderPath ? (snapshot.folders.find((folder) => normalizePathForMatch(folder.path) === folderPath) ?? null) : null;
  const mediaKinds = findMatchingFileKinds(query);
  const wantsLargest = includesAny(normalized, ["largest", "biggest", "space", "storage", "disk"]);
  const wantsNewest = includesAny(normalized, ["newest", "recent", "latest"]);
  const wantsChanges = includesAny(normalized, ["changed", "modified", "today", "recently", "since restart"]);

  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(snapshot.fingerprint, "file", "file-catalog", snapshot.roots[0]?.path)
  ];

  if (folderSummary) {
    verifiedFindings.push(
      `${path.basename(folderSummary.path) || compactPath(folderSummary.path)} contains ${folderSummary.fileCount} files and ${formatBytes(folderSummary.totalSizeBytes)} total`
    );
    if (folderSummary.recentChangeCount > 0) {
      verifiedFindings.push(
        `${path.basename(folderSummary.path) || compactPath(folderSummary.path)} has ${folderSummary.recentChangeCount} recent changes`
      );
    }
    evidenceRefs.push(makeEvidenceRef(folderSummary.path, "file", "folder-summary", folderSummary.path));
  }

  if (wantsLargest) {
    const largest = [...snapshot.files]
      .filter((entry) => entry.privacyScope === "public metadata" || entry.privacyScope === "user-visible local content")
      .sort((left, right) => (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0))
      .slice(0, mode === "short" ? 2 : 4);
    if (largest.length > 0) {
      verifiedFindings.push(
        `Largest files: ${largest
          .slice(0, MODE_LIMITS[mode])
          .map((entry) => `${compactPath(entry.path)} (${formatBytes(entry.sizeBytes)})`)
          .join(" | ")}`
      );
      evidenceRefs.push(...largest.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", "largest-file", entry.path)));
    }
  }

  if (wantsNewest) {
    const newest = [...snapshot.files]
      .filter((entry) => entry.privacyScope === "public metadata" || entry.privacyScope === "user-visible local content")
      .sort((left, right) => (right.modifiedAt ?? "").localeCompare(left.modifiedAt ?? ""))
      .slice(0, mode === "short" ? 2 : 4);
    if (newest.length > 0) {
      verifiedFindings.push(
        `Newest files: ${newest
          .slice(0, MODE_LIMITS[mode])
          .map((entry) => `${compactPath(entry.path)}${entry.modifiedAt ? ` @ ${entry.modifiedAt}` : ""}`)
          .join(" | ")}`
      );
      evidenceRefs.push(...newest.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", "newest-file", entry.path)));
    }
  }

  if (wantsChanges) {
    const changes = folderPath ? filterChangesByPath(snapshot.changes, folderPath, normalized.includes("today"), now) : snapshot.changes.slice(0, 4);
    if (changes.length > 0) {
      verifiedFindings.push(
        `Recent changes: ${changes
          .slice(0, MODE_LIMITS[mode] + 1)
          .map((entry) => `${entry.type} ${compactPath(entry.path)}`)
          .join(" | ")}`
      );
      evidenceRefs.push(...changes.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", `change:${entry.type}`, entry.path)));
    }
  }

  if (mediaKinds.length > 0) {
    for (const kind of mediaKinds) {
      const matches = snapshot.media
        .filter((entry) => entry.mediaKind === kind)
        .sort((left, right) => (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0))
        .slice(0, MODE_LIMITS[mode] + 1);
      if (matches.length > 0) {
        verifiedFindings.push(
          `${kind} files: ${matches
            .map((entry) => `${compactPath(entry.path)}${entry.sizeBytes ? ` (${formatBytes(entry.sizeBytes)})` : ""}`)
            .join(" | ")}`
        );
        evidenceRefs.push(...matches.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", `${kind}-media`, entry.path)));
      }
    }
  }

  if (!folderSummary && mediaKinds.length === 0 && !wantsLargest && !wantsNewest && !wantsChanges) {
    const searchResults = searchFileMatches(snapshot, query, MODE_LIMITS[mode] + 2);
    const folderResults = searchFolderMatches(snapshot, query, MODE_LIMITS[mode] + 2);
    const mediaResults = searchMediaMatches(snapshot, query, MODE_LIMITS[mode] + 2);

    if (searchResults.length > 0) {
      verifiedFindings.push(`Matched files: ${searchResults.map((entry) => compactPath(entry.path)).join(" | ")}`);
      evidenceRefs.push(...searchResults.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", "file-match", entry.path)));
    }

    if (folderResults.length > 0) {
      verifiedFindings.push(`Matched folders: ${folderResults.map((entry) => compactPath(entry.path)).join(" | ")}`);
      evidenceRefs.push(...folderResults.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", "folder-match", entry.path)));
    }

    if (mediaResults.length > 0) {
      verifiedFindings.push(`Matched media: ${mediaResults.map((entry) => compactPath(entry.path)).join(" | ")}`);
      evidenceRefs.push(...mediaResults.slice(0, 2).map((entry) => makeEvidenceRef(entry.path, "file", "media-match", entry.path)));
    }
  }

  if (snapshot.summary.blockedScopes.length > 0) {
    uncertainty.push(`Some file locations are blocked by privacy scope: ${snapshot.summary.blockedScopes.join(", ")}`);
  }

  if (snapshot.isTruncated) {
    uncertainty.push("The file catalog is truncated, so there may be additional unseen items.");
  }

  if (verifiedFindings.length === 0) {
    uncertainty.push("No strong file evidence matched this question.");
    suggestedNextChecks.push("Try a folder name, file name, or a media type.");
  }

  if (folderSummary) {
    likelyInterpretation.push(
      `The folder hotspot appears to be ${path.basename(folderSummary.path) || compactPath(folderSummary.path)}, with ${folderSummary.recentChangeCount} recent changes and ${formatBytes(folderSummary.totalSizeBytes)} total.`
    );
    suggestedNextChecks.push(`Inspect ${compactPath(folderSummary.path)} if you want the file-by-file breakdown.`);
  }

  if (wantsLargest) {
    likelyInterpretation.push("The biggest files are the strongest candidates for storage pressure.");
    suggestedNextChecks.push("Open the largest files list or filter by video/document type.");
  }

  if (wantsChanges) {
    likelyInterpretation.push("Recent changes are likely concentrated in the folder you asked about.");
    suggestedNextChecks.push("Refresh that folder again if the change happened moments ago.");
  }

  if (mediaKinds.includes("video")) {
    likelyInterpretation.push("The largest videos are probably the main storage-heavy media items.");
  }

  const confidence = clamp(
    0.2 +
      Math.min(0.45, verifiedFindings.length * 0.12) +
      (folderSummary ? 0.15 : 0) +
      (wantsLargest || wantsChanges || mediaKinds.length > 0 ? 0.1 : 0)
  );

  return {
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    safeNextAction: folderSummary ? `Review ${compactPath(folderSummary.path)} in File Explorer.` : "Review the relevant folder or media list.",
    evidenceRefs,
    affectedAreas: ["files", "media"],
    confidence,
    freshness: snapshot.freshness
  };
};

const searchFileMatches = (snapshot: FileAwarenessSnapshot, query: string, limit: number) =>
  snapshot.files
    .filter((entry) => entry.privacyScope === "public metadata" || entry.privacyScope === "user-visible local content")
    .filter((entry) => {
      const haystack = normalizeQuery([entry.name, entry.path, entry.extension, entry.mimeType, entry.contentHint, entry.mediaKind ?? ""].filter(Boolean).join(" "));
      const tokens = normalizeQuery(query)
        .split(/\s+/)
        .filter((token) => token.length > 2);
      return tokens.some((token) => haystack.includes(token));
    })
    .sort((left, right) => (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0))
    .slice(0, limit);

const searchFolderMatches = (snapshot: FileAwarenessSnapshot, query: string, limit: number) =>
  snapshot.folders
    .filter((entry) => entry.privacyScope === "public metadata" || entry.privacyScope === "user-visible local content")
    .filter((entry) => {
      const haystack = normalizeQuery([entry.name, entry.path, ...Object.keys(entry.fileTypeCounts)].join(" "));
      const tokens = normalizeQuery(query)
        .split(/\s+/)
        .filter((token) => token.length > 2);
      return tokens.some((token) => haystack.includes(token));
    })
    .sort((left, right) => right.totalSizeBytes - left.totalSizeBytes)
    .slice(0, limit);

const searchMediaMatches = (snapshot: FileAwarenessSnapshot, query: string, limit: number) =>
  snapshot.media
    .filter((entry) => entry.privacyScope === "public metadata" || entry.privacyScope === "user-visible local content")
    .filter((entry) => {
      const haystack = normalizeQuery([entry.name, entry.path, entry.mediaKind, entry.mimeType, entry.contentHint, ...entry.tags].filter(Boolean).join(" "));
      const tokens = normalizeQuery(query)
        .split(/\s+/)
        .filter((token) => token.length > 2);
      return tokens.some((token) => haystack.includes(token));
    })
    .sort((left, right) => (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0))
    .slice(0, limit);

const EVENT_LOG_LEVEL_WEIGHT: Record<MachineAwarenessSnapshot["eventLogSnapshot"]["entries"][number]["level"], number> = {
  critical: 5,
  error: 4,
  warning: 3,
  information: 2,
  verbose: 1,
  unknown: 0
};

const sortEventLogEntries = (entries: MachineAwarenessSnapshot["eventLogSnapshot"]["entries"]) =>
  [...entries].sort((left, right) => {
    const levelDelta = EVENT_LOG_LEVEL_WEIGHT[right.level] - EVENT_LOG_LEVEL_WEIGHT[left.level];
    if (levelDelta !== 0) {
      return levelDelta;
    }
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });

const summarizeEventLogEntry = (
  entry: MachineAwarenessSnapshot["eventLogSnapshot"]["entries"][number],
  includeMessage = false
): string => {
  const provider = entry.provider ?? "unknown-provider";
  const eventCode = entry.eventId != null ? `#${entry.eventId}` : "#n/a";
  const base = `${entry.level.toUpperCase()} ${entry.logName}/${provider}${eventCode}`;
  if (!includeMessage || !entry.message) {
    return base;
  }
  return `${base} ${entry.message}`;
};

const eventLogProviderSummary = (
  entries: MachineAwarenessSnapshot["eventLogSnapshot"]["entries"],
  limit = 4
): Array<{ provider: string; totalCount: number; errorCount: number }> => {
  const counts = new Map<string, { provider: string; totalCount: number; errorCount: number }>();
  for (const entry of entries) {
    const provider = entry.provider?.trim() || "unknown-provider";
    const current = counts.get(provider) ?? { provider, totalCount: 0, errorCount: 0 };
    current.totalCount += 1;
    if (entry.level === "critical" || entry.level === "error") {
      current.errorCount += 1;
    }
    counts.set(provider, current);
  }

  return [...counts.values()]
    .sort((left, right) => right.errorCount - left.errorCount || right.totalCount - left.totalCount)
    .slice(0, limit);
};

const buildEventLogDiagnostics = (input: AwarenessEventLogDiagnosticInput): AwarenessEventLogDiagnostic => {
  const machine = input.current.machineAwareness;
  const eventLogs = machine.eventLogSnapshot;
  const entries = sortEventLogEntries(eventLogs.entries).slice(0, 8);
  const topProviders = eventLogProviderSummary(eventLogs.entries, 5);
  const severeCount = eventLogs.counts.critical + eventLogs.counts.error;
  const warningCount = eventLogs.counts.warning;

  const verifiedFindings = [
    `${eventLogs.totalCount} event-log entries captured from ${eventLogs.logs.join(", ") || "configured logs"}.`,
    `${severeCount} critical/error entries and ${warningCount} warning entries were observed in the window.`,
    entries.length > 0
      ? `Recent entries: ${entries.slice(0, 3).map((entry) => summarizeEventLogEntry(entry)).join(" | ")}`
      : "No event-log entries were captured in the current window."
  ];

  const likelyInterpretation = [
    severeCount > 0
      ? "Recent critical/error events can explain visible instability or slowdowns."
      : "No severe event-log signals were detected in the recent window.",
    topProviders.length > 0
      ? `Top recurring providers: ${topProviders
          .slice(0, 2)
          .map((provider) => `${provider.provider} (${provider.errorCount} severe)`)
          .join(" | ")}.`
      : "No provider recurrence signal is available from the captured events."
  ];
  const uncertainty = [
    eventLogs.isTruncated ? "The event-log list is truncated, so additional relevant events may not be included." : "",
    eventLogs.totalCount === 0 ? "Event logs were empty or unavailable for the configured window." : ""
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Open Event Viewer and filter the same time window for the top provider.",
    "Correlate severe events with the top process and service hotspots.",
    "Refresh machine awareness to capture a newer event-log window."
  ];

  const confidence = clamp(0.5 + Math.min(0.35, severeCount * 0.03 + topProviders.length * 0.04));
  return {
    capturedAt: eventLogs.capturedAt,
    freshness: restampFreshness(eventLogs.freshness, input.now),
    summary: buildSummaryText(
      [
        `${severeCount} severe event-log entries`,
        topProviders.length > 0
          ? `Top provider: ${topProviders[0].provider} (${topProviders[0].errorCount} severe)`
          : "Top provider: none",
        entries.length > 0 ? `Recent: ${summarizeEventLogEntry(entries[0])}` : "Recent: none"
      ],
      "medium"
    ),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.eventsPath, "event", "awareness-events", input.paths.eventsPath)
    ]),
    affectedAreas: ["machine", "session"],
    windowStartAt: eventLogs.windowStartAt,
    windowEndAt: eventLogs.windowEndAt,
    counts: eventLogs.counts,
    topProviders,
    recentEntries: entries
  };
};

const ANOMALY_SEVERITY_WEIGHT: Record<MachineAnomalyFinding["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3
};

const sortAnomalyFindings = (findings: MachineAnomalyFinding[]): MachineAnomalyFinding[] =>
  [...findings].sort(
    (left, right) =>
      ANOMALY_SEVERITY_WEIGHT[right.severity] - ANOMALY_SEVERITY_WEIGHT[left.severity] ||
      right.confidence - left.confidence
  );

const buildAnomalyFindings = (machine: MachineAwarenessSnapshot): MachineAnomalyFinding[] => {
  const findings: MachineAnomalyFinding[] = [];
  const topProcess = [...machine.processSnapshot.processes].sort(
    (left, right) => (right.memoryBytes ?? 0) - (left.memoryBytes ?? 0) || (right.cpuSeconds ?? 0) - (left.cpuSeconds ?? 0)
  )[0];
  const totalMemory = machine.systemIdentity.hardware.memory.totalBytes || 0;
  const topMemory = topProcess?.memoryBytes ?? 0;
  const memoryShare = totalMemory > 0 ? topMemory / totalMemory : 0;

  if (topProcess && (topMemory >= 1_500_000_000 || memoryShare >= 0.3)) {
    findings.push({
      id: "memory-pressure",
      category: "memory-pressure",
      severity: topMemory >= 2_000_000_000 || memoryShare >= 0.45 ? "high" : "medium",
      title: `High memory pressure from ${topProcess.name}#${topProcess.pid}`,
      evidence: [
        `${topProcess.name} is using ${formatBytes(topMemory)}.`,
        totalMemory > 0 ? `This is about ${Math.round(memoryShare * 100)}% of total RAM.` : "Total RAM could not be determined."
      ],
      confidence: clamp(0.65 + Math.min(0.25, memoryShare))
    });
  }

  const eventLogs = machine.eventLogSnapshot;
  const severeEvents = eventLogs.entries.filter((entry) => entry.level === "critical" || entry.level === "error");
  if (severeEvents.length >= 3) {
    findings.push({
      id: "event-log-severe-burst",
      category: "event-log-burst",
      severity: severeEvents.length >= 6 ? "high" : "medium",
      title: `${severeEvents.length} severe event-log entries in the recent window`,
      evidence: severeEvents.slice(0, 3).map((entry) => summarizeEventLogEntry(entry, true)),
      confidence: clamp(0.62 + Math.min(0.28, severeEvents.length * 0.04))
    });
  }

  const providerWithRecurringSevere = eventLogProviderSummary(severeEvents, 3).find(
    (provider) => provider.errorCount >= 2
  );
  if (providerWithRecurringSevere) {
    findings.push({
      id: `provider-recurring-${normalizeQuery(providerWithRecurringSevere.provider).replace(/\s+/g, "-") || "unknown"}`,
      category: "provider-recurring-errors",
      severity: providerWithRecurringSevere.errorCount >= 4 ? "high" : "medium",
      title: `${providerWithRecurringSevere.provider} has recurring severe errors`,
      evidence: [
        `${providerWithRecurringSevere.errorCount} severe entries were captured for ${providerWithRecurringSevere.provider}.`
      ],
      confidence: clamp(0.58 + Math.min(0.28, providerWithRecurringSevere.errorCount * 0.06))
    });
  }

  const startupEntries = machine.startupSnapshot.totalCount;
  if (startupEntries >= 18) {
    findings.push({
      id: "startup-density",
      category: "startup-density",
      severity: startupEntries >= 28 ? "high" : "medium",
      title: `High startup load: ${startupEntries} startup-linked entries`,
      evidence: [
        `${machine.startupSnapshot.folderEntries.length} folder entries`,
        `${machine.startupSnapshot.registryEntries.length} registry entries`,
        `${machine.startupSnapshot.scheduledTaskEntries.length} scheduled task entries`
      ],
      confidence: clamp(0.52 + Math.min(0.24, startupEntries / 60))
    });
  }

  return sortAnomalyFindings(findings);
};

const buildAnomalyDiagnostics = (input: AwarenessAnomalyDiagnosticInput): AwarenessAnomalyDiagnostic => {
  const machine = input.current.machineAwareness;
  const findings = buildAnomalyFindings(machine);
  const verifiedFindings =
    findings.length > 0
      ? findings.map((finding) => `${finding.severity.toUpperCase()}: ${finding.title}`)
      : ["No strong anomaly pattern was detected in the current machine snapshot."];
  const likelyInterpretation =
    findings.length > 0
      ? [
          "The detected anomalies point to focused follow-up checks instead of broad machine-wide scans.",
          "Correlating event-log signals with process/service hotspots should narrow root cause quickly."
        ]
      : ["The current snapshot looks stable, but this does not rule out transient issues outside the capture window."];
  const uncertainty = [
    machine.eventLogSnapshot.totalCount === 0 ? "Event-log evidence is sparse or unavailable." : "",
    machine.processSnapshot.isTruncated ? "Process evidence is truncated and may miss additional hotspots." : "",
    machine.eventLogSnapshot.isTruncated ? "Event-log evidence is truncated and may miss additional anomalies." : ""
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Re-run diagnostics when the issue is actively happening.",
    "Inspect the top anomaly evidence in Event Viewer or Task Manager.",
    "Ask for process-to-service correlation on the suspected process."
  ];

  const topFindingConfidence = findings.length > 0 ? Math.max(...findings.map((finding) => finding.confidence)) : 0.3;
  const confidence = clamp(findings.length > 0 ? 0.55 + Math.min(0.3, findings.length * 0.08 + (topFindingConfidence - 0.5)) : 0.35);
  return {
    capturedAt: machine.capturedAt,
    freshness: restampFreshness(machine.freshness, input.now),
    summary: findings.length > 0
      ? buildSummaryText(
          findings
            .slice(0, 3)
            .map((finding) => `${finding.severity.toUpperCase()}: ${finding.title}`),
          "medium"
        )
      : "No strong anomaly pattern was detected in the current machine snapshot.",
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.eventsPath, "event", "awareness-events", input.paths.eventsPath),
      makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
    ]),
    affectedAreas: ["machine", "session"],
    findings
  };
};

const buildPerformanceDiagnostics = (input: AwarenessPerformanceDiagnosticInput): AwarenessPerformanceDiagnostic => {
  const machine = input.current.machineAwareness;
  const eventLogs = machine.eventLogSnapshot;
  const cpuLoadPercent = machine.systemIdentity.hardware.cpuLoadPercent;
  const severeEventCount = eventLogs.counts.critical + eventLogs.counts.error;
  const anomalyHints = buildAnomalyFindings(machine).slice(0, 2);
  const processes = [...machine.processSnapshot.processes].sort((left, right) => {
    const memoryDelta = (right.memoryBytes ?? 0) - (left.memoryBytes ?? 0);
    if (memoryDelta !== 0) {
      return memoryDelta;
    }
    return (right.cpuSeconds ?? 0) - (left.cpuSeconds ?? 0);
  });

  const topProcesses = processes.slice(0, 5).map((process) => ({
    processName: process.name,
    pid: process.pid,
    memoryBytes: process.memoryBytes,
    cpuSeconds: process.cpuSeconds,
    linkedServices: relatedServicesForProcess(machine, process)
  }));

  const runningServices = [...machine.serviceSnapshot.services].filter((service) => service.state.toLowerCase() === "running");
  const serviceHotspots = runningServices
    .map((service) => {
      const linkedProcessId = service.linkedProcessId;
      const matchReason = linkedProcessId
        ? "linked process id"
        : linkedProcessesForService(machine, service.serviceName).length > 0
          ? "name match"
          : null;
      return {
        serviceName: service.serviceName,
        displayName: service.displayName,
        state: service.state,
        startupType: service.startupType,
        linkedProcessId,
        matchReason
      };
    })
    .slice(0, 5);

  const totalMemory = machine.systemIdentity.hardware.memory.totalBytes;
  const availableMemoryRaw =
    machine.systemIdentity.hardware.memory.availableBytes ?? machine.systemIdentity.hardware.memory.freeBytes ?? null;
  const availableMemory = availableMemoryRaw != null ? Math.max(0, availableMemoryRaw) : null;
  const usedMemory = availableMemory != null ? Math.max(0, totalMemory - availableMemory) : null;
  const usedMemoryPercent = usedMemory != null && totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : null;
  const cpuLoadLine = cpuLoadPercent != null ? `CPU load: ${cpuLoadPercent}%` : "CPU load unavailable.";
  const uptimeLine = `Uptime: ${formatUptime(machine.systemIdentity.uptimeSeconds)}`;

  const verifiedFindings = [
    cpuLoadLine,
    uptimeLine,
    totalMemory > 0
      ? `RAM usage: ${usedMemory != null ? `${formatBytes(usedMemory)} used` : "used memory unavailable"} of ${formatBytes(totalMemory)}${usedMemoryPercent != null ? ` (${usedMemoryPercent}%)` : ""}${availableMemory != null ? ` | available ${formatBytes(availableMemory)}` : ""}`
      : "RAM totals are unavailable in the current snapshot.",
    ...topProcesses.slice(0, MODE_LIMITS.medium).map((entry) =>
    summarizeProcessFocus(machine.processSnapshot.processes.find((process) => process.pid === entry.pid)!, machine)
    )
  ];
  const topProcessPath = machine.processSnapshot.processes.find((process) => process.pid === topProcesses[0]?.pid)?.executablePath;
  if (topProcessPath) {
    verifiedFindings.push(`Top process path: ${topProcessPath}`);
  }
  if (eventLogs.totalCount > 0) {
    verifiedFindings.push(
      `Event logs: ${severeEventCount} severe entries in ${eventLogs.totalCount} recent event-log entries`
    );
  }
  if (anomalyHints.length > 0) {
    verifiedFindings.push(
      `Anomaly hints: ${anomalyHints
        .map((finding) => `${finding.severity.toUpperCase()} ${finding.title}`)
        .join(" | ")}`
    );
  }

  const memoryTotal = totalMemory;
  const topMemory = topProcesses[0]?.memoryBytes ?? 0;
  const memoryShare = memoryTotal > 0 ? topMemory / memoryTotal : 0;
  const topCpuProcess = [...processes].sort((left, right) => (right.cpuSeconds ?? 0) - (left.cpuSeconds ?? 0))[0] ?? null;
  if (topCpuProcess) {
    verifiedFindings.push(
      `CPU hotspot: ${topCpuProcess.name}#${topCpuProcess.pid} (${formatCpuSeconds(topCpuProcess.cpuSeconds)})`
    );
  }
  const confidence = clamp(
    0.55 +
      Math.min(
        0.35,
        topProcesses.length * 0.05 +
          serviceHotspots.length * 0.04 +
          Math.min(0.14, severeEventCount * 0.02)
      )
  );

  const likelyInterpretation = [
    memoryShare >= 0.25
      ? "The top process is consuming a large share of available RAM."
      : "The top process list suggests where the most active load is concentrated.",
    severeEventCount > 0
      ? "Recent severe event-log entries suggest there may be a related machine fault or recurring service issue."
      : serviceHotspots.length > 0
      ? "One or more running services may be contributing to the background load."
      : "No obvious service hotspot stood out from the current snapshot."
  ];
  const uncertainty = [
    machine.processSnapshot.isTruncated ? "The process list is truncated, so there may be additional heavy processes." : "",
    eventLogs.isTruncated ? "The event-log list is truncated, so there may be additional severe entries." : "",
    "CPU seconds are cumulative, so they are a rough indicator rather than a live percentage.",
    "Disk or GPU bottlenecks are not fully captured by the process list alone."
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Open Task Manager > Processes and sort by Memory.",
    "Open Event Viewer and filter for critical/error entries in the same timeframe.",
    "Open Resource Monitor if you want a deeper disk/CPU breakdown.",
    "Check startup apps if the slowdown happens right after sign-in."
  ];

  return {
    capturedAt: machine.capturedAt,
    freshness: restampFreshness(machine.freshness, input.now),
    summary: buildSummaryText(
      [
        cpuLoadLine,
        uptimeLine,
        `Top process: ${topProcesses[0] ? summarizeProcessFocus(machine.processSnapshot.processes.find((process) => process.pid === topProcesses[0].pid)!, machine) : "none"}`,
        `Services: ${serviceHotspots.slice(0, 2).map((service) => `${service.serviceName} (${service.state})`).join(" | ") || "none"}`,
        `Event-log severe entries: ${severeEventCount}`
      ],
      "medium"
    ),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath),
      makeEvidenceRef(input.paths.eventsPath, "event", "events", input.paths.eventsPath)
    ]),
    affectedAreas: ["machine", "session"],
    topProcesses,
    serviceHotspots
  };
};

const buildStartupDiagnostics = (input: AwarenessStartupDiagnosticInput): AwarenessStartupDiagnostic => {
  const startup = input.current.machineAwareness.startupSnapshot;
  const entries = [
    ...startup.folderEntries,
    ...startup.registryEntries,
    ...startup.scheduledTaskEntries,
    ...startup.launcherHints
  ];

  const startupEntries = entries.slice(0, 8).map((entry) => ({
    name: entry.name,
    source: entry.source,
    location: entry.location,
    command: entry.command,
    target: entry.target,
    linkedAppName: entry.linkedAppName
  }));

  const verifiedFindings = [
    `${startup.folderEntries.length} startup folder entries`,
    `${startup.registryEntries.length} registry startup entries`,
    `${startup.scheduledTaskEntries.length} scheduled startup tasks`
  ];
  if (startup.launcherHints.length > 0) {
    verifiedFindings.push(`${startup.launcherHints.length} launcher hints linked to processes or apps`);
  }

  const likelyInterpretation = [
    startupEntries.length > 0
      ? "These entries are the most likely launch points for apps and background helpers at sign-in."
      : "No obvious startup entries were detected in the current snapshot."
  ];
  const uncertainty = [
    startup.launcherHints.length > 0 ? "Launcher hints are inferred from name/path matching, not explicit startup metadata." : "",
    input.current.machineAwareness.startupSnapshot.isTruncated ? "The startup inventory is truncated." : ""
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Inspect the startup folder for the listed launchers.",
    "Review Run / RunOnce registry zones in read-only mode.",
    "Check Task Scheduler for logon and startup triggers."
  ];

  return {
    capturedAt: input.current.machineAwareness.capturedAt,
    freshness: restampFreshness(input.current.machineAwareness.freshness, input.now),
    summary: buildSummaryText(
      [
        `Startup items: ${startupEntries.slice(0, 3).map((entry) => `${entry.name} (${entry.source})`).join(" | ") || "none"}`,
        `Counts: ${startup.folderEntries.length} folder, ${startup.registryEntries.length} registry, ${startup.scheduledTaskEntries.length} scheduled`
      ],
      "medium"
    ),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence: clamp(0.6 + Math.min(0.25, startupEntries.length * 0.03)),
    confidenceLevel: confidenceLevelFor(0.6 + Math.min(0.25, startupEntries.length * 0.03)),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.eventsPath, "event", "events", input.paths.eventsPath)
    ]),
    affectedAreas: ["machine", "session"],
    startupEntries
  };
};

const buildStorageDiagnostics = (input: AwarenessStorageDiagnosticInput): AwarenessStorageDiagnostic => {
  const snapshot = input.current.fileAwarenessSnapshot;
  const freshness = restampFreshness(
    snapshot?.freshness ?? input.current.fileAwarenessSummary?.freshness ?? input.current.digest.freshness,
    input.now
  );

  if (!snapshot) {
    const confidence = 0.2;
    return {
      capturedAt: input.current.fileAwarenessSummary?.capturedAt ?? input.current.digest.generatedAt,
      freshness,
      summary: "No file awareness snapshot is available.",
      verifiedFindings: ["No file awareness snapshot is available."],
      likelyInterpretation: ["Storage diagnostics need a current file catalog."],
      uncertainty: ["The file-awareness snapshot has not been captured yet."],
      suggestedNextChecks: ["Refresh file awareness before asking about disk usage or large files."],
      confidence,
      confidenceLevel: confidenceLevelFor(confidence),
      evidenceRefs: [],
      affectedAreas: ["files", "media"],
      topFiles: [],
      hotFolders: []
    };
  }

  const topFiles = snapshot.summary.largestFiles.slice(0, 6).map((entry) => ({
    path: entry.path,
    sizeBytes: entry.sizeBytes,
    category: entry.category,
    mediaKind: entry.mediaKind
  }));
  const hotFolders = snapshot.summary.hotFolders.slice(0, 6).map((folder) => ({
    path: folder.path,
    totalSizeBytes: folder.totalSizeBytes,
    recentChangeCount: folder.recentChangeCount,
    hotScore: folder.hotScore
  }));
  const verifiedFindings = [
    topFiles.length > 0
      ? `Largest files: ${topFiles
          .slice(0, 3)
          .map((entry) => `${compactPath(entry.path)} (${formatBytes(entry.sizeBytes)})`)
          .join(" | ")}`
      : "No large-file summary is available.",
    hotFolders.length > 0
      ? `Hot folders: ${hotFolders
          .slice(0, 3)
          .map((folder) => `${compactPath(folder.path)} (${formatBytes(folder.totalSizeBytes)}, ${folder.recentChangeCount} recent changes)`)
          .join(" | ")}`
      : "No hot-folder summary is available.",
    `Blocked scopes: ${snapshot.summary.blockedScopes.length > 0 ? snapshot.summary.blockedScopes.join(", ") : "none"}`
  ];
  const likelyInterpretation = [
    topFiles.length > 0
      ? "The largest visible files are the most likely storage consumers in the indexed roots."
      : "The indexed roots do not currently show large visible files.",
    hotFolders.length > 0
      ? "Hot folders combine size and recency, so they are the best places to inspect for recent growth."
      : "No folder stood out as both large and recently changed."
  ];
  const uncertainty = [
    snapshot.isTruncated ? "The file catalog is truncated, so the largest-file view may be incomplete." : "",
    snapshot.summary.blockedScopes.length > 0
      ? `Sensitive or protected scopes were excluded: ${snapshot.summary.blockedScopes.join(", ")}`
      : ""
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Ask for the biggest files or videos in a specific folder if you want a narrower answer.",
    "Refresh file awareness after major downloads or cleanup."
  ];
  const confidence = clamp(0.68 + Math.min(0.18, topFiles.length * 0.03 + hotFolders.length * 0.02));

  return {
    capturedAt: snapshot.capturedAt,
    freshness,
    summary: buildSummaryText(
      [
        topFiles.length > 0
          ? `Largest: ${topFiles
              .slice(0, 2)
              .map((entry) => `${compactPath(entry.path)} (${formatBytes(entry.sizeBytes)})`)
              .join(" | ")}`
          : "Largest: none",
        hotFolders.length > 0
          ? `Hot folders: ${hotFolders
              .slice(0, 2)
              .map((folder) => compactPath(folder.path))
              .join(" | ")}`
          : "Hot folders: none"
      ],
      "medium"
    ),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.fileCurrentCatalogPath ?? input.paths.currentSessionPath, "file", "file-catalog", input.paths.fileCurrentCatalogPath),
      makeEvidenceRef(input.paths.fileLatestSummaryPath ?? input.paths.currentSessionPath, "file", "file-summary", input.paths.fileLatestSummaryPath)
    ]),
    affectedAreas: ["files", "media"],
    topFiles,
    hotFolders
  };
};

const buildCurrentUiDiagnostics = (input: AwarenessCurrentUiDiagnosticInput): AwarenessCurrentUiDiagnostic => {
  const screen = input.current.screenAwareness;
  const uiTree = screen?.uiTree ?? null;
  const activeWindow = screen?.foregroundWindow ?? null;
  const visibleControls = uiTree?.root ? collectUiHighlights(uiTree.root, { limit: 8, includeContainers: false }) : [];
  const hoveredTarget = describeUiElement(uiTree?.elementUnderCursor ?? null);
  const focusedTarget = describeUiElement(uiTree?.focusedElement ?? findFocusedUiElement(uiTree?.root ?? null));
  const blockedInputs = uniqueStrings([
    ...(screen?.summary.highlights.blockedInputs ?? []),
    ...summarizeRecentEvents(screen?.recentEvents ?? [], 5).filter((event) => event.toLowerCase().includes("protected input"))
  ]);

  const verifiedFindings = [
    activeWindow ? `Active window: ${formatWindowSummary(activeWindow)}` : "No foreground window is available right now.",
    visibleControls.length > 0 ? `Visible controls: ${visibleControls.slice(0, 4).join(" | ")}` : "No visible controls were captured.",
    hoveredTarget ? `Hovered target: ${hoveredTarget}` : "No hovered target is available."
  ];
  if (focusedTarget) {
    verifiedFindings.push(`Focused target: ${focusedTarget}`);
  }

  const likelyInterpretation = [
    activeWindow
      ? `The user is likely interacting with ${activeWindow.title ?? activeWindow.processName ?? "the current window"}.`
      : "Assist Mode is likely off or the current window has not been captured yet."
  ];
  const uncertainty = [
    screen?.assistMode.enabled ? "" : "Assist Mode is off, so live UI data is limited.",
    uiTree?.redactedCount ? `${uiTree.redactedCount} protected input field(s) were blocked.` : "",
    !visibleControls.length ? "No control tree was available to inspect." : ""
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    screen?.assistMode.enabled ? "Refresh Assist Mode to sample the current UI again." : "Start Assist Mode for the current window or app.",
    "Ask for the active tab or likely next button if you need click guidance."
  ];

  const confidence = clamp(screen?.assistMode.enabled ? 0.8 : 0.35);
  return {
    capturedAt: screen?.capturedAt ?? input.current.machineAwareness.capturedAt,
    freshness: restampFreshness(screen?.freshness ?? input.current.machineAwareness.freshness, input.now),
    summary: buildSummaryText(
      [
        activeWindow ? `Window: ${formatWindowSummary(activeWindow)}` : "Window: none",
        visibleControls.length > 0 ? `Controls: ${visibleControls.slice(0, 3).join(" | ")}` : "Controls: none"
      ],
      "medium"
    ),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.screenCurrentPath ?? input.paths.currentSessionPath, "screen", "screen-snapshot", input.paths.screenCurrentPath),
      makeEvidenceRef(input.paths.screenEventsPath ?? input.paths.eventsPath, "event", "screen-events", input.paths.screenEventsPath)
    ]),
    affectedAreas: ["screen", "assist", "ui", "interaction"],
    activeWindow,
    visibleControls,
    hoveredTarget,
    focusedTarget,
    blockedInputs
  };
};

const formatPowerState = (value: boolean | null | undefined): string =>
  value == null ? "unknown" : value ? "on" : "off";

const buildSettingsControlRegistryAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const normalizedQuery = normalizeQuery(query);
  const settingsMatch = findSettingsMapEntry(query);
  const controlMatch = findControlPanelEntry(query);
  const registryMatch = findRegistryZoneEntry(query);
  const settingsSearch = searchSettingsMapEntries(query, MODE_LIMITS[mode] + 1);
  const controlSearch = searchControlPanelEntries(query, MODE_LIMITS[mode] + 1);
  const registrySearch = searchRegistryZoneEntries(query, MODE_LIMITS[mode] + 1);

  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs = [
    makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
    makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
  ];
  const radioState = current.machineAwareness.systemIdentity.hardware.radioState ?? null;
  const wantsBluetoothState = includesAny(normalizedQuery, ["bluetooth"]);
  const wantsWifiState = includesAny(normalizedQuery, ["wifi", "wi fi", "wireless"]);
  const wantsAirplaneState = includesAny(normalizedQuery, ["airplane mode", "airplane", "flight mode"]);
  const wantsRadioState = wantsBluetoothState || wantsWifiState || wantsAirplaneState;

  if (radioState && wantsRadioState) {
    if (wantsBluetoothState) {
      verifiedFindings.push(`Bluetooth radio is ${formatPowerState(radioState.bluetoothEnabled)}.`);
      likelyInterpretation.push(`Bluetooth is ${formatPowerState(radioState.bluetoothEnabled)} on this machine.`);
    }
    if (wantsWifiState) {
      verifiedFindings.push(`Wi-Fi radio is ${formatPowerState(radioState.wifiEnabled)}.`);
      likelyInterpretation.push(`Wi-Fi is ${formatPowerState(radioState.wifiEnabled)} on this machine.`);
    }
    if (wantsAirplaneState) {
      verifiedFindings.push(`Airplane mode is ${formatPowerState(radioState.airplaneModeEnabled)}.`);
      likelyInterpretation.push(`Airplane mode is ${formatPowerState(radioState.airplaneModeEnabled)} on this machine.`);
    }
  } else if (wantsRadioState) {
    uncertainty.push("A radio-state snapshot was not captured for this machine.");
    suggestedNextChecks.push("Try opening the related Bluetooth or Network settings page for a manual check.");
  }

  if (settingsMatch) {
    verifiedFindings.push(`${settingsMatch.label} opens with ${settingsMatch.launchTarget}`);
    likelyInterpretation.push(`The Windows Settings page for "${settingsMatch.label}" is the best place to change this.`);
  }
  if (controlMatch) {
    verifiedFindings.push(`${controlMatch.label} opens with ${controlMatch.launchTarget}`);
    likelyInterpretation.push(`The classic Control Panel / MMC item for "${controlMatch.label}" is available too.`);
  }
  if (registryMatch) {
    verifiedFindings.push(`${registryMatch.category} is usually controlled at ${registryMatch.hive}${registryMatch.path}`);
    likelyInterpretation.push("A read-only registry inspection is likely the next best check.");
  }

  if (!settingsMatch && settingsSearch.length > 0) {
    verifiedFindings.push(`Settings matches: ${settingsSearch.map((entry) => `${entry.label} -> ${entry.launchTarget}`).join(" | ")}`);
  }
  if (!controlMatch && controlSearch.length > 0) {
    verifiedFindings.push(`Control panel matches: ${controlSearch.map((entry) => `${entry.label} -> ${entry.launchTarget}`).join(" | ")}`);
  }
  if (!registryMatch && registrySearch.length > 0) {
    verifiedFindings.push(`Registry zone matches: ${registrySearch.map((entry) => `${entry.category}: ${entry.hive}${entry.path}`).join(" | ")}`);
  }

  if (verifiedFindings.length === 0) {
    uncertainty.push("No exact settings, control-panel, or registry-zone match was found.");
    suggestedNextChecks.push("Try a more specific Windows feature name or the related app/setting category.");
  }

  const bundle = buildEvidenceBundle({
    freshness: current.machineAwareness.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    safeNextAction: settingsMatch
      ? `Open ${settingsMatch.launchTarget} if you want to inspect it manually.`
      : controlMatch
        ? `Open ${controlMatch.launchTarget} for the classic panel.`
        : registryMatch
          ? `Inspect ${registryMatch.hive}${registryMatch.path} read-only.`
          : null,
    confidence: clamp(0.65 + Math.min(0.2, (settingsMatch ? 0.1 : 0) + (controlMatch ? 0.1 : 0) + (registryMatch ? 0.1 : 0))),
    evidenceRefs,
    affectedAreas: settingsMatch ? ["machine", "context"] : controlMatch ? ["machine", "context"] : ["machine", "privacy"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

const buildLiveUsageAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const identity = current.machineAwareness.systemIdentity;
  const hardware = identity.hardware;
  const selection = parseResourceUsageTargets(query);
  const primaryGpu = hardware.gpus[0] ?? null;
  const primaryDrive = hardware.drives.find((drive) => drive.driveType === "3") ?? hardware.drives[0] ?? null;
  const availableMemory = hardware.memory.availableBytes ?? hardware.memory.freeBytes ?? null;
  const usedMemory =
    availableMemory != null ? Math.max(0, hardware.memory.totalBytes - availableMemory) : null;
  const usedMemoryPercent =
    usedMemory != null && hardware.memory.totalBytes > 0
      ? Math.round((usedMemory / hardware.memory.totalBytes) * 100)
      : null;

  const cpuLine =
    hardware.cpuLoadPercent != null
      ? `Current CPU load: ${hardware.cpuLoadPercent}%`
      : `CPU load: ${hardware.cpu.name} is available, but live CPU load was not captured.`;
  const ramLine = `Current RAM: ${usedMemory != null ? `${formatBytes(usedMemory)} used` : "usage unavailable"} of ${formatBytes(hardware.memory.totalBytes)}${
    usedMemoryPercent != null ? ` (${usedMemoryPercent}%)` : ""
  }${availableMemory != null ? ` | available ${formatBytes(availableMemory)}` : ""}`;
  const gpuLine = primaryGpu
    ? `GPU: ${primaryGpu.name}${
        primaryGpu.loadPercent != null ? ` | live load ${primaryGpu.loadPercent}%` : " | live load unavailable"
      }${primaryGpu.memoryBytes != null ? ` | VRAM ${formatBytes(primaryGpu.memoryBytes)}` : ""}`
    : "GPU: no GPU details were captured.";
  const diskLine =
    selection.mode === "focused" && selection.targets.includes("disk")
      ? describeDriveFreeSpace(primaryDrive)
      : primaryDrive
        ? `Disk: ${primaryDrive.deviceId}${primaryDrive.volumeLabel ? ` (${primaryDrive.volumeLabel})` : ""}${
            primaryDrive.totalBytes != null
              ? ` | free ${formatBytes(primaryDrive.freeBytes ?? 0)} of ${formatBytes(primaryDrive.totalBytes)}`
              : ""
          }`
        : "Disk: no drive details were captured.";
  const uptimeLine = `Uptime: ${formatUptime(identity.uptimeSeconds)}`;
  const orderedLines = pickResourceUsageFindings([cpuLine, ramLine, gpuLine, diskLine, uptimeLine], selection);

  const bundle = buildEvidenceBundle({
    freshness: identity.freshness,
    verifiedFindings: orderedLines,
    likelyInterpretation: [],
    uncertainty: [],
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: clamp(0.95),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
    ]),
    affectedAreas: ["machine"],
    mode: "detailed",
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

const buildHardwareAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const identity = current.machineAwareness.systemIdentity;
  const hardware = identity.hardware;
  const normalizedQuery = normalizeQuery(query);
  const selection = parseResourceUsageTargets(query);
  const gpuFocused = includesAny(normalizedQuery, ["gpu", "graphics", "graphics card", "vram", "video memory"]);
  const vramFocused = includesAny(normalizedQuery, ["vram", "video memory"]);
  const cpuFocused = includesAny(normalizedQuery, ["cpu", "processor"]);
  const windowsFocused = includesAny(normalizedQuery, ["windows", "build", "edition", "version", "os"]);
  const memoryFocused = includesAny(normalizedQuery, ["ram", "memory"]);
  const usageFocused = includesAny(normalizedQuery, ["usage", "used", "available", "free"]);

  const availableMemoryRaw = hardware.memory.availableBytes ?? hardware.memory.freeBytes ?? null;
  const availableMemory = availableMemoryRaw != null ? Math.max(0, availableMemoryRaw) : null;
  const usedMemory = availableMemory != null ? Math.max(0, hardware.memory.totalBytes - availableMemory) : null;
  const usedMemoryPercent =
    usedMemory != null && hardware.memory.totalBytes > 0
      ? Math.round((usedMemory / hardware.memory.totalBytes) * 100)
      : null;
  const ramUsageLine = `${formatBytes(hardware.memory.totalBytes)} RAM${
    usedMemory != null ? ` | used ${formatBytes(usedMemory)}${usedMemoryPercent != null ? ` (${usedMemoryPercent}%)` : ""}` : ""
  }${availableMemory != null ? ` | available ${formatBytes(availableMemory)}` : ""}`;
  const gpuDetails =
    hardware.gpus.length > 0
      ? hardware.gpus.slice(0, MODE_LIMITS[mode] + 1).map((gpu) =>
          `${gpu.name}${gpu.loadPercent != null ? ` | live load ${gpu.loadPercent}%` : ""}${
            gpu.memoryBytes != null ? ` | VRAM ${formatBytes(gpu.memoryBytes)}` : ""
          }${
            gpu.driverVersion ? ` | driver ${gpu.driverVersion}` : ""
          }`
        )
      : ["No GPU summary was captured."];
  const windowsLine = `${identity.machineName} | ${
    identity.windowsEdition ?? identity.windowsVersion ?? "Windows"
  }${identity.windowsBuild ? ` build ${identity.windowsBuild}` : ""} | ${identity.architecture}`;
  const cpuLine = `${hardware.cpu.name} (${hardware.cpu.cores} cores / ${hardware.cpu.logicalCores} threads${
    hardware.cpu.speedMHz != null ? ` @ ${hardware.cpu.speedMHz}MHz` : ""
  })${hardware.cpuLoadPercent != null ? ` | live load ${hardware.cpuLoadPercent}%` : ""}`;
  const uptimeLine = `Uptime: ${formatUptime(identity.uptimeSeconds)}`;
  const topProcess = [...current.machineAwareness.processSnapshot.processes].sort(
    (left, right) => (right.memoryBytes ?? 0) - (left.memoryBytes ?? 0) || (right.cpuSeconds ?? 0) - (left.cpuSeconds ?? 0)
  )[0] ?? null;
  const topProcessLine = topProcess
    ? `Top process: ${topProcess.name}#${topProcess.pid} (${
        topProcess.memoryBytes != null ? formatBytes(topProcess.memoryBytes) : "mem n/a"
      }, ${formatCpuSeconds(topProcess.cpuSeconds)})`
    : "Top process: none";
  const gpuLine = hardware.gpus.length > 0 ? `GPU: ${gpuDetails.join(" | ")}` : "No GPU summary was captured.";
  const driveLine =
    hardware.drives.length > 0
      ? `Drives: ${hardware.drives
          .slice(0, MODE_LIMITS[mode] + 1)
          .map((drive) => `${drive.deviceId}${drive.volumeLabel ? ` (${drive.volumeLabel})` : ""}`)
          .join(" | ")}`
      : "No drives were reported.";

  const focusedResourceLines = pickResourceUsageFindings(
    [
      `CPU: ${cpuLine}`,
      `RAM: ${ramUsageLine}`,
      uptimeLine,
      topProcessLine,
      gpuLine,
      windowsLine,
      driveLine
    ],
    selection
  );
  const prioritizedVerifiedFindings =
    selection.mode === "focused" && focusedResourceLines.length > 0
      ? focusedResourceLines
      : [
          ...(gpuFocused || vramFocused ? [`GPU: ${gpuDetails[0]}`] : []),
          ...(cpuFocused ? [`CPU: ${cpuLine}`] : []),
          ...(memoryFocused ? [`RAM: ${ramUsageLine}`] : []),
          ...(windowsFocused ? [`Windows: ${windowsLine}`] : []),
          cpuLine,
          ramUsageLine,
          uptimeLine,
          topProcessLine,
          gpuLine,
          windowsLine,
          driveLine
        ];
  const verifiedFindings = limitStrings(prioritizedVerifiedFindings, MODE_LIMITS[mode] + 3);

  const likelyInterpretation =
    selection.mode === "focused"
      ? []
      : [
          hardware.gpus.length > 0 ? `GPU: ${hardware.gpus[0].name}` : "No GPU summary was captured.",
          hardware.networkAdapters.length > 0 ? `Network adapter: ${hardware.networkAdapters[0].name}` : "No active network adapter summary was captured."
        ];
  const uncertainty =
    selection.mode === "focused"
      ? []
      : [
          identity.windowsEdition ? "" : "The Windows edition was not detected.",
          hardware.displays.length === 0 ? "Display details were not available in this snapshot." : "",
          vramFocused && usageFocused
            ? "Live VRAM usage is not captured in the current snapshot; only installed GPU/VRAM capacity is available."
            : ""
        ].filter(Boolean) as string[];
  const bundle = buildEvidenceBundle({
    freshness: current.machineAwareness.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: clamp(0.72),
    evidenceRefs: trimEvidenceRefs([
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
    ]),
    affectedAreas: ["machine"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

const buildProcessServiceStartupAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const machine = current.machineAwareness;
  const processMatches = findLikelyProcessMatches(machine, query);
  const startupEntries = [
    ...machine.startupSnapshot.folderEntries,
    ...machine.startupSnapshot.registryEntries,
    ...machine.startupSnapshot.scheduledTaskEntries,
    ...machine.startupSnapshot.launcherHints
  ];
  const startupMatches = startupEntries.filter((entry) => {
    const haystack = normalizeQuery([entry.name, entry.command, entry.target, entry.location, entry.linkedAppName].filter(Boolean).join(" "));
    const tokens = normalizeQuery(query).split(/\s+/).filter((token) => token.length > 2);
    return tokens.some((token) => haystack.includes(token));
  });
  const serviceMatches = machine.serviceSnapshot.services
    .filter((service) =>
      includesAny(query, [service.serviceName, service.displayName, service.executablePath ?? "", service.account ?? ""])
    )
    .slice(0, MODE_LIMITS[mode] + 2);

  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
    makeEvidenceRef(input.paths.eventsPath, "event", "events", input.paths.eventsPath)
  ];

  if (processMatches.length > 0) {
    verifiedFindings.push(`Process matches: ${processMatches.map((process) => summarizeProcessFocus(process, machine)).join(" | ")}`);
    const processPaths = processMatches
      .map((process) => (process.executablePath ? `${process.name} -> ${process.executablePath}` : null))
      .filter((value): value is string => Boolean(value));
    if (processPaths.length > 0) {
      verifiedFindings.push(`Process executable paths: ${processPaths.join(" | ")}`);
    }
    evidenceRefs.push(...processMatches.slice(0, 2).map((process) => makeEvidenceRef(`${process.pid}`, "api", `process-${process.pid}`)));
  }

  if (serviceMatches.length > 0) {
    verifiedFindings.push(
      `Service matches: ${serviceMatches
        .map((service) => `${service.displayName} [${service.state}, ${service.startupType}]`)
        .join(" | ")}`
    );
    const servicePaths = serviceMatches
      .map((service) =>
        service.executablePath ? `${service.displayName || service.serviceName} -> ${service.executablePath}` : null
      )
      .filter((value): value is string => Boolean(value));
    if (servicePaths.length > 0) {
      verifiedFindings.push(`Service executable paths: ${servicePaths.join(" | ")}`);
    }
    evidenceRefs.push(
      ...serviceMatches.slice(0, 2).map((service) => makeEvidenceRef(service.serviceName, "api", `service-${service.serviceName}`))
    );
  }

  if (startupMatches.length > 0) {
    verifiedFindings.push(`Startup matches: ${startupMatches.map((entry) => `${entry.name} (${entry.source})`).join(" | ")}`);
    evidenceRefs.push(
      ...startupMatches.slice(0, 2).map((entry) => makeEvidenceRef(entry.location, "api", `startup-${entry.source}`, entry.location))
    );
  }

  if (processMatches.length === 0 && serviceMatches.length === 0 && startupMatches.length === 0) {
    uncertainty.push("No exact process, service, or startup item match was found.");
    suggestedNextChecks.push("Try the executable name, display name, or startup entry label.");
  }

  if (processMatches.length > 0) {
    likelyInterpretation.push(`The most relevant live process is ${processMatches[0].name}#${processMatches[0].pid}.`);
  }
  if (serviceMatches.length > 0) {
    likelyInterpretation.push(`The most relevant service is ${serviceMatches[0].displayName}.`);
  }
  if (startupMatches.length > 0) {
    likelyInterpretation.push("That app likely launches from one of the startup entries above.");
  }

  const bundle = buildEvidenceBundle({
    freshness: machine.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks: [
      "Check Task Manager for the process.",
      "Inspect Services or Task Scheduler in read-only mode.",
      "Review startup entries if the issue appears at sign-in."
    ],
    safeNextAction: processMatches.length > 0 ? `Inspect ${processMatches[0].name} in Task Manager.` : "Inspect the relevant service or startup entry in read-only mode.",
    confidence: clamp(0.62 + Math.min(0.2, (processMatches.length + serviceMatches.length + startupMatches.length) * 0.04)),
    evidenceRefs,
    affectedAreas: ["machine"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

function buildFileFolderMediaAnswer(input: AwarenessQueryBuildInput & { route: AwarenessIntentRoute }): AwarenessQueryAnswer {
  const mode = chooseMode(input.query, input.mode);
  const scope = input.scope ?? chooseScopeForQuery(input.query);
  const fileSummary = summarizeFileAwareness(input.current.fileAwarenessSnapshot ?? null, input.query, mode, input.now ?? new Date());
  const route = input.route;

  const bundle = buildEvidenceBundle({
    freshness: fileSummary.freshness ?? input.current.fileAwarenessSummary?.freshness ?? input.current.digest.freshness,
    verifiedFindings: fileSummary.verifiedFindings,
    likelyInterpretation: fileSummary.likelyInterpretation,
    uncertainty: fileSummary.uncertainty,
    suggestedNextChecks: fileSummary.suggestedNextChecks,
    safeNextAction: fileSummary.safeNextAction,
    confidence: fileSummary.confidence,
    evidenceRefs: fileSummary.evidenceRefs,
    affectedAreas: fileSummary.affectedAreas,
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query: input.query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
}

const buildPerformanceAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const route = input.route ?? routeAwarenessIntent(input.query);
  const diagnostics = buildPerformanceDiagnostics({
    current: input.current,
    paths: input.paths,
    now: input.now
  });
  const mode = chooseMode(input.query, input.mode);
  const eventFocused = includesAny(input.query, [
    "event",
    "events",
    "event log",
    "event logs",
    "event viewer",
    "anomaly",
    "anomalies",
    "critical",
    "warning",
    "error"
  ]);
  const ramFocused = includesAny(input.query, [
    "ram",
    "memory",
    "ram usage",
    "memory usage",
    "available ram",
    "free ram",
    "available memory"
  ]);
  const cpuFocused = includesAny(input.query, ["cpu", "cpu usage", "cpu load", "high cpu"]);
  const prioritizedVerifiedFindings = eventFocused
    ? [
        ...diagnostics.verifiedFindings.filter((line) => {
          const normalized = line.toLowerCase();
          return normalized.includes("event log") || normalized.includes("anomaly");
        }),
        ...diagnostics.verifiedFindings.filter((line) => {
          const normalized = line.toLowerCase();
          return !normalized.includes("event log") && !normalized.includes("anomaly");
        })
      ]
    : cpuFocused
      ? [
          ...diagnostics.verifiedFindings.filter((line) => line.toLowerCase().includes("cpu load")),
          ...diagnostics.verifiedFindings.filter((line) => line.toLowerCase().includes("cpu hotspot")),
          ...diagnostics.verifiedFindings.filter(
            (line) => !line.toLowerCase().includes("cpu load") && !line.toLowerCase().includes("cpu hotspot")
          )
        ]
      : ramFocused
        ? [
            ...diagnostics.verifiedFindings.filter((line) => line.toLowerCase().includes("ram usage")),
            ...diagnostics.verifiedFindings.filter((line) => !line.toLowerCase().includes("ram usage"))
          ]
    : diagnostics.verifiedFindings;

  return buildAnswer({
    query: input.query,
    intent: route,
    scope: input.scope ?? "current-machine",
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: diagnostics.confidence >= 0.55,
    bundle: buildEvidenceBundle({
      freshness: diagnostics.freshness,
      verifiedFindings: prioritizedVerifiedFindings,
      likelyInterpretation: diagnostics.likelyInterpretation,
      uncertainty: diagnostics.uncertainty,
      suggestedNextChecks: [],
      safeNextAction: null,
      confidence: diagnostics.confidence,
      evidenceRefs: diagnostics.evidenceRefs,
      affectedAreas: diagnostics.affectedAreas,
      mode,
      strictGrounding: input.strictGrounding
    })
  });
};

const buildResourceHotspotAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const machine = current.machineAwareness;
  const resource = resourceHotspotResourceForQuery(query);
  const grouping = resourceHotspotGroupingForQuery(query);
  const topN = extractTopCountFromQuery(query, RESOURCE_HOTSPOT_DEFAULT_TOP_N);
  const shareLabel = resource === "ram" ? "total RAM" : "sampled load";
  const hotspot = buildResourceHotspotEntries({
    machine,
    resource,
    grouping,
    topN
  });
  const resourceLabel = resourceHotspotDisplayLabel(resource);
  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
    makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
  ];
  const currentResourceLine =
    resource === "ram"
      ? (() => {
          const availableMemory = machine.systemIdentity.hardware.memory.availableBytes ?? machine.systemIdentity.hardware.memory.freeBytes ?? null;
          const usedMemory =
            availableMemory != null ? Math.max(0, machine.systemIdentity.hardware.memory.totalBytes - availableMemory) : null;
          const usedMemoryPercent =
            usedMemory != null && machine.systemIdentity.hardware.memory.totalBytes > 0
              ? Math.round((usedMemory / machine.systemIdentity.hardware.memory.totalBytes) * 100)
              : null;
          return `Current RAM: ${usedMemory != null ? `${formatBytes(usedMemory)} used` : "usage unavailable"} of ${formatBytes(machine.systemIdentity.hardware.memory.totalBytes)}${usedMemoryPercent != null ? ` (${usedMemoryPercent}%)` : ""}${availableMemory != null ? ` | available ${formatBytes(availableMemory)}` : ""}`;
        })()
      : resource === "cpu"
        ? `Current CPU load: ${machine.systemIdentity.hardware.cpuLoadPercent != null ? `${machine.systemIdentity.hardware.cpuLoadPercent}%` : "unavailable"}`
        : resource === "gpu"
          ? (() => {
              const gpu = machine.systemIdentity.hardware.gpus[0] ?? null;
              if (!gpu) {
                return "Current GPU: device details unavailable.";
              }
              return `Current GPU: ${gpu.name}${gpu.loadPercent != null ? ` | live load ${gpu.loadPercent}%` : " | live load unavailable"}${gpu.memoryBytes != null ? ` | VRAM ${formatBytes(gpu.memoryBytes)}` : ""}`;
            })()
          : (() => {
              const drive = machine.systemIdentity.hardware.drives.find((candidate) => candidate.driveType === "3") ?? machine.systemIdentity.hardware.drives[0] ?? null;
              if (!drive) {
                return "Current disk: drive details unavailable.";
              }
              return `Current disk: ${drive.deviceId}${drive.volumeLabel ? ` (${drive.volumeLabel})` : ""}${drive.totalBytes != null ? ` | free ${formatBytes(drive.freeBytes ?? 0)} of ${formatBytes(drive.totalBytes)}` : ""}`;
            })();

  verifiedFindings.push(currentResourceLine);

  if (hotspot.entries.length > 0) {
    const top = hotspot.entries[0];
    verifiedFindings.push(
      `Top ${resourceLabel} ${grouping}: ${top.label} using ${top.resourceAmount}${
        top.resourceShare != null ? ` (${Math.round(top.resourceShare * 100)}% of ${shareLabel})` : ""
      }.`
    );
    verifiedFindings.push(
      ...hotspot.entries.map(
        (entry) =>
          `${entry.rank}. ${entry.label} — ${entry.resourceAmount}${
            entry.resourceShare != null ? ` (${Math.round(entry.resourceShare * 100)}%)` : ""
          } | ${entry.description}`
      )
    );
    likelyInterpretation.push(`Inference: ${top.label} is the strongest ${grouping} hotspot for ${resourceLabel}.`);
    if (grouping === "program") {
      likelyInterpretation.push("Inference: Related processes were grouped into a single app when the installed-app metadata made a match.");
    }
    if (resource === "ram" && top.resourceShare != null && top.resourceShare >= 0.25) {
      likelyInterpretation.push("Inference: The top item is consuming a large share of available RAM.");
    }
    evidenceRefs.push(
      ...hotspot.entries.slice(0, 2).map((entry) =>
        makeEvidenceRef(
          entry.pid != null ? String(entry.pid) : `${entry.label}-${entry.rank}`,
          "api",
          `${resource}-hotspot-${entry.rank}`,
          entry.executablePath ?? undefined
        )
      )
    );
  } else if (resource === "gpu") {
    const gpu = machine.systemIdentity.hardware.gpus[0] ?? null;
    if (gpu) {
      verifiedFindings.push(
        `GPU device: ${gpu.name}${gpu.loadPercent != null ? ` | live load ${gpu.loadPercent}%` : ""}${
          gpu.memoryBytes != null ? ` | VRAM ${formatBytes(gpu.memoryBytes)}` : ""
        }`
      );
    } else {
      verifiedFindings.push("GPU device details were not captured in this snapshot.");
    }
    if (hotspot.fallbackNotice) {
      uncertainty.push(hotspot.fallbackNotice);
    }
    uncertainty.push("Per-process GPU attribution is not available in this snapshot.");
    likelyInterpretation.push("The GPU load is visible at the device level, but not mapped to a specific process right now.");
  } else {
    verifiedFindings.push(`No ${resourceLabel} hotspot entries were captured in the current snapshot.`);
    uncertainty.push("The process snapshot did not yield a usable hotspot ranking.");
    suggestedNextChecks.push("Refresh machine awareness to retry the hotspot scan.");
  }

  if (machine.processSnapshot.isTruncated) {
    uncertainty.push("The process snapshot is truncated, so additional hotspot candidates may exist.");
  }

  const confidence = clamp(
    hotspot.entries.length > 0
      ? 0.78 + Math.min(0.16, hotspot.entries.length * 0.03)
      : resource === "gpu" && machine.systemIdentity.hardware.gpus.length > 0
        ? 0.62
        : 0.45
  );

  const bundle = buildEvidenceBundle({
    freshness: machine.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    safeNextAction: null,
    confidence,
    evidenceRefs: trimEvidenceRefs(evidenceRefs),
    affectedAreas: ["machine"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle: {
      ...bundle,
      resourceHotspots: hotspot.entries.length > 0 ? hotspot.entries : undefined
    }
  });
};

const describeRepoWorkingTreeEntry = (entry: RepoWorkingTreeEntry): string => {
  const location = entry.previousPath
    ? `${compactPath(entry.previousPath)} -> ${compactPath(entry.path)}`
    : compactPath(entry.path);
  return `${location} (${entry.summary})`;
};

const buildWorkingTreeSummary = (repo: RepoBaseline, mode: AwarenessSummaryMode): string => {
  if (repo.dirtyState === "unknown") {
    return "Git working tree status is unavailable.";
  }

  if (repo.workingTree.totalCount === 0) {
    return "Working tree is clean.";
  }

  const { counts } = repo.workingTree;
  const tokens = [
    counts.staged > 0 ? `${counts.staged} staged` : null,
    counts.unstaged > 0 ? `${counts.unstaged} unstaged` : null,
    counts.untracked > 0 ? `${counts.untracked} untracked` : null,
    counts.conflicted > 0 ? `${counts.conflicted} conflicted` : null
  ].filter((value): value is string => Boolean(value));
  const examples = repo.workingTree.entries
    .slice(0, MODE_LIMITS[mode] + 1)
    .map(describeRepoWorkingTreeEntry);

  return [
    tokens.join(", "),
    examples.length > 0 ? examples.join(" | ") : null,
    repo.workingTree.isTruncated ? "truncated" : null
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
};

const repoEntryKey = (entry: RepoWorkingTreeEntry): string =>
  `${entry.previousPath ?? ""}->${entry.path}|${entry.kind}|${entry.stagedStatus ?? ""}|${entry.unstagedStatus ?? ""}`;

const compareWorkingTree = (currentRepo: RepoBaseline, referenceRepo: RepoBaseline) => {
  const referenceKeys = new Set(referenceRepo.workingTree.entries.map((entry) => repoEntryKey(entry)));
  const currentKeys = new Set(currentRepo.workingTree.entries.map((entry) => repoEntryKey(entry)));

  return {
    introduced: currentRepo.workingTree.entries.filter((entry) => !referenceKeys.has(repoEntryKey(entry))),
    cleared: referenceRepo.workingTree.entries.filter((entry) => !currentKeys.has(repoEntryKey(entry)))
  };
};

const appendRepoComparison = (input: {
  currentRepo: RepoBaseline;
  referenceRepo: RepoBaseline;
  referenceLabel: string;
  mode: AwarenessSummaryMode;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
}): void => {
  if (input.referenceRepo.headSha !== input.currentRepo.headSha) {
    input.verifiedFindings.push(
      `${input.referenceLabel} HEAD: ${input.referenceRepo.headSha?.slice(0, 8) ?? "none"} -> ${input.currentRepo.headSha?.slice(0, 8) ?? "none"}`
    );
  }

  if (input.referenceRepo.dirtyState !== input.currentRepo.dirtyState) {
    input.verifiedFindings.push(
      `${input.referenceLabel} dirty state: ${input.referenceRepo.dirtyState} -> ${input.currentRepo.dirtyState}`
    );
  }

  const delta = compareWorkingTree(input.currentRepo, input.referenceRepo);
  if (delta.introduced.length > 0) {
    input.verifiedFindings.push(
      `${delta.introduced.length} repo change(s) appeared since ${input.referenceLabel.toLowerCase()}: ${delta.introduced
        .slice(0, MODE_LIMITS[input.mode] + 1)
        .map(describeRepoWorkingTreeEntry)
        .join(" | ")}`
    );
  }
  if (delta.cleared.length > 0) {
    input.verifiedFindings.push(
      `${delta.cleared.length} repo change(s) cleared since ${input.referenceLabel.toLowerCase()}: ${delta.cleared
        .slice(0, MODE_LIMITS[input.mode] + 1)
        .map(describeRepoWorkingTreeEntry)
        .join(" | ")}`
    );
  }

  if (
    input.referenceRepo.headSha === input.currentRepo.headSha &&
    input.referenceRepo.dirtyState === input.currentRepo.dirtyState &&
    delta.introduced.length === 0 &&
    delta.cleared.length === 0
  ) {
    input.likelyInterpretation.push(`Repo state looks unchanged relative to the ${input.referenceLabel.toLowerCase()}.`);
  }

  if (input.currentRepo.workingTree.isTruncated || input.referenceRepo.workingTree.isTruncated) {
    input.uncertainty.push("One of the compared working-tree snapshots is truncated.");
  }
};

const buildFileSummaryDelta = (
  currentSummary: FileAwarenessSnapshot["summary"] | null | undefined,
  referenceSummary: FileAwarenessSummary | null | undefined,
  referenceLabel: string
): string[] => {
  if (!currentSummary || !referenceSummary) {
    return [];
  }

  const deltas: string[] = [];
  if (currentSummary.counts.recentChanges !== referenceSummary.counts.recentChanges) {
    deltas.push(
      `Recent file changes since ${referenceLabel.toLowerCase()}: ${referenceSummary.counts.recentChanges} -> ${currentSummary.counts.recentChanges}`
    );
  }
  if (currentSummary.counts.files !== referenceSummary.counts.files) {
    deltas.push(`Visible file count since ${referenceLabel.toLowerCase()}: ${referenceSummary.counts.files} -> ${currentSummary.counts.files}`);
  }
  if (currentSummary.changeCounts.renamed !== referenceSummary.changeCounts.renamed) {
    deltas.push(
      `Renamed files since ${referenceLabel.toLowerCase()}: ${referenceSummary.changeCounts.renamed} -> ${currentSummary.changeCounts.renamed}`
    );
  }

  return deltas;
};

const CHANGELOG_HINT_PATTERNS = [
  "changelog",
  "change-log",
  "changes.md",
  "release-notes",
  "release_notes",
  "release notes",
  "news.md"
];

const findChangelogPaths = (repo: RepoBaseline, limit: number): string[] =>
  uniqueStrings(
    repo.workingTree.entries
      .map((entry) => entry.path)
      .filter((filePath) => CHANGELOG_HINT_PATTERNS.some((pattern) => normalizeQuery(filePath).includes(pattern)))
  ).slice(0, limit);

const summarizeChangelogHighlights = (
  repoRoot: string,
  mode: AwarenessSummaryMode
): {
  path: string;
  highlights: string[];
} | null => {
  const candidatePaths = [
    path.join(repoRoot, "CHANGELOG.md"),
    path.join(repoRoot, "Changelog.md"),
    path.join(repoRoot, "docs", "CHANGELOG.md"),
    path.join(repoRoot, "docs", "Changelog.md")
  ];
  const highlightLimit = mode === "short" ? 3 : mode === "medium" ? 5 : 7;

  for (const changelogPath of candidatePaths) {
    let content = "";
    try {
      content = readFileSync(changelogPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    const recentBuckets = new Map<string, string[]>();
    let inRecentRelease = false;
    let currentSection = "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      if (/^##\s+\d{4}-\d{2}-\d{2}/.test(line)) {
        inRecentRelease = true;
        currentSection = "";
        continue;
      }

      if (inRecentRelease && /^##\s+/.test(line)) {
        break;
      }

      if (!inRecentRelease) {
        continue;
      }

      const sectionMatch = line.match(/^###\s+(.*)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1]?.trim() ?? "";
        if (currentSection && !recentBuckets.has(currentSection)) {
          recentBuckets.set(currentSection, []);
        }
        continue;
      }

      if (!currentSection || !line.startsWith("- ")) {
        continue;
      }

      const bucket = recentBuckets.get(currentSection);
      if (!bucket || bucket.length >= 2) {
        continue;
      }

      bucket.push(line.slice(2).trim());
    }

    const orderedSections = ["Added", "Improved", "Tests", "Changed", "Fixed"];
    const highlights = orderedSections
      .flatMap((section) =>
        (recentBuckets.get(section) ?? []).slice(0, 2).map((bullet) => `${section}: ${bullet}`)
      )
      .slice(0, highlightLimit);

    if (highlights.length > 0) {
      return {
        path: changelogPath,
        highlights
      };
    }

    const phaseHistoryBuckets = new Map<string, string[]>();
    let inPhaseHistory = false;
    currentSection = "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      if (/^##\s+Phase History/i.test(line)) {
        inPhaseHistory = true;
        currentSection = "";
        continue;
      }

      if (inPhaseHistory && /^##\s+/.test(line)) {
        break;
      }

      if (!inPhaseHistory) {
        continue;
      }

      const phaseMatch = line.match(/^###\s+(Phase\s+\d+.*)$/i);
      if (phaseMatch) {
        currentSection = phaseMatch[1]?.trim() ?? "";
        if (currentSection && !phaseHistoryBuckets.has(currentSection)) {
          phaseHistoryBuckets.set(currentSection, []);
        }
        continue;
      }

      if (!currentSection || !line.startsWith("- ")) {
        continue;
      }

      const bucket = phaseHistoryBuckets.get(currentSection);
      if (!bucket || bucket.length >= 1) {
        continue;
      }

      bucket.push(line.slice(2).trim());
    }

    const phaseHighlights = [...phaseHistoryBuckets.entries()]
      .flatMap(([section, bullets]) => bullets.map((bullet) => `${section}: ${bullet}`))
      .slice(0, highlightLimit);

    if (phaseHighlights.length > 0) {
      return {
        path: changelogPath,
        highlights: phaseHighlights
      };
    }
  }

  return null;
};

const buildCommitDeltaLines = (
  currentRepo: RepoBaseline,
  referenceRepo: RepoBaseline | null | undefined,
  referenceLabel: string,
  mode: AwarenessSummaryMode
): string[] => {
  const limit = MODE_LIMITS[mode] + 2;
  const currentCommits = currentRepo.recentCommits.slice(0, limit);
  if (currentCommits.length === 0) {
    return ["No recent commit metadata is available in the current snapshot."];
  }

  if (!referenceRepo) {
    return [
      `Recent commits: ${currentCommits.map((commit) => `${commit.shortSha} ${commit.subject}`).join(" | ")}`
    ];
  }

  const previousShas = new Set(referenceRepo.recentCommits.map((commit) => commit.sha));
  const newCommits = currentCommits.filter((commit) => !previousShas.has(commit.sha));
  if (newCommits.length === 0) {
    return [`No new commits were detected since ${referenceLabel.toLowerCase()}.`];
  }

  return [
    `${newCommits.length} commit(s) since ${referenceLabel.toLowerCase()}: ${newCommits
      .map((commit) => `${commit.shortSha} ${commit.subject}`)
      .join(" | ")}`
  ];
};

const buildRepoChangeAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const mode = chooseMode(query, input.mode);
  const scope = input.scope ?? chooseScopeForQuery(query);
  const current = input.current;
  const startup = input.startup;
  const previous = input.previous;
  const lastReportSnapshot = input.lastReport;
  const normalized = normalizeQuery(query);

  const repoFresh = current.repo;
  const currentFile = current.fileAwarenessSnapshot;
  const startupFile = startup?.fileAwarenessSummary;
  const previousFile = previous?.fileAwarenessSummary;
  const lastReportFile = lastReportSnapshot?.fileAwarenessSummary;
  const currentScreen = current.screenAwareness;
  const startupScreen = startup?.screenAwareness;
  const previousScreen = previous?.screenAwareness;
  const lastReportScreen = lastReportSnapshot?.screenAwareness;
  const currentDigest = current.digest;
  const lastReport = current.lastReportedBaseline;
  const featureSummaryQuery = isFeatureSummaryQuery(query);
  const changelogSummary = featureSummaryQuery ? summarizeChangelogHighlights(repoFresh.repoRoot, mode) : null;

  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
    makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
  ];

  if (featureSummaryQuery && changelogSummary) {
    verifiedFindings.push(`Changelog highlights: ${changelogSummary.highlights.join(" | ")}`);
    evidenceRefs.push(makeEvidenceRef(changelogSummary.path, "file", "changelog", changelogSummary.path));
    likelyInterpretation.push("The changelog is the clearest human-readable summary of what is new.");
  }

  if (scope === "session") {
    verifiedFindings.push(`Current session started at ${current.session.appStartedAt}`);
    verifiedFindings.push(`Repo: ${repoFresh.branch ?? "no-git"}${repoFresh.headSha ? ` @ ${repoFresh.headSha.slice(0, 8)}` : ""} (${repoFresh.dirtyState})`);
    verifiedFindings.push(`Working tree: ${buildWorkingTreeSummary(repoFresh, mode)}`);
    if (currentFile) {
      verifiedFindings.push(`Files: ${currentFile.summary.counts.recentChanges} recent changes, ${currentFile.summary.counts.files} files, ${currentFile.summary.counts.folders} folders`);
      if (currentFile.summary.recentChanges.length > 0) {
        verifiedFindings.push(`Recent file changes: ${currentFile.summary.recentChanges.slice(0, MODE_LIMITS[mode] + 1).map((change) => `${change.type} ${compactPath(change.path)}`).join(" | ")}`);
      }
      evidenceRefs.push(
        makeEvidenceRef(
          input.paths.fileLatestSummaryPath ?? input.paths.fileCurrentCatalogPath ?? input.paths.currentSessionPath,
          "file",
          "file-summary",
          input.paths.fileLatestSummaryPath
        )
      );
    }
    if (currentScreen?.assistMode.enabled) {
      verifiedFindings.push(`Assist Mode is on for ${currentScreen.assistMode.scope ?? "an unscoped session"}`);
    }
    if (startup) {
      appendRepoComparison({
        currentRepo: repoFresh,
        referenceRepo: startup.repo,
        referenceLabel: "startup",
        mode,
        verifiedFindings,
        likelyInterpretation,
        uncertainty
      });
      verifiedFindings.push(...buildFileSummaryDelta(currentFile?.summary, startupFile, "startup"));
      if (startupScreen && currentScreen && startupScreen.fingerprint !== currentScreen.fingerprint) {
        verifiedFindings.push("Screen snapshot changed since startup.");
      }
      if (featureSummaryQuery) {
        verifiedFindings.push(...buildCommitDeltaLines(repoFresh, startup.repo, "startup", mode));
      }
    }
    if (featureSummaryQuery) {
      const changelogPaths = findChangelogPaths(repoFresh, MODE_LIMITS[mode] + 1);
      if (changelogPaths.length > 0) {
        verifiedFindings.push(`Changelog paths touched: ${changelogPaths.map(compactPath).join(" | ")}`);
      }
    }
    likelyInterpretation.push("This session changed as local repo and file state evolved after startup.");
    suggestedNextChecks.push("Review the current session snapshot or compare the current file-change list.");
  }

  if (scope === "previous-session") {
    verifiedFindings.push(`Previous session id: ${previous?.session.sessionId ?? "unavailable"}`);
    if (previous) {
      verifiedFindings.push(`Previous repo: ${previous.repo.branch ?? "no-git"}${previous.repo.headSha ? ` @ ${previous.repo.headSha.slice(0, 8)}` : ""} (${previous.repo.dirtyState})`);
      verifiedFindings.push(`Previous working tree: ${buildWorkingTreeSummary(previous.repo, mode)}`);
      if (previous.fileAwarenessSummary) {
        verifiedFindings.push(`Previous file summary: ${previous.fileAwarenessSummary.summary}`);
      }
      if (previous.screenAwareness) {
        verifiedFindings.push(`Previous screen summary: ${previous.screenAwareness.summary.summary}`);
      }
      if (featureSummaryQuery) {
        verifiedFindings.push(...buildCommitDeltaLines(repoFresh, previous.repo, "previous session", mode));
      }
      appendRepoComparison({
        currentRepo: repoFresh,
        referenceRepo: previous.repo,
        referenceLabel: "previous session",
        mode,
        verifiedFindings,
        likelyInterpretation,
        uncertainty
      });
      verifiedFindings.push(...buildFileSummaryDelta(currentFile?.summary, previousFile, "previous session"));
      if (previousScreen && currentScreen && previousScreen.fingerprint !== currentScreen.fingerprint) {
        verifiedFindings.push("Screen snapshot changed since the previous session.");
      }
    } else {
      uncertainty.push("No previous session snapshot was available.");
      if (featureSummaryQuery) {
        verifiedFindings.push(...buildCommitDeltaLines(repoFresh, null, "previous session", mode));
      }
    }
    if (featureSummaryQuery) {
      const changelogPaths = findChangelogPaths(repoFresh, MODE_LIMITS[mode] + 1);
      if (changelogPaths.length > 0) {
        verifiedFindings.push(`Changelog paths touched: ${changelogPaths.map(compactPath).join(" | ")}`);
      }
      likelyInterpretation.push("These commit and changelog entries describe what changed since the last run.");
    }
    likelyInterpretation.push("The previous session is the best baseline for cross-session change comparison.");
    suggestedNextChecks.push("Compare the current session against the previous session snapshot if you need exact deltas.");
  }

  if (scope === "last-report") {
    verifiedFindings.push(`Last report digest: ${lastReport?.digestId ?? "unavailable"}`);
    if (lastReport) {
      verifiedFindings.push(`Reported repo fingerprint: ${lastReport.repoFingerprint.slice(0, 12)}`);
      verifiedFindings.push(`Reported machine fingerprint: ${lastReport.machineFingerprint.slice(0, 12)}`);
      if (lastReportSnapshot) {
        verifiedFindings.push(
          `Last reported repo: ${lastReportSnapshot.repo.branch ?? "no-git"}${lastReportSnapshot.repo.headSha ? ` @ ${lastReportSnapshot.repo.headSha.slice(0, 8)}` : ""} (${lastReportSnapshot.repo.dirtyState})`
        );
        verifiedFindings.push(`Last reported working tree: ${buildWorkingTreeSummary(lastReportSnapshot.repo, mode)}`);
        appendRepoComparison({
          currentRepo: repoFresh,
          referenceRepo: lastReportSnapshot.repo,
          referenceLabel: "last report",
          mode,
          verifiedFindings,
          likelyInterpretation,
          uncertainty
        });
        verifiedFindings.push(...buildFileSummaryDelta(currentFile?.summary, lastReportFile, "last report"));
        if (lastReportScreen && currentScreen && lastReportScreen.fingerprint !== currentScreen.fingerprint) {
          verifiedFindings.push("Screen snapshot changed since the last report.");
        }
        if (featureSummaryQuery) {
          verifiedFindings.push(...buildCommitDeltaLines(repoFresh, lastReportSnapshot.repo, "last report", mode));
        }
      }
    } else {
      uncertainty.push("No last-reported baseline exists yet.");
      if (featureSummaryQuery) {
        verifiedFindings.push(...buildCommitDeltaLines(repoFresh, null, "last report", mode));
      }
    }
    if (lastReportSnapshot ? lastReportSnapshot.digest.baselineFingerprint === currentDigest.baselineFingerprint : lastReport?.baselineFingerprint === currentDigest.baselineFingerprint) {
      likelyInterpretation.push("Nothing material changed in the repo/machine/session baseline since the last report.");
    } else {
      likelyInterpretation.push("The repo or machine baseline has changed since the last report.");
    }
    suggestedNextChecks.push("Refresh the awareness digest if you want the latest baseline to become the new report reference.");
  }

  if (scope === "current-machine") {
    verifiedFindings.push(`Machine: ${current.machineAwareness.systemIdentity.machineName} | ${current.machineAwareness.systemIdentity.windowsEdition ?? current.machineAwareness.systemIdentity.windowsVersion ?? "Windows"} | ${current.machineAwareness.systemIdentity.architecture}`);
    verifiedFindings.push(
      `${current.machineAwareness.summary.counts.processes} processes, ${current.machineAwareness.summary.counts.services} services, ${current.machineAwareness.summary.counts.startupEntries} startup items, ${current.machineAwareness.summary.counts.eventLogErrors} event-log errors`
    );
    if (current.machineAwareness.summary.highlights.processes.length > 0) {
      verifiedFindings.push(`Top processes: ${current.machineAwareness.summary.highlights.processes.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}`);
    }
    if (current.machineAwareness.summary.highlights.eventLogs.length > 0) {
      verifiedFindings.push(`Event-log highlights: ${current.machineAwareness.summary.highlights.eventLogs.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}`);
    }
    if (current.machineAwareness.summary.highlights.settings.length > 0) {
      verifiedFindings.push(`Settings hits: ${current.machineAwareness.summary.highlights.settings.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}`);
    }
    likelyInterpretation.push("This machine inventory is compact but sufficient for process, service, startup, and settings lookups.");
    suggestedNextChecks.push("Ask about a process, service, startup item, setting, or registry zone for a focused lookup.");
  }

  if (normalized.includes("changed") || normalized.includes("change")) {
    if (startup && startup.repo.fingerprint !== repoFresh.fingerprint && scope !== "session") {
      appendRepoComparison({
        currentRepo: repoFresh,
        referenceRepo: startup.repo,
        referenceLabel: "startup",
        mode,
        verifiedFindings,
        likelyInterpretation,
        uncertainty
      });
    }
    if (previous && previous.repo.fingerprint !== repoFresh.fingerprint && scope !== "previous-session") {
      appendRepoComparison({
        currentRepo: repoFresh,
        referenceRepo: previous.repo,
        referenceLabel: "previous session",
        mode,
        verifiedFindings,
        likelyInterpretation,
        uncertainty
      });
    }
    if (lastReportSnapshot && lastReportSnapshot.repo.fingerprint !== repoFresh.fingerprint && scope !== "last-report") {
      appendRepoComparison({
        currentRepo: repoFresh,
        referenceRepo: lastReportSnapshot.repo,
        referenceLabel: "last report",
        mode,
        verifiedFindings,
        likelyInterpretation,
        uncertainty
      });
    }
    if (startupFile && currentFile && scope !== "session") {
      verifiedFindings.push(...buildFileSummaryDelta(currentFile.summary, startupFile, "startup"));
    }
    if (previousFile && currentFile && scope !== "previous-session") {
      verifiedFindings.push(...buildFileSummaryDelta(currentFile.summary, previousFile, "previous session"));
    }
    if (lastReportFile && currentFile && scope !== "last-report") {
      verifiedFindings.push(...buildFileSummaryDelta(currentFile.summary, lastReportFile, "last report"));
    }
    if (startupScreen && currentScreen && startupScreen.fingerprint !== currentScreen.fingerprint && scope !== "session") {
      verifiedFindings.push("Screen snapshot changed since startup.");
    }
    if (previousScreen && currentScreen && previousScreen.fingerprint !== currentScreen.fingerprint && scope !== "previous-session") {
      verifiedFindings.push("Screen snapshot changed since the previous session.");
    }
    if (lastReportScreen && currentScreen && lastReportScreen.fingerprint !== currentScreen.fingerprint && scope !== "last-report") {
      verifiedFindings.push("Screen snapshot changed since the last report.");
    }
  }

  if (scope === "session" || scope === "previous-session" || scope === "last-report") {
    if (repoFresh.headSha) {
      evidenceRefs.push(makeEvidenceRef(repoFresh.headSha, "git", "repo-head", current.repo.repoRoot));
    }
    if (currentFile) {
      evidenceRefs.push(
        makeEvidenceRef(
          input.paths.fileCurrentCatalogPath ?? input.paths.currentSessionPath,
          "file",
          "file-catalog",
          input.paths.fileCurrentCatalogPath
        )
      );
    }
    if (currentScreen) {
      evidenceRefs.push(
        makeEvidenceRef(
          input.paths.screenCurrentPath ?? input.paths.currentSessionPath,
          "screen",
          "screen-snapshot",
          input.paths.screenCurrentPath
        )
      );
    }
    if (scope === "last-report" && input.paths.lastReportedSnapshotPath) {
      evidenceRefs.push(
        makeEvidenceRef(
          input.paths.lastReportedSnapshotPath,
          "session",
          "last-reported-snapshot",
          input.paths.lastReportedSnapshotPath
        )
      );
    }
  }

  if (verifiedFindings.length === 0) {
    uncertainty.push("No explicit change evidence was found for the requested scope.");
  }
  if (input.scanTimedOut) {
    uncertainty.push("Narrow scan budget was reached before all planned checks completed.");
  }

  const bundle = buildEvidenceBundle({
    freshness:
      scope === "current-machine"
        ? current.machineAwareness.freshness
        : scope === "session"
          ? current.digest.freshness
          : scope === "previous-session" && previous
            ? previous.digest.freshness
            : current.digest.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    safeNextAction:
      scope === "current-machine"
        ? "Inspect the current machine summary or refresh the inventory."
        : scope === "session"
          ? "Review the current session snapshot."
          : scope === "previous-session"
            ? "Compare against the previous session snapshot."
            : "Refresh the awareness digest if you want a new baseline.",
    confidence: clamp(0.58 + Math.min(0.25, verifiedFindings.length * 0.03)),
    evidenceRefs,
    affectedAreas:
      scope === "current-machine"
        ? ["machine"]
        : scope === "session"
          ? ["repo", "session", "files", "screen"]
          : ["repo", "session"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

const buildOnScreenAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-ui";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
  const screen = current.screenAwareness;
  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(input.paths.screenCurrentPath ?? input.paths.currentSessionPath, "screen", "screen-snapshot", input.paths.screenCurrentPath),
    makeEvidenceRef(input.paths.screenEventsPath ?? input.paths.eventsPath, "event", "screen-events", input.paths.screenEventsPath)
  ];

  if (screen?.assistMode.enabled) {
    if (screen.foregroundWindow) {
      verifiedFindings.push(`Active window: ${formatWindowSummary(screen.foregroundWindow)}`);
    } else {
      verifiedFindings.push("Assist Mode is on but the foreground window is not available.");
    }
    if (screen.uiTree?.root) {
      verifiedFindings.push(`Visible controls: ${collectUiHighlights(screen.uiTree.root, { limit: 6 }).join(" | ") || "none"}`);
      if (screen.uiTree.focusedElement) {
        verifiedFindings.push(`Focused element: ${describeUiElement(screen.uiTree.focusedElement)}`);
      }
      if (screen.uiTree.elementUnderCursor) {
        verifiedFindings.push(`Hovered element: ${describeUiElement(screen.uiTree.elementUnderCursor)}`);
      }
      if (screen.summary.highlights.blockedInputs.length > 0) {
        verifiedFindings.push(`Blocked inputs: ${screen.summary.highlights.blockedInputs.join(" | ")}`);
      }
    }
    likelyInterpretation.push(
      screen.uiTree?.focusedElement
        ? "The focused control is probably the best next target."
        : "The top visible controls are probably the next interactive targets."
    );
  } else {
    verifiedFindings.push("Assist Mode is off, so live on-screen capture is not active.");
    uncertainty.push("There is no approved live UI session to inspect right now.");
    suggestedNextChecks.push("Start Assist Mode for the current window or display.");
  }

  if (screen?.recentEvents.length) {
    verifiedFindings.push(`Recent screen events: ${summarizeRecentEvents(screen.recentEvents, 4).join(" | ")}`);
  }

  if (screen?.summary.recentEvents.some((event) => event.type === "protected_input_blocked")) {
    uncertainty.push("Protected input fields were blocked from capture.");
  }

  const confidence = clamp(screen?.assistMode.enabled ? 0.8 : 0.35);
  const bundle = buildEvidenceBundle({
    freshness: restampFreshness(screen?.freshness ?? current.machineAwareness.freshness, input.now),
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks,
    safeNextAction: screen?.assistMode.enabled
      ? "Use the visible controls or keep Assist Mode on for another refresh."
      : "Start Assist Mode if you want safe on-screen guidance.",
    confidence,
    evidenceRefs,
    affectedAreas: ["screen", "assist", "ui", "interaction"],
    mode,
    strictGrounding: input.strictGrounding
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    answerMode: input.answerMode,
    strictGrounding: input.strictGrounding,
    scanTimedOut: input.scanTimedOut,
    scanTargets: input.scanTargets,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

export const buildAwarenessQueryAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer | null => {
  const query = input.query.trim();
  if (!query) {
    return null;
  }

  const intentPlan = input.intentPlan ?? planAwarenessIntents(query, input.conversationContext);
  const route = input.route ?? intentPlan.primary;
  const clarification = buildStorageClarification(query, input.conversationContext);
  if (clarification) {
    return buildClarificationAnswer({ ...input, intentPlan, route }, route, clarification);
  }
  if (!input.force && route.confidence < QUERY_CONFIDENCE_THRESHOLD && route.signals.length === 0) {
    return null;
  }

  const answer = (() => {
    switch (route.family) {
      case "file-folder-media":
        return buildFileFolderMediaAnswer({ ...input, route });
      case "process-service-startup":
        return buildProcessServiceStartupAnswer({ ...input, route });
      case "settings-control-panel":
        return buildSettingsControlRegistryAnswer({ ...input, route });
      case "registry":
        return buildSettingsControlRegistryAnswer({ ...input, route });
      case "live-usage":
        return buildLiveUsageAnswer({ ...input, route });
      case "hardware":
        return buildHardwareAnswer({ ...input, route });
      case "resource-hotspot":
        return buildResourceHotspotAnswer({ ...input, route });
      case "performance-diagnostic":
        return buildPerformanceAnswer({ ...input, route });
      case "on-screen":
        return buildOnScreenAnswer({ ...input, route });
      case "repo-change":
      default:
        return buildRepoChangeAnswer({ ...input, route });
    }
  })();

  if (!answer) {
    return null;
  }

  const secondaryNotes = buildIntentSecondaryNotes(intentPlan, input.current);
  const recurringPatterns = input.current.machineAwareness.recurringPatterns?.slice(0, 3) ?? [];
  const correlationHighlights = buildCorrelationHighlights(input.current.machineAwareness);
  answer.intentPlan = intentPlan;
  answer.bundle.recurringPatterns = recurringPatterns;
  answer.bundle.screenDiff = input.current.screenAwareness?.diff ?? null;
  answer.bundle.correlationHighlights = correlationHighlights;
  if (secondaryNotes.length > 0) {
    answer.bundle.likelyInterpretation = limitStrings(
      [...answer.bundle.likelyInterpretation, ...secondaryNotes],
      MODE_LIMITS[answer.mode] + 3
    );
  }
  answer.bundle.compactSummary = buildCompactSummary(
    answer.bundle.verifiedFindings,
    answer.bundle.likelyInterpretation,
    answer.bundle.uncertainty,
    answer.bundle.suggestedNextChecks,
    answer.bundle.safeNextAction,
    answer.mode
  );
  answer.summary = `${answer.intent.label}: ${answer.bundle.compactSummary}`;

  if (input.scanTimedOut) {
    const timeoutNote = "Narrow scan budget was reached; results may be partially refreshed.";
    if (!answer.bundle.uncertainty.includes(timeoutNote)) {
      answer.bundle.uncertainty = limitStrings(
        [...answer.bundle.uncertainty, timeoutNote],
        MODE_LIMITS[answer.mode] + 2
      );
      answer.bundle.compactSummary = buildCompactSummary(
        answer.bundle.verifiedFindings,
        answer.bundle.likelyInterpretation,
        answer.bundle.uncertainty,
        answer.bundle.suggestedNextChecks,
        answer.bundle.safeNextAction,
        answer.mode
      );
      answer.summary = `${answer.intent.label}: ${answer.bundle.compactSummary}`;
    }
  }

  answer.card = buildAwarenessAnswerCard(answer);
  const finalAnswer = applyOfficialKnowledge(answer, input, route);
  finalAnswer.card = buildAwarenessAnswerCard(finalAnswer);

  return finalAnswer;
};

const buildCurrentViewForSummary = (current: AwarenessView): {
  machineSummary: string;
  fileSummary: string | null;
  screenSummary: string | null;
} => ({
  machineSummary: current.machineAwareness.summary.summary,
  fileSummary: current.fileAwarenessSummary?.summary ?? null,
  screenSummary: current.screenAwareness?.summary.summary ?? null
});

const buildSessionSummary = (input: AwarenessSummaryBuildInput): AwarenessScopeSummary => {
  const mode = input.mode ?? "medium";
  const current = input.current;
  const currentView = buildCurrentViewForSummary(current);
  const verifiedFindings = [
    `Session id: ${current.session.sessionId}`,
    `Started at: ${current.session.appStartedAt}`,
    `Repo: ${current.repo.branch ?? "no-git"}${current.repo.headSha ? ` @ ${current.repo.headSha.slice(0, 8)}` : ""} (${current.repo.dirtyState})`,
    `Working tree: ${buildWorkingTreeSummary(current.repo, mode)}`,
    `Machine: ${current.machine.machineName} | ${current.machine.arch}`,
    currentView.fileSummary ? `Files: ${currentView.fileSummary}` : null,
    currentView.screenSummary ? `Screen: ${currentView.screenSummary}` : null
  ].filter((value): value is string => Boolean(value));

  const bundle = buildEvidenceBundle({
    freshness: current.digest.freshness,
    verifiedFindings,
    likelyInterpretation: ["This is the current session baseline for the awareness engine."],
    uncertainty: current.fileAwarenessSummary?.blockedScopes.length
      ? [`Blocked scopes: ${current.fileAwarenessSummary.blockedScopes.join(", ")}`]
      : [],
    suggestedNextChecks: ["Compare against the previous session or the last report for deltas."],
    safeNextAction: "Review the current session snapshot.",
    confidence: 0.8,
    evidenceRefs: [
      makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
      makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
    ],
    affectedAreas: ["session", "repo", "machine", "files", "screen"],
    mode
  });

  return {
    scope: input.scope,
    mode,
    generatedAt: new Date().toISOString(),
    freshness: bundle.freshness,
    summary: bundle.compactSummary,
    verifiedFindings: bundle.verifiedFindings,
    likelyInterpretation: bundle.likelyInterpretation,
    uncertainty: bundle.uncertainty,
    suggestedNextChecks: bundle.suggestedNextChecks,
    safeNextAction: bundle.safeNextAction,
    confidence: bundle.confidence,
    confidenceLevel: bundle.confidenceLevel,
    evidenceRefs: bundle.evidenceRefs,
    affectedAreas: bundle.affectedAreas
  };
};

const buildPreviousSessionSummary = (input: AwarenessSummaryBuildInput): AwarenessScopeSummary => {
  const mode = input.mode ?? "medium";
  const previous = input.previous;
  const verifiedFindings = previous
    ? [
        `Previous session id: ${previous.session.sessionId}`,
        `Started at: ${previous.session.appStartedAt}`,
        `Repo: ${previous.repo.branch ?? "no-git"}${previous.repo.headSha ? ` @ ${previous.repo.headSha.slice(0, 8)}` : ""} (${previous.repo.dirtyState})`,
        `Machine: ${previous.machine.machineName} | ${previous.machine.arch}`,
        previous.fileAwarenessSummary ? `Files: ${previous.fileAwarenessSummary.summary}` : null,
        previous.screenAwareness ? `Screen: ${previous.screenAwareness.summary.summary}` : null
      ].filter((value): value is string => Boolean(value))
    : ["No previous session snapshot was available."];

  const bundle = buildEvidenceBundle({
    freshness: previous?.digest.freshness ?? input.current.digest.freshness,
    verifiedFindings,
    likelyInterpretation: previous
      ? ["The previous session is a good baseline for cross-session comparisons."]
      : ["The previous session snapshot could not be loaded."],
    uncertainty: previous ? [] : ["There is no previous session artifact to compare against."],
    suggestedNextChecks: ["Compare the current session to the previous session snapshot."],
    safeNextAction: "Review the previous session artifact.",
    confidence: previous ? 0.75 : 0.2,
    evidenceRefs: previous
      ? [makeEvidenceRef(input.paths.previousSessionPath, "session", "previous-session", input.paths.previousSessionPath)]
      : [],
    affectedAreas: ["session", "repo", "machine"],
    mode
  });

  return {
    scope: input.scope,
    mode,
    generatedAt: new Date().toISOString(),
    freshness: bundle.freshness,
    summary: bundle.compactSummary,
    verifiedFindings: bundle.verifiedFindings,
    likelyInterpretation: bundle.likelyInterpretation,
    uncertainty: bundle.uncertainty,
    suggestedNextChecks: bundle.suggestedNextChecks,
    safeNextAction: bundle.safeNextAction,
    confidence: bundle.confidence,
    confidenceLevel: bundle.confidenceLevel,
    evidenceRefs: bundle.evidenceRefs,
    affectedAreas: bundle.affectedAreas
  };
};

const buildLastReportSummary = (input: AwarenessSummaryBuildInput): AwarenessScopeSummary => {
  const mode = input.mode ?? "medium";
  const lastReported = input.current.lastReportedBaseline;
  const lastReportSnapshot = input.lastReport;
  const verifiedFindings = lastReported
    ? [
        `Last report id: ${lastReported.digestId}`,
        `Reported at: ${lastReported.reportedAt}`,
        `Repo fingerprint: ${lastReported.repoFingerprint.slice(0, 12)}`,
        `Machine fingerprint: ${lastReported.machineFingerprint.slice(0, 12)}`,
        lastReportSnapshot
          ? `Last reported repo: ${lastReportSnapshot.repo.branch ?? "no-git"}${lastReportSnapshot.repo.headSha ? ` @ ${lastReportSnapshot.repo.headSha.slice(0, 8)}` : ""} (${lastReportSnapshot.repo.dirtyState})`
          : null,
        lastReportSnapshot ? `Last reported working tree: ${buildWorkingTreeSummary(lastReportSnapshot.repo, mode)}` : null,
        lastReportSnapshot?.fileAwarenessSummary ? `Last reported files: ${lastReportSnapshot.fileAwarenessSummary.summary}` : null
      ].filter((value): value is string => Boolean(value))
    : ["No last-reported baseline exists yet."];

  const bundle = buildEvidenceBundle({
    freshness: input.current.digest.freshness,
    verifiedFindings,
    likelyInterpretation: lastReported
      ? [
          lastReportSnapshot
            ? "The current baseline can be compared against the last delivered snapshot."
            : "The current baseline can be compared against the last reported digest."
        ]
      : ["A fresh report has not been recorded yet."],
    uncertainty: lastReported ? [] : ["There is no previous report artifact to compare against."],
    suggestedNextChecks: ["Refresh the digest to create a new last-reported baseline."],
    safeNextAction: "Review the last-reported baseline artifact.",
    confidence: lastReported ? 0.7 : 0.2,
    evidenceRefs: lastReported
      ? [
          makeEvidenceRef(input.paths.lastReportedBaselinePath, "session", "last-reported-baseline", input.paths.lastReportedBaselinePath),
          ...(input.paths.lastReportedSnapshotPath
            ? [makeEvidenceRef(input.paths.lastReportedSnapshotPath, "session", "last-reported-snapshot", input.paths.lastReportedSnapshotPath)]
            : [])
        ]
      : [],
    affectedAreas: ["session", "repo", "machine"],
    mode
  });

  return {
    scope: input.scope,
    mode,
    generatedAt: new Date().toISOString(),
    freshness: bundle.freshness,
    summary: bundle.compactSummary,
    verifiedFindings: bundle.verifiedFindings,
    likelyInterpretation: bundle.likelyInterpretation,
    uncertainty: bundle.uncertainty,
    suggestedNextChecks: bundle.suggestedNextChecks,
    safeNextAction: bundle.safeNextAction,
    confidence: bundle.confidence,
    confidenceLevel: bundle.confidenceLevel,
    evidenceRefs: bundle.evidenceRefs,
    affectedAreas: bundle.affectedAreas
  };
};

const buildCurrentMachineSummary = (input: AwarenessSummaryBuildInput): AwarenessScopeSummary => {
  const mode = input.mode ?? "medium";
  const current = input.current;
  const machine = current.machineAwareness;
  const verifiedFindings = [
    `Machine: ${machine.systemIdentity.machineName} | ${machine.systemIdentity.windowsEdition ?? machine.systemIdentity.windowsVersion ?? "Windows"} | ${machine.systemIdentity.architecture}`,
    `Uptime: ${Math.round(machine.systemIdentity.uptimeSeconds / 60)} minutes`,
    `Processes: ${machine.summary.counts.processes}, services: ${machine.summary.counts.services}, startup items: ${machine.summary.counts.startupEntries}, event-log errors: ${machine.summary.counts.eventLogErrors}`,
    machine.summary.highlights.processes.length > 0 ? `Top processes: ${machine.summary.highlights.processes.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null,
    machine.summary.highlights.eventLogs.length > 0 ? `Event-log highlights: ${machine.summary.highlights.eventLogs.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null,
    machine.summary.highlights.settings.length > 0 ? `Settings hits: ${machine.summary.highlights.settings.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null,
    machine.summary.highlights.registryZones.length > 0 ? `Registry zones: ${machine.summary.highlights.registryZones.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null
  ].filter((value): value is string => Boolean(value));

  const bundle = buildEvidenceBundle({
    freshness: machine.freshness,
    verifiedFindings,
    likelyInterpretation: ["This is the current machine snapshot for live machine awareness."],
    uncertainty: machine.processSnapshot.isTruncated ? ["The process list is truncated."] : [],
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: 0.8,
    evidenceRefs: [makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath)],
    affectedAreas: ["machine"],
    mode
  });

  return {
    scope: input.scope,
    mode,
    generatedAt: new Date().toISOString(),
    freshness: bundle.freshness,
    summary: bundle.compactSummary,
    verifiedFindings: bundle.verifiedFindings,
    likelyInterpretation: bundle.likelyInterpretation,
    uncertainty: bundle.uncertainty,
    suggestedNextChecks: bundle.suggestedNextChecks,
    safeNextAction: bundle.safeNextAction,
    confidence: bundle.confidence,
    confidenceLevel: bundle.confidenceLevel,
    evidenceRefs: bundle.evidenceRefs,
    affectedAreas: bundle.affectedAreas
  };
};

export const buildAwarenessScopeSummary = (input: AwarenessSummaryBuildInput): AwarenessScopeSummary => {
  switch (input.scope) {
    case "session":
      return buildSessionSummary(input);
    case "previous-session":
      return buildPreviousSessionSummary(input);
    case "last-report":
      return buildLastReportSummary(input);
    case "current-machine":
    default:
      return buildCurrentMachineSummary(input);
  }
};

export const buildAwarenessPerformanceDiagnostic = (
  input: AwarenessPerformanceDiagnosticInput
): AwarenessPerformanceDiagnostic => buildPerformanceDiagnostics(input);

export const buildAwarenessStartupDiagnostic = (
  input: AwarenessStartupDiagnosticInput
): AwarenessStartupDiagnostic => buildStartupDiagnostics(input);

export const buildAwarenessStorageDiagnostic = (
  input: AwarenessStorageDiagnosticInput
): AwarenessStorageDiagnostic => buildStorageDiagnostics(input);

export const buildAwarenessCurrentUiDiagnostic = (
  input: AwarenessCurrentUiDiagnosticInput
): AwarenessCurrentUiDiagnostic => buildCurrentUiDiagnostics(input);

export const buildAwarenessEventLogDiagnostic = (
  input: AwarenessEventLogDiagnosticInput
): AwarenessEventLogDiagnostic => buildEventLogDiagnostics(input);

export const buildAwarenessAnomalyDiagnostic = (
  input: AwarenessAnomalyDiagnosticInput
): AwarenessAnomalyDiagnostic => buildAnomalyDiagnostics(input);

export const buildAwarenessQueryContextSection = (
  answer: AwarenessQueryAnswer | null | undefined,
  latestUserMessage: string,
  awarenessMode: AwarenessMode = "observe"
): string | null => {
  if (!answer) {
    return null;
  }

  const evidenceFirst = answer.answerMode === "evidence-first";
  if (!evidenceFirst && !answer.includeInContext && awarenessMode !== "debug") {
    return null;
  }

  const relevanceHint = normalizeQuery(latestUserMessage);
  if (!evidenceFirst && !answer.includeInContext && !relevanceHint.includes("awareness")) {
    return null;
  }

  const compactLimit = evidenceFirst ? 4 : 2;
  const includeOperatorGuidance =
    answer.bundle.verifiedFindings.length === 0 || answer.bundle.groundingStatus === "weak";

  const lines = [
    `Awareness query: ${answer.intent.label}`,
    `Scope: ${answer.scope} | Mode: ${answer.mode} | Answer mode: ${answer.answerMode ?? "llm-primary"} | Confidence: ${answer.bundle.confidenceLevel}`,
    `Grounding: ${answer.bundle.groundingStatus} | Evidence traces: ${answer.bundle.evidenceTraceIds.length}`,
    answer.intentPlan?.secondary.length
      ? `Also routed: ${answer.intentPlan.secondary.map((route) => route.label).join(" | ")}`
      : null,
    `Q: ${answer.query}`,
    answer.bundle.verifiedFindings.length > 0 ? `Verified: ${answer.bundle.verifiedFindings.slice(0, compactLimit).join(" | ")}` : null,
    answer.bundle.resourceHotspots && answer.bundle.resourceHotspots.length > 0
      ? `Hotspots: ${answer.bundle.resourceHotspots
          .slice(0, compactLimit)
          .map((entry) => `${resourceHotspotDisplayLabel(entry.resource)} ${entry.rank}: ${entry.label} (${entry.resourceAmount})`)
          .join(" | ")}`
      : null,
    answer.bundle.likelyInterpretation.length > 0 ? `Likely: ${answer.bundle.likelyInterpretation.slice(0, compactLimit).join(" | ")}` : null,
    answer.bundle.inferredFindings.length > 0 ? `Inferred: ${answer.bundle.inferredFindings.slice(0, compactLimit).join(" | ")}` : null,
    answer.bundle.recurringPatterns && answer.bundle.recurringPatterns.length > 0
      ? `Patterns: ${answer.bundle.recurringPatterns.slice(0, compactLimit).map((pattern) => pattern.title).join(" | ")}`
      : null,
    answer.bundle.screenDiff?.changed ? `Screen diff: ${answer.bundle.screenDiff.summary}` : null,
    answer.bundle.uncertainty.length > 0 ? `Uncertainty: ${answer.bundle.uncertainty.slice(0, compactLimit).join(" | ")}` : null,
    answer.scanTimedOut ? `Budget: scan timeout reached (${answer.scanTargets?.join(", ") || "n/a"})` : null,
    includeOperatorGuidance && answer.bundle.suggestedNextChecks.length > 0
      ? `Next: ${answer.bundle.suggestedNextChecks.slice(0, compactLimit).join(" | ")}`
      : null,
    includeOperatorGuidance && answer.bundle.safeNextAction ? `Safe next: ${answer.bundle.safeNextAction}` : null
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n").slice(0, 1200);
};

