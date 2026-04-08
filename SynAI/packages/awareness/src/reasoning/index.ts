import { randomUUID } from "node:crypto";
import * as path from "node:path";
import type {
  AwarenessArea,
  AwarenessConfidenceLevel,
  AwarenessCurrentUiDiagnostic,
  AwarenessDigest,
  AwarenessIntentFamily,
  AwarenessIntentRoute,
  AwarenessMode,
  AwarenessPerformanceDiagnostic,
  AwarenessQueryAnswer,
  AwarenessQueryScope,
  AwarenessScopeSummary,
  AwarenessStartupDiagnostic,
  AwarenessSummaryMode,
  AwarenessSummaryScope,
  EvidenceRef,
  FileAwarenessSnapshot,
  FileAwarenessSummary,
  FileChangeEntry,
  FileMediaKind,
  FreshnessMetadata,
  LastReportedBaseline,
  MachineAwarenessSnapshot,
  MachineBaseline,
  RepoBaseline,
  ScreenAwarenessSnapshot,
  ScreenUiElement,
  SessionBaseline
} from "../../../contracts/src/awareness";
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
  scope?: AwarenessQueryScope;
  mode?: AwarenessSummaryMode;
  current: AwarenessView;
  startup?: AwarenessHistoryView | null;
  previous?: AwarenessHistoryView | null;
  paths: AwarenessPathView;
  now?: Date;
}

export interface AwarenessSummaryBuildInput {
  scope: AwarenessSummaryScope;
  mode?: AwarenessSummaryMode;
  current: AwarenessView;
  startup?: AwarenessHistoryView | null;
  previous?: AwarenessHistoryView | null;
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

const MODE_LIMITS: Record<AwarenessSummaryMode, number> = {
  short: 1,
  medium: 2,
  detailed: 4
};

const QUERY_CONFIDENCE_THRESHOLD = 0.25;

const INTENT_LABELS: Record<AwarenessIntentFamily, string> = {
  "repo-change": "Repo / change awareness",
  "file-folder-media": "File / folder / media awareness",
  "process-service-startup": "Process / service / startup awareness",
  "settings-control-panel": "Settings / control panel awareness",
  registry: "Registry awareness",
  hardware: "Hardware awareness",
  "performance-diagnostic": "Performance / diagnostic awareness",
  "on-screen": "On-screen awareness"
};

const INTENT_TARGET_AREAS: Record<AwarenessIntentFamily, AwarenessArea[]> = {
  "repo-change": ["repo", "session", "files", "journal"],
  "file-folder-media": ["files", "media"],
  "process-service-startup": ["machine", "context"],
  "settings-control-panel": ["machine", "context"],
  registry: ["machine", "privacy"],
  hardware: ["machine"],
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
  hardware: [
    "hardware",
    "cpu",
    "gpu",
    "memory",
    "ram",
    "disk",
    "drive",
    "network",
    "display",
    "monitor"
  ],
  "performance-diagnostic": [
    "slow",
    "slowing",
    "lag",
    "stuck",
    "freeze",
    "performance",
    "diagnostic",
    "resource",
    "ram",
    "cpu",
    "memory",
    "bottleneck"
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

const normalizeQuery = (query: string): string => stripPunctuation(query);

const includesAny = (query: string, phrases: string[]): boolean => {
  const normalized = normalizeQuery(query);
  return phrases.some((phrase) => normalized.includes(normalizeQuery(phrase)));
};

const collectSignals = (query: string, phrases: string[]): string[] => {
  const normalized = normalizeQuery(query);
  return uniqueStrings(phrases.filter((phrase) => normalized.includes(normalizeQuery(phrase))));
};

const countKeywordHits = (query: string, phrases: string[]): number => collectSignals(query, phrases).length;

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const confidenceLevelFor = (confidence: number): AwarenessConfidenceLevel =>
  confidence >= 0.85 ? "high" : confidence >= 0.55 ? "medium" : "low";

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

const chooseScopeForQuery = (query: string): AwarenessQueryScope => {
  const normalized = normalizeQuery(query);

  if (normalized.includes("current ui") || normalized.includes("what am i looking at") || normalized.includes("what tab")) {
    return "current-ui";
  }

  if (normalized.includes("last report") || normalized.includes("last told") || normalized.includes("since you last")) {
    return "last-report";
  }

  if (normalized.includes("last session") || normalized.includes("previous session")) {
    return "previous-session";
  }

  if (normalized.includes("since restart") || normalized.includes("since startup") || normalized.includes("since boot")) {
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
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction?: string | null;
  confidence: number;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  mode: AwarenessSummaryMode;
}): AwarenessQueryAnswer["bundle"] => {
  const confidence = clamp(input.confidence);
  const verified = limitStrings(input.verifiedFindings, MODE_LIMITS[input.mode] + 2);
  const likely = limitStrings(input.likelyInterpretation, MODE_LIMITS[input.mode] + 2);
  const uncertainty = limitStrings(input.uncertainty, MODE_LIMITS[input.mode] + 2);
  const checks = limitStrings(input.suggestedNextChecks, MODE_LIMITS[input.mode] + 2);

  return {
    verifiedFindings: verified,
    likelyInterpretation: likely,
    uncertainty,
    suggestedNextChecks: checks,
    safeNextAction: input.safeNextAction ?? null,
    confidence,
    confidenceLevel: confidenceLevelFor(confidence),
    freshness: input.freshness,
    evidenceRefs: trimEvidenceRefs(input.evidenceRefs),
    affectedAreas: uniqueStrings(input.affectedAreas) as AwarenessArea[],
    compactSummary: buildCompactSummary(verified, likely, uncertainty, checks, input.safeNextAction ?? null, input.mode)
  };
};

const buildAnswer = (input: {
  query: string;
  intent: AwarenessIntentRoute;
  scope: AwarenessQueryScope;
  mode: AwarenessSummaryMode;
  includeInContext: boolean;
  bundle: AwarenessQueryAnswer["bundle"];
}): AwarenessQueryAnswer => ({
  id: randomUUID(),
  query: input.query,
  generatedAt: new Date().toISOString(),
  intent: input.intent,
  scope: input.scope,
  mode: input.mode,
  includeInContext: input.includeInContext,
  summary: `${input.intent.label}: ${input.bundle.compactSummary}`,
  bundle: input.bundle
});

const scoreIntent = (query: string, family: AwarenessIntentFamily): { score: number; signals: string[] } => {
  const keywords = INTENT_KEYWORDS[family];
  const signals = collectSignals(query, keywords);
  const score = countKeywordHits(query, keywords);
  return { score, signals };
};

export const routeAwarenessIntent = (query: string): AwarenessIntentRoute => {
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
  if (!winner || winner.score === 0) {
    return {
      family: "repo-change",
      label: INTENT_LABELS["repo-change"],
      confidence: 0,
      signals: [],
      targetAreas: INTENT_TARGET_AREAS["repo-change"]
    };
  }

  const fileCandidate = scored.find((entry) => entry.family === "file-folder-media");
  const performanceCandidate = scored.find((entry) => entry.family === "performance-diagnostic");
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
  const performanceSpecificSignals = includesAny(normalized, [
    "using the most",
    "what is using",
    "resource hog",
    "slow",
    "slowing",
    "slowdown",
    "lag",
    "bottleneck",
    "performance",
    "task manager",
    "top process",
    "most ram",
    "most cpu",
    "most memory"
  ]);
  const hardwareSpecificSignals = includesAny(normalized, [
    "cpu model",
    "gpu",
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
  if (winner.family === "hardware" && performanceCandidate && performanceSpecificSignals && !hardwareSpecificSignals) {
    winner = performanceCandidate;
  }

  const supportingSignals = uniqueStrings([
    ...winner.signals,
    ...(winner.family === "repo-change" && includesAny(normalized, ["since restart", "since startup", "since last session", "what changed"])
      ? ["change"]
      : []),
    ...(winner.family === "performance-diagnostic" && includesAny(normalized, ["slow", "lag", "ram", "cpu", "memory"])
      ? ["diagnostic"]
      : []),
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
  const cpu = current.cpuSeconds != null ? `${current.cpuSeconds.toFixed(1)}s CPU` : "CPU n/a";
  const services = relatedServicesForProcess(machine, current);
  return `${current.name}#${current.pid} (${memory}, ${cpu})${services.length > 0 ? ` | services: ${services.join(", ")}` : ""}`;
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

const buildPerformanceDiagnostics = (input: AwarenessPerformanceDiagnosticInput): AwarenessPerformanceDiagnostic => {
  const machine = input.current.machineAwareness;
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

  const verifiedFindings = topProcesses.slice(0, MODE_LIMITS.medium).map((entry) =>
    summarizeProcessFocus(machine.processSnapshot.processes.find((process) => process.pid === entry.pid)!, machine)
  );

  const memoryTotal = machine.systemIdentity.hardware.memory.totalBytes;
  const topMemory = topProcesses[0]?.memoryBytes ?? 0;
  const memoryShare = memoryTotal > 0 ? topMemory / memoryTotal : 0;
  const confidence = clamp(0.55 + Math.min(0.35, topProcesses.length * 0.05 + serviceHotspots.length * 0.04));

  const likelyInterpretation = [
    memoryShare >= 0.25
      ? "The top process is consuming a large share of available RAM."
      : "The top process list suggests where the most active load is concentrated.",
    serviceHotspots.length > 0
      ? "One or more running services may be contributing to the background load."
      : "No obvious service hotspot stood out from the current snapshot."
  ];
  const uncertainty = [
    machine.processSnapshot.isTruncated ? "The process list is truncated, so there may be additional heavy processes." : "",
    "CPU seconds are cumulative, so they are a rough indicator rather than a live percentage.",
    "Disk or GPU bottlenecks are not fully captured by the process list alone."
  ].filter(Boolean) as string[];
  const suggestedNextChecks = [
    "Open Task Manager > Processes and sort by Memory.",
    "Open Resource Monitor if you want a deeper disk/CPU breakdown.",
    "Check startup apps if the slowdown happens right after sign-in."
  ];

  return {
    capturedAt: machine.capturedAt,
    freshness: restampFreshness(machine.freshness, input.now),
    summary: buildSummaryText(
      [
        `Top process: ${topProcesses[0] ? summarizeProcessFocus(machine.processSnapshot.processes.find((process) => process.pid === topProcesses[0].pid)!, machine) : "none"}`,
        `Services: ${serviceHotspots.slice(0, 2).map((service) => `${service.serviceName} (${service.state})`).join(" | ") || "none"}`
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

const buildSettingsControlRegistryAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const scope = input.scope ?? "current-machine";
  const mode = chooseMode(query, input.mode);
  const current = input.current;
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
    mode
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
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
  const verifiedFindings = [
    `${identity.machineName} | ${identity.windowsEdition ?? identity.windowsVersion ?? "Windows"} | ${identity.architecture}`,
    `${hardware.cpu.name} (${hardware.cpu.cores} cores / ${hardware.cpu.logicalCores} threads)`,
    `${formatBytes(hardware.memory.totalBytes)} RAM`,
    hardware.drives.length > 0
      ? `Drives: ${hardware.drives
          .slice(0, MODE_LIMITS[mode] + 1)
          .map((drive) => `${drive.deviceId}${drive.volumeLabel ? ` (${drive.volumeLabel})` : ""}`)
          .join(" | ")}`
      : "No drives were reported."
  ];
  const likelyInterpretation = [
    hardware.gpus.length > 0 ? `GPU: ${hardware.gpus[0].name}` : "No GPU summary was captured.",
    hardware.networkAdapters.length > 0 ? `Network adapter: ${hardware.networkAdapters[0].name}` : "No active network adapter summary was captured."
  ];
  const uncertainty = [
    identity.windowsEdition ? "" : "The Windows edition was not detected.",
    hardware.displays.length === 0 ? "Display details were not available in this snapshot." : ""
  ].filter(Boolean) as string[];
  const bundle = buildEvidenceBundle({
    freshness: current.machineAwareness.freshness,
    verifiedFindings,
    likelyInterpretation,
    uncertainty,
    suggestedNextChecks: ["Check the hardware summary or open System Information if you need more detail."],
    safeNextAction: "Review the current machine inventory in read-only mode.",
    confidence: clamp(0.72),
    evidenceRefs: trimEvidenceRefs([makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath)]),
    affectedAreas: ["machine"],
    mode
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
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
    evidenceRefs.push(...processMatches.slice(0, 2).map((process) => makeEvidenceRef(`${process.pid}`, "api", `process-${process.pid}`)));
  }

  if (serviceMatches.length > 0) {
    verifiedFindings.push(
      `Service matches: ${serviceMatches
        .map((service) => `${service.displayName} [${service.state}, ${service.startupType}]`)
        .join(" | ")}`
    );
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
    mode
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
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
    mode
  });

  return buildAnswer({
    query: input.query,
    intent: route,
    scope,
    mode,
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
  return buildAnswer({
    query: input.query,
    intent: route,
    scope: input.scope ?? "current-machine",
    mode,
    includeInContext: diagnostics.confidence >= 0.55,
    bundle: buildEvidenceBundle({
      freshness: diagnostics.freshness,
      verifiedFindings: diagnostics.verifiedFindings,
      likelyInterpretation: diagnostics.likelyInterpretation,
      uncertainty: diagnostics.uncertainty,
      suggestedNextChecks: diagnostics.suggestedNextChecks,
      safeNextAction: "Open Task Manager or Resource Monitor to confirm the top consumers.",
      confidence: diagnostics.confidence,
      evidenceRefs: diagnostics.evidenceRefs,
      affectedAreas: diagnostics.affectedAreas,
      mode
    })
  });
};

const buildRepoChangeAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer => {
  const query = input.query;
  const route = input.route ?? routeAwarenessIntent(query);
  const mode = chooseMode(query, input.mode);
  const scope = input.scope ?? chooseScopeForQuery(query);
  const current = input.current;
  const startup = input.startup;
  const previous = input.previous;
  const normalized = normalizeQuery(query);

  const repoFresh = current.repo;
  const currentFile = current.fileAwarenessSnapshot;
  const startupFile = startup?.fileAwarenessSummary;
  const previousFile = previous?.fileAwarenessSummary;
  const currentScreen = current.screenAwareness;
  const startupScreen = startup?.screenAwareness;
  const previousScreen = previous?.screenAwareness;
  const currentDigest = current.digest;
  const lastReport = current.lastReportedBaseline;

  const verifiedFindings: string[] = [];
  const likelyInterpretation: string[] = [];
  const uncertainty: string[] = [];
  const suggestedNextChecks: string[] = [];
  const evidenceRefs: EvidenceRef[] = [
    makeEvidenceRef(input.paths.currentSessionPath, "session", "current-session", input.paths.currentSessionPath),
    makeEvidenceRef(input.paths.latestDigestPath, "digest", "latest-digest", input.paths.latestDigestPath)
  ];

  if (scope === "session") {
    verifiedFindings.push(`Current session started at ${current.session.appStartedAt}`);
    verifiedFindings.push(`Repo: ${repoFresh.branch ?? "no-git"}${repoFresh.headSha ? ` @ ${repoFresh.headSha.slice(0, 8)}` : ""} (${repoFresh.dirtyState})`);
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
    likelyInterpretation.push("This session changed as local repo and file state evolved after startup.");
    suggestedNextChecks.push("Review the current session snapshot or compare the current file-change list.");
  }

  if (scope === "previous-session") {
    verifiedFindings.push(`Previous session id: ${previous?.session.sessionId ?? "unavailable"}`);
    if (previous) {
      verifiedFindings.push(`Previous repo: ${previous.repo.branch ?? "no-git"}${previous.repo.headSha ? ` @ ${previous.repo.headSha.slice(0, 8)}` : ""} (${previous.repo.dirtyState})`);
      if (previous.fileAwarenessSummary) {
        verifiedFindings.push(`Previous file summary: ${previous.fileAwarenessSummary.summary}`);
      }
      if (previous.screenAwareness) {
        verifiedFindings.push(`Previous screen summary: ${previous.screenAwareness.summary.summary}`);
      }
    } else {
      uncertainty.push("No previous session snapshot was available.");
    }
    likelyInterpretation.push("The previous session is the best baseline for cross-session change comparison.");
    suggestedNextChecks.push("Compare the current session against the previous session snapshot if you need exact deltas.");
  }

  if (scope === "last-report") {
    verifiedFindings.push(`Last report digest: ${lastReport?.digestId ?? "unavailable"}`);
    if (lastReport) {
      verifiedFindings.push(`Reported repo fingerprint: ${lastReport.repoFingerprint.slice(0, 12)}`);
      verifiedFindings.push(`Reported machine fingerprint: ${lastReport.machineFingerprint.slice(0, 12)}`);
    } else {
      uncertainty.push("No last-reported baseline exists yet.");
    }
    if (lastReport?.baselineFingerprint === currentDigest.baselineFingerprint) {
      likelyInterpretation.push("Nothing material changed in the repo/machine/session baseline since the last report.");
    } else {
      likelyInterpretation.push("The repo or machine baseline has changed since the last report.");
    }
    suggestedNextChecks.push("Refresh the awareness digest if you want the latest baseline to become the new report reference.");
  }

  if (scope === "current-machine") {
    verifiedFindings.push(`Machine: ${current.machineAwareness.systemIdentity.machineName} | ${current.machineAwareness.systemIdentity.windowsEdition ?? current.machineAwareness.systemIdentity.windowsVersion ?? "Windows"} | ${current.machineAwareness.systemIdentity.architecture}`);
    verifiedFindings.push(`${current.machineAwareness.summary.counts.processes} processes, ${current.machineAwareness.summary.counts.services} services, ${current.machineAwareness.summary.counts.startupEntries} startup items`);
    if (current.machineAwareness.summary.highlights.processes.length > 0) {
      verifiedFindings.push(`Top processes: ${current.machineAwareness.summary.highlights.processes.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}`);
    }
    if (current.machineAwareness.summary.highlights.settings.length > 0) {
      verifiedFindings.push(`Settings hits: ${current.machineAwareness.summary.highlights.settings.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}`);
    }
    likelyInterpretation.push("This machine inventory is compact but sufficient for process, service, startup, and settings lookups.");
    suggestedNextChecks.push("Ask about a process, service, startup item, setting, or registry zone for a focused lookup.");
  }

  if (normalized.includes("changed") || normalized.includes("change")) {
    if (startup && startup.repo.fingerprint !== repoFresh.fingerprint) {
      verifiedFindings.push(`Repo fingerprint changed since startup: ${startup.repo.fingerprint.slice(0, 12)} -> ${repoFresh.fingerprint.slice(0, 12)}`);
    }
    if (previous && previous.repo.fingerprint !== repoFresh.fingerprint) {
      verifiedFindings.push(`Repo fingerprint changed since the previous session: ${previous.repo.fingerprint.slice(0, 12)} -> ${repoFresh.fingerprint.slice(0, 12)}`);
    }
    if (startupFile && currentFile && startupFile.summary !== currentFile.summary.summary) {
      verifiedFindings.push("File catalog summary changed since startup.");
    }
    if (previousFile && currentFile && previousFile.summary !== currentFile.summary.summary) {
      verifiedFindings.push("File catalog summary changed since the previous session.");
    }
    if (startupScreen && currentScreen && startupScreen.fingerprint !== currentScreen.fingerprint) {
      verifiedFindings.push("Screen snapshot changed since startup.");
    }
    if (previousScreen && currentScreen && previousScreen.fingerprint !== currentScreen.fingerprint) {
      verifiedFindings.push("Screen snapshot changed since the previous session.");
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
  }

  if (verifiedFindings.length === 0) {
    uncertainty.push("No explicit change evidence was found for the requested scope.");
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
    mode
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
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
    mode
  });

  return buildAnswer({
    query,
    intent: route,
    scope,
    mode,
    includeInContext: bundle.confidence >= 0.55,
    bundle
  });
};

export const buildAwarenessQueryAnswer = (input: AwarenessQueryBuildInput): AwarenessQueryAnswer | null => {
  const query = input.query.trim();
  if (!query) {
    return null;
  }

  const route = input.route ?? routeAwarenessIntent(query);
  if (route.confidence < QUERY_CONFIDENCE_THRESHOLD && route.signals.length === 0) {
    return null;
  }

  switch (route.family) {
    case "file-folder-media":
      return buildFileFolderMediaAnswer({ ...input, route });
    case "process-service-startup":
      return buildProcessServiceStartupAnswer({ ...input, route });
    case "settings-control-panel":
      return buildSettingsControlRegistryAnswer({ ...input, route });
    case "registry":
      return buildSettingsControlRegistryAnswer({ ...input, route });
    case "hardware":
      return buildHardwareAnswer({ ...input, route });
    case "performance-diagnostic":
      return buildPerformanceAnswer({ ...input, route });
    case "on-screen":
      return buildOnScreenAnswer({ ...input, route });
    case "repo-change":
    default:
      return buildRepoChangeAnswer({ ...input, route });
  }
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
    `Machine: ${current.machine.machineName} | ${current.machine.architecture}`,
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
        `Machine: ${previous.machine.machineName} | ${previous.machine.architecture}`,
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
  const verifiedFindings = lastReported
    ? [
        `Last report id: ${lastReported.digestId}`,
        `Reported at: ${lastReported.reportedAt}`,
        `Repo fingerprint: ${lastReported.repoFingerprint.slice(0, 12)}`,
        `Machine fingerprint: ${lastReported.machineFingerprint.slice(0, 12)}`
      ]
    : ["No last-reported baseline exists yet."];

  const bundle = buildEvidenceBundle({
    freshness: input.current.digest.freshness,
    verifiedFindings,
    likelyInterpretation: lastReported
      ? ["The current baseline can be compared against the last reported digest."]
      : ["A fresh report has not been recorded yet."],
    uncertainty: lastReported ? [] : ["There is no previous report artifact to compare against."],
    suggestedNextChecks: ["Refresh the digest to create a new last-reported baseline."],
    safeNextAction: "Review the last-reported baseline artifact.",
    confidence: lastReported ? 0.7 : 0.2,
    evidenceRefs: lastReported
      ? [makeEvidenceRef(input.paths.lastReportedBaselinePath, "session", "last-reported-baseline", input.paths.lastReportedBaselinePath)]
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
    `Processes: ${machine.summary.counts.processes}, services: ${machine.summary.counts.services}, startup items: ${machine.summary.counts.startupEntries}`,
    machine.summary.highlights.processes.length > 0 ? `Top processes: ${machine.summary.highlights.processes.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null,
    machine.summary.highlights.settings.length > 0 ? `Settings hits: ${machine.summary.highlights.settings.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null,
    machine.summary.highlights.registryZones.length > 0 ? `Registry zones: ${machine.summary.highlights.registryZones.slice(0, MODE_LIMITS[mode] + 1).join(" | ")}` : null
  ].filter((value): value is string => Boolean(value));

  const bundle = buildEvidenceBundle({
    freshness: machine.freshness,
    verifiedFindings,
    likelyInterpretation: ["This is the current machine snapshot used for process, service, startup, and settings lookups."],
    uncertainty: machine.processSnapshot.isTruncated ? ["The process list is truncated."] : [],
    suggestedNextChecks: [
      "Ask about a process, service, startup item, setting, or registry zone for a focused lookup.",
      "Use the performance diagnostic if you want the top RAM/CPU consumers."
    ],
    safeNextAction: "Inspect the machine summary or request a focused lookup.",
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

export const buildAwarenessCurrentUiDiagnostic = (
  input: AwarenessCurrentUiDiagnosticInput
): AwarenessCurrentUiDiagnostic => buildCurrentUiDiagnostics(input);

export const buildAwarenessQueryContextSection = (
  answer: AwarenessQueryAnswer | null | undefined,
  latestUserMessage: string,
  awarenessMode: AwarenessMode = "observe"
): string | null => {
  if (!answer || (!answer.includeInContext && awarenessMode !== "debug")) {
    return null;
  }

  const relevanceHint = normalizeQuery(latestUserMessage);
  if (!answer.includeInContext && !relevanceHint.includes("awareness")) {
    return null;
  }

  const lines = [
    `Awareness query: ${answer.intent.label}`,
    `Scope: ${answer.scope} | Mode: ${answer.mode} | Confidence: ${answer.bundle.confidenceLevel}`,
    `Q: ${answer.query}`,
    answer.bundle.verifiedFindings.length > 0 ? `Verified: ${answer.bundle.verifiedFindings.slice(0, 2).join(" | ")}` : null,
    answer.bundle.likelyInterpretation.length > 0 ? `Likely: ${answer.bundle.likelyInterpretation.slice(0, 2).join(" | ")}` : null,
    answer.bundle.uncertainty.length > 0 ? `Uncertainty: ${answer.bundle.uncertainty.slice(0, 2).join(" | ")}` : null,
    answer.bundle.suggestedNextChecks.length > 0 ? `Next: ${answer.bundle.suggestedNextChecks.slice(0, 2).join(" | ")}` : null,
    answer.bundle.safeNextAction ? `Safe next: ${answer.bundle.safeNextAction}` : null
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n").slice(0, 1200);
};
