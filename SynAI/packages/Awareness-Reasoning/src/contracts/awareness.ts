export const PRIVACY_SCOPES = [
  "public metadata",
  "user-visible local content",
  "sensitive local content",
  "protected/system-sensitive surfaces"
] as const;

export type PrivacyScope = (typeof PRIVACY_SCOPES)[number];

export const PERMISSION_TIERS = [
  "Observe",
  "Open/Navigate",
  "SoftAction",
  "HighRiskAction"
] as const;

export type PermissionTier = (typeof PERMISSION_TIERS)[number];

export const AWARENESS_MODES = ["observe", "contextual", "debug"] as const;

export type AwarenessMode = (typeof AWARENESS_MODES)[number];

export const AWARENESS_EVENT_TYPES = [
  "session_started",
  "baseline_created",
  "baseline_restored",
  "digest_generated",
  "privacy_scope_blocked",
  "fallback_mode_enabled",
  "report_marked_delivered",
  "assist_started",
  "assist_stopped",
  "active_window_changed",
  "ui_tree_refreshed",
  "screen_frame_captured",
  "click_observed",
  "hover_target_changed",
  "protected_input_blocked"
] as const;

export type AwarenessEventType = (typeof AWARENESS_EVENT_TYPES)[number];

export const AWARENESS_AREAS = [
  "repo",
  "session",
  "machine",
  "files",
  "media",
  "official-knowledge",
  "journal",
  "context",
  "api",
  "privacy",
  "screen",
  "assist",
  "ui",
  "interaction"
] as const;

export type AwarenessArea = (typeof AWARENESS_AREAS)[number];

export const EVIDENCE_REF_KINDS = ["file", "git", "session", "digest", "event", "api", "window", "ui-tree", "screen", "display", "official"] as const;

export type EvidenceRefKind = (typeof EVIDENCE_REF_KINDS)[number];

export const AWARENESS_CONTEXT_REASONS = ["relevant", "debug", "not_relevant", "fallback"] as const;

export type AwarenessContextReason = (typeof AWARENESS_CONTEXT_REASONS)[number];

export const REPO_STATES = ["clean", "dirty", "unknown"] as const;

export type RepoState = (typeof REPO_STATES)[number];

export const ASSIST_MODE_SCOPES = ["current-window", "selected-app", "chosen-display"] as const;

export type AssistModeScope = (typeof ASSIST_MODE_SCOPES)[number];

export const SCREEN_CAPTURE_MODES = ["on-demand", "session"] as const;

export type ScreenCaptureMode = (typeof SCREEN_CAPTURE_MODES)[number];

export interface EvidenceRef {
  id: string;
  kind: EvidenceRefKind;
  label?: string;
  path?: string;
  hash?: string;
  url?: string;
}

export const OFFICIAL_KNOWLEDGE_POLICIES = ["off", "mirror-first", "live-fallback"] as const;

export type OfficialKnowledgePolicy = (typeof OFFICIAL_KNOWLEDGE_POLICIES)[number];

export interface OfficialKnowledgeSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  topic: string;
  keywords: string[];
  aliases: string[];
  productTags: string[];
  versionTags: string[];
}

export interface OfficialKnowledgeDocument {
  id: string;
  sourceId: string;
  title: string;
  canonicalUrl: string;
  domain: string;
  topic: string;
  section: string | null;
  fetchedAt: string;
  productTags: string[];
  versionTags: string[];
  aliases: string[];
  keywords: string[];
  extracts: string[];
  summary: string;
}

export interface OfficialKnowledgeHit {
  documentId: string;
  sourceId: string;
  title: string;
  canonicalUrl: string;
  domain: string;
  topic: string;
  summary: string;
  extract: string;
  score: number;
  versionMatched: boolean;
  fetchedAt: string;
}

export interface OfficialKnowledgeContext {
  query: string;
  policy: OfficialKnowledgePolicy;
  used: boolean;
  source: "mirror" | "live-fallback" | "none";
  generatedAt: string;
  lastRefreshedAt: string | null;
  mirrorFresh: boolean;
  hitCount: number;
  hits: OfficialKnowledgeHit[];
}

export interface FreshnessMetadata {
  capturedAt: string;
  generatedAt: string;
  observedAt: string;
  ageMs: number;
  staleAfterMs: number;
  isFresh: boolean;
}

export const RESOURCE_HOTSPOT_RESOURCES = ["ram", "cpu", "gpu", "disk"] as const;

export type ResourceHotspotResource = (typeof RESOURCE_HOTSPOT_RESOURCES)[number];

export const RESOURCE_HOTSPOT_GROUPINGS = ["process", "program"] as const;

export type ResourceHotspotGrouping = (typeof RESOURCE_HOTSPOT_GROUPINGS)[number];

export interface AwarenessResourceHotspotEntry {
  resource: ResourceHotspotResource;
  grouping: ResourceHotspotGrouping;
  rank: number;
  label: string;
  processName: string;
  pid: number | null;
  appName: string | null;
  resourceAmount: string;
  resourceShare: number | null;
  executablePath: string | null;
  publisher: string | null;
  linkedServices: string[];
  description: string;
  cpuPercent: number | null;
  memoryBytes: number | null;
  ioBytes: number | null;
  gpuPercent: number | null;
  windowTitle: string | null;
}

export interface MachineMetricSample {
  capturedAt: string;
  cpuLoadPercent: number | null;
  ramUsedBytes: number | null;
  ramAvailableBytes: number | null;
  gpuLoadPercent: number | null;
  vramUsedBytes: number | null;
  diskFreeBytes: number | null;
  diskTotalBytes: number | null;
  topRamProcess: string | null;
  topCpuProcess: string | null;
  topDiskProcess: string | null;
}

export interface MachineMetricTrend {
  direction: "rising" | "falling" | "stable";
  changePercent: number | null;
  summary: string;
}

export interface MachineRollingMetrics {
  capturedAt: string;
  freshness: FreshnessMetadata;
  windowMinutes: number;
  samples: MachineMetricSample[];
  cpuTrend: MachineMetricTrend;
  ramTrend: MachineMetricTrend;
  gpuTrend: MachineMetricTrend;
}

export interface MachineProcessCorrelation {
  pid: number;
  processName: string;
  appName: string | null;
  publisher: string | null;
  executablePath: string | null;
  windowTitle: string | null;
  linkedServices: string[];
  startupEntries: string[];
  description: string;
}

export interface MachineAppCorrelation {
  appName: string;
  publisher: string | null;
  processIds: number[];
  processNames: string[];
  linkedServices: string[];
  startupEntries: string[];
}

export interface MachineServiceCorrelation {
  serviceName: string;
  displayName: string;
  linkedProcessId: number | null;
  linkedProcessName: string | null;
  linkedAppName: string | null;
  startupType: string;
  state: string;
}

export interface MachineCorrelationGraph {
  generatedAt: string;
  freshness: FreshnessMetadata;
  processLinks: MachineProcessCorrelation[];
  appLinks: MachineAppCorrelation[];
  serviceLinks: MachineServiceCorrelation[];
}

export interface AwarenessRecurringPattern {
  id: string;
  category: string;
  title: string;
  summary: string;
  firstObservedAt: string;
  lastObservedAt: string;
  confidence: number;
  evidence: string[];
}

export interface AwarenessStartupDigest {
  generatedAt: string;
  freshness: FreshnessMetadata;
  title: string;
  summary: string;
  highlights: string[];
  whyItMatters: string[];
  recurringPatterns: string[];
  safeNextAction: string | null;
}

export interface ScreenDiffSummary {
  capturedAt: string;
  changed: boolean;
  summary: string;
  activeWindowChanged: boolean;
  focusedElementChanged: boolean;
  hoveredElementChanged: boolean;
  controlCountDelta: number;
  addedHighlights: string[];
  removedHighlights: string[];
}

export type AwarenessAnswerCardTone = "neutral" | "good" | "warn" | "bad";

export interface AwarenessAnswerCardMetric {
  label: string;
  value: string;
  tone?: AwarenessAnswerCardTone;
}

export interface AwarenessAnswerCardSection {
  label: string;
  items: string[];
}

export interface AwarenessAnswerCard {
  kind: "live-usage" | "resource-hotspot" | "awareness-summary" | "startup-digest" | "debug-health";
  title: string;
  subtitle?: string | null;
  metrics: AwarenessAnswerCardMetric[];
  sections: AwarenessAnswerCardSection[];
  footer?: string | null;
}

export interface RepoCommitSummary {
  sha: string;
  shortSha: string;
  subject: string;
  authoredAt: string;
}

export type RepoWorkingTreeKind =
  | "staged"
  | "unstaged"
  | "mixed"
  | "untracked"
  | "conflicted";

export interface RepoWorkingTreeEntry {
  path: string;
  previousPath: string | null;
  stagedStatus: string | null;
  unstagedStatus: string | null;
  kind: RepoWorkingTreeKind;
  summary: string;
}

export interface RepoWorkingTreeCounts {
  total: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
  renamed: number;
  deleted: number;
  modified: number;
}

export interface RepoWorkingTreeSummary {
  totalCount: number;
  isTruncated: boolean;
  counts: RepoWorkingTreeCounts;
  entries: RepoWorkingTreeEntry[];
  summary: string;
}

export interface RepoBaseline {
  repoRoot: string;
  branch: string | null;
  headSha: string | null;
  dirtyState: RepoState;
  dirty: boolean | null;
  recentCommits: RepoCommitSummary[];
  workingTree: RepoWorkingTreeSummary;
  watchedRoots: string[];
  ignoredRoots: string[];
  activeFeatureFlags: string[];
  capturedAt: string;
  fingerprint: string;
}

export interface MachineBaseline {
  machineName: string;
  osVersion: string;
  osBuild: string;
  username: string;
  platform: string;
  arch: string;
  timezone: string;
  localTime: string;
  capturedAt: string;
  fingerprint: string;
}

export interface HardwareDriveSummary {
  deviceId: string;
  volumeLabel: string | null;
  fileSystem: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
  driveType: string | null;
}

export interface HardwareMemorySummary {
  totalBytes: number;
  availableBytes: number | null;
  freeBytes: number | null;
}

export interface HardwareCpuSummary {
  name: string;
  manufacturer: string | null;
  architecture: string | null;
  cores: number;
  logicalCores: number;
  speedMHz: number | null;
}

export interface HardwareGpuSummary {
  name: string;
  driverVersion: string | null;
  memoryBytes: number | null;
  resolution: string | null;
  loadPercent?: number | null;
}

export interface HardwareNetworkAdapterSummary {
  name: string;
  description: string | null;
  macAddress: string | null;
  ipAddresses: string[];
  status: string | null;
}

export interface HardwareDisplaySummary {
  name: string;
  width: number | null;
  height: number | null;
  refreshRateHz: number | null;
  primary: boolean;
}

export interface HardwareSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  drives: HardwareDriveSummary[];
  memory: HardwareMemorySummary;
  cpu: HardwareCpuSummary;
  cpuLoadPercent: number | null;
  gpus: HardwareGpuSummary[];
  networkAdapters: HardwareNetworkAdapterSummary[];
  displays: HardwareDisplaySummary[];
}

export interface SystemIdentity {
  capturedAt: string;
  freshness: FreshnessMetadata;
  machineName: string;
  windowsEdition: string | null;
  windowsVersion: string | null;
  windowsBuild: string | null;
  architecture: string;
  currentUser: string;
  uptimeSeconds: number;
  timezone: string;
  localTime: string;
  hardware: HardwareSnapshot;
}

export interface ProcessEntry {
  pid: number;
  parentPid: number | null;
  name: string;
  executablePath: string | null;
  commandLine: string | null;
  cpuSeconds: number | null;
  cpuPercent?: number | null;
  memoryBytes: number | null;
  ioReadBytes: number | null;
  ioWriteBytes: number | null;
  ioReadBytesPerSec?: number | null;
  ioWriteBytesPerSec?: number | null;
  gpuPercent?: number | null;
  startTime: string | null;
  signer: string | null;
  publisher: string | null;
  windowTitle: string | null;
}

export interface ProcessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  totalCount: number;
  isTruncated: boolean;
  processes: ProcessEntry[];
}

export interface ServiceEntry {
  serviceName: string;
  displayName: string;
  state: string;
  startupType: string;
  executablePath: string | null;
  dependentServices: string[];
  linkedProcessId: number | null;
  account: string | null;
}

export interface ServiceSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  totalCount: number;
  isTruncated: boolean;
  services: ServiceEntry[];
}

export type StartupEntrySource = "startup-folder" | "run" | "runonce" | "scheduled-task" | "launcher-hint";

export interface StartupEntry {
  name: string;
  source: StartupEntrySource;
  location: string;
  command: string | null;
  target: string | null;
  processId: number | null;
  linkedAppName: string | null;
}

export interface StartupSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  totalCount: number;
  isTruncated: boolean;
  folderEntries: StartupEntry[];
  registryEntries: StartupEntry[];
  scheduledTaskEntries: StartupEntry[];
  launcherHints: StartupEntry[];
}

export interface InstalledAppEntry {
  name: string;
  publisher: string | null;
  version: string | null;
  installLocation: string | null;
  installDate: string | null;
  uninstallCommand: string | null;
  quietUninstallCommand: string | null;
  displayIcon: string | null;
  estimatedSizeKb: number | null;
  sources: string[];
  associatedProcessIds: number[];
  associatedProcessNames: string[];
  startupReferences: string[];
}

export interface InstalledAppsSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  totalCount: number;
  isTruncated: boolean;
  apps: InstalledAppEntry[];
}

export const MACHINE_EVENT_LOG_LEVELS = [
  "critical",
  "error",
  "warning",
  "information",
  "verbose",
  "unknown"
] as const;

export type MachineEventLogLevel = (typeof MACHINE_EVENT_LOG_LEVELS)[number];

export interface MachineEventLogEntry {
  id: string;
  timestamp: string;
  logName: string;
  level: MachineEventLogLevel;
  provider: string | null;
  eventId: number | null;
  taskCategory: string | null;
  opcode: string | null;
  machineName: string | null;
  message: string | null;
  processId: number | null;
}

export interface MachineEventLogCounts {
  total: number;
  critical: number;
  error: number;
  warning: number;
  information: number;
  verbose: number;
  unknown: number;
}

export interface MachineEventLogSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  totalCount: number;
  isTruncated: boolean;
  windowStartAt: string;
  windowEndAt: string;
  logs: string[];
  entries: MachineEventLogEntry[];
  counts: MachineEventLogCounts;
}

export interface SettingsMapEntry {
  category: string;
  label: string;
  aliases: string[];
  launchTarget: string;
  relatedSettings: string[];
  description: string;
}

export interface SettingsMap {
  capturedAt: string;
  freshness: FreshnessMetadata;
  entries: SettingsMapEntry[];
}

export interface ControlPanelEntry {
  category: string;
  label: string;
  aliases: string[];
  launchTarget: string;
  relatedPanels: string[];
  description: string;
}

export interface ControlPanelMap {
  capturedAt: string;
  freshness: FreshnessMetadata;
  entries: ControlPanelEntry[];
}

export interface RegistryZoneEntry {
  category: string;
  hive: string;
  path: string;
  aliases: string[];
  valueNames: string[];
  notes: string[];
}

export interface RegistryZoneMap {
  capturedAt: string;
  freshness: FreshnessMetadata;
  zones: RegistryZoneEntry[];
}

export interface MachineAwarenessCounts {
  processes: number;
  services: number;
  startupEntries: number;
  installedApps: number;
  eventLogEntries: number;
  eventLogErrors: number;
  settings: number;
  controlPanels: number;
  registryZones: number;
}

export interface MachineAwarenessHighlights {
  processes: string[];
  services: string[];
  startup: string[];
  installedApps: string[];
  eventLogs: string[];
  settings: string[];
  controlPanels: string[];
  registryZones: string[];
}

export interface MachineAwarenessSummary {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  machineName: string;
  currentUser: string;
  windowsEdition: string | null;
  windowsVersion: string | null;
  windowsBuild: string | null;
  architecture: string;
  timezone: string;
  uptimeSeconds: number;
  counts: MachineAwarenessCounts;
  highlights: MachineAwarenessHighlights;
  rollingMetrics?: MachineRollingMetrics | null;
  recurringPatterns?: AwarenessRecurringPattern[];
  updateCorrelation?: UpdateCorrelationSummary | null;
}

export interface MachineAwarenessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  systemIdentity: SystemIdentity;
  processSnapshot: ProcessSnapshot;
  serviceSnapshot: ServiceSnapshot;
  startupSnapshot: StartupSnapshot;
  installedAppsSnapshot: InstalledAppsSnapshot;
  eventLogSnapshot: MachineEventLogSnapshot;
  settingsMap: SettingsMap;
  controlPanelMap: ControlPanelMap;
  registryZoneMap: RegistryZoneMap;
  correlationGraph?: MachineCorrelationGraph | null;
  rollingMetrics?: MachineRollingMetrics | null;
  recurringPatterns?: AwarenessRecurringPattern[];
  updateCorrelation?: UpdateCorrelationSummary | null;
  summary: MachineAwarenessSummary;
}

export interface ScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AssistModeStatus {
  enabled: boolean;
  visibleIndicator: boolean;
  scope: AssistModeScope | null;
  targetLabel: string | null;
  captureMode: ScreenCaptureMode;
  sampleIntervalMs: number | null;
  startedAt: string | null;
  stoppedAt: string | null;
  freshness: FreshnessMetadata;
}

export interface StartAssistModeOptions {
  scope?: AssistModeScope;
  targetLabel?: string | null;
  captureMode?: ScreenCaptureMode;
  sampleIntervalMs?: number | null;
}

export interface ForegroundWindowSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  windowHandle: string | null;
  title: string | null;
  processId: number | null;
  processName: string | null;
  executablePath: string | null;
  className: string | null;
  bounds: ScreenBounds | null;
  isForeground: boolean;
  isFocused: boolean;
  zOrder: number | null;
}

export interface ScreenUiElement {
  id: string;
  automationId: string | null;
  controlType: string;
  localizedControlType: string | null;
  name: string | null;
  value: string | null;
  className: string | null;
  helpText: string | null;
  bounds: ScreenBounds | null;
  enabled: boolean;
  focused: boolean;
  selected: boolean;
  offscreen: boolean;
  visible: boolean;
  isPassword: boolean;
  privacyScope: PrivacyScope;
  children: ScreenUiElement[];
}

export interface ScreenUiTreeSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  scope: AssistModeScope | null;
  targetLabel: string | null;
  rootWindowHandle: string | null;
  rootWindowTitle: string | null;
  cursorPosition: { x: number; y: number } | null;
  elementUnderCursor: ScreenUiElement | null;
  focusedElement: ScreenUiElement | null;
  root: ScreenUiElement | null;
  totalCount: number;
  isTruncated: boolean;
  redactedCount: number;
}

export interface ScreenFrameSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  scope: AssistModeScope | null;
  targetLabel: string | null;
  captureMode: ScreenCaptureMode;
  windowHandle: string | null;
  windowTitle: string | null;
  redactions: string[];
  uiElementCount: number;
}

export interface ScreenAwarenessCounts {
  windows: number;
  uiElements: number;
  events: number;
  protectedInputs: number;
  hoverTargets: number;
  clickTargets: number;
}

export interface ScreenAwarenessHighlights {
  activeWindow: string[];
  controls: string[];
  hoverTargets: string[];
  clickTargets: string[];
  blockedInputs: string[];
}

export interface ScreenAwarenessSummary {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  assistMode: AssistModeStatus;
  scope: AssistModeScope | null;
  targetLabel: string | null;
  foregroundWindowTitle: string | null;
  counts: ScreenAwarenessCounts;
  highlights: ScreenAwarenessHighlights;
  diff?: ScreenDiffSummary | null;
  recentEvents: Array<{
    id: string;
    type: AwarenessEventType;
    timestamp: string;
    message: string | null;
  }>;
}

export interface ScreenAwarenessStatus {
  assistMode: AssistModeStatus;
  scope: AssistModeScope | null;
  targetLabel: string | null;
  visibleIndicator: boolean;
  freshness: FreshnessMetadata;
  summary: string;
  foregroundWindowTitle: string | null;
  processName: string | null;
  counts: ScreenAwarenessCounts;
  blockedScopes: PrivacyScope[];
  supportedScopes: AssistModeScope[];
  lastEventType: AwarenessEventType | null;
}

export interface ScreenAwarenessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  assistMode: AssistModeStatus;
  foregroundWindow: ForegroundWindowSnapshot | null;
  uiTree: ScreenUiTreeSnapshot | null;
  frame: ScreenFrameSnapshot | null;
  diff?: ScreenDiffSummary | null;
  recentEvents: AwarenessEvent[];
  summary: ScreenAwarenessSummary;
  fingerprint: string;
  isTruncated: boolean;
}

export const FILE_ENTRY_KINDS = ["file", "folder"] as const;

export type FileEntryKind = (typeof FILE_ENTRY_KINDS)[number];

export const FILE_MEDIA_KINDS = ["photo", "video", "audio", "document"] as const;

export type FileMediaKind = (typeof FILE_MEDIA_KINDS)[number];

export const FILE_CHANGE_TYPES = ["created", "modified", "deleted", "renamed"] as const;

export type FileChangeType = (typeof FILE_CHANGE_TYPES)[number];

export const FILE_ROOT_SOURCES = ["default", "workspace", "user", "volume"] as const;
export const FILE_MONITOR_HEALTH_STATES = ["idle", "healthy", "degraded", "unsupported"] as const;
export const FILE_MONITOR_CURSOR_SOURCES = ["usn-journal", "watcher", "snapshot-diff"] as const;
export const VOLUME_AWARENESS_TYPES = ["fixed", "removable", "network", "unknown"] as const;

export type FileRootSource = (typeof FILE_ROOT_SOURCES)[number];
export type FileMonitorHealthState = (typeof FILE_MONITOR_HEALTH_STATES)[number];
export type FileMonitorCursorSource = (typeof FILE_MONITOR_CURSOR_SOURCES)[number];
export type VolumeAwarenessType = (typeof VOLUME_AWARENESS_TYPES)[number];

export interface FileCatalogEntry {
  path: string;
  parentPath: string | null;
  name: string;
  kind: FileEntryKind;
  extension: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  modifiedAt: string | null;
  accessedAt: string | null;
  owner: string | null;
  mimeType: string | null;
  contentHint: string | null;
  hash: string | null;
  mediaKind: FileMediaKind | null;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
  isSensitive: boolean;
  isProtected: boolean;
}

export interface FileFolderPreview {
  path: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  mediaKind: FileMediaKind | null;
}

export interface FileFolderSummary {
  path: string;
  parentPath: string | null;
  name: string;
  totalSizeBytes: number;
  fileCount: number;
  folderCount: number;
  largeFileCount: number;
  recentChangeCount: number;
  fileTypeCounts: Record<string, number>;
  newestModifiedAt: string | null;
  oldestModifiedAt: string | null;
  growthBytes: number | null;
  hotScore: number;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
  topFiles: FileFolderPreview[];
}

export interface MediaCatalogEntry {
  path: string;
  parentPath: string | null;
  name: string;
  mediaKind: FileMediaKind;
  extension: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  modifiedAt: string | null;
  accessedAt: string | null;
  owner: string | null;
  mimeType: string | null;
  contentHint: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  codec: string | null;
  pageCount: number | null;
  previewRef: EvidenceRef | null;
  tags: string[];
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
}

export interface FileChangeEntry {
  id: string;
  timestamp: string;
  type: FileChangeType;
  path: string;
  previousPath: string | null;
  rootPath: string;
  kind: FileEntryKind;
  sizeBytes: number | null;
  hash: string | null;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
}

export interface FileRootSnapshot {
  path: string;
  label: string;
  source: FileRootSource;
  volumeId?: string | null;
  privacyScope: PrivacyScope;
  included: boolean;
  excludedReason: string | null;
  freshness: FreshnessMetadata;
  totalSizeBytes: number;
  fileCount: number;
  folderCount: number;
  largeFolderCount: number;
  hotFolderCount: number;
  recentChangeCount: number;
  isTruncated: boolean;
}

export interface VolumeAwarenessSnapshot {
  id: string;
  rootPath: string;
  label: string;
  driveLetter: string | null;
  fileSystem: string | null;
  volumeType: VolumeAwarenessType;
  totalBytes: number | null;
  freeBytes: number | null;
  indexedSearchCapable: boolean;
  ntfsJournalCapable: boolean;
  watcherHealth: FileMonitorHealthState;
  freshness: FreshnessMetadata;
}

export interface FileJournalCursor {
  volumeId: string;
  rootPath: string;
  source: FileMonitorCursorSource;
  cursor: string | null;
  lastProcessedAt: string | null;
  healthy: boolean;
}

export interface FolderListingEntry {
  path: string;
  name: string;
  kind: FileEntryKind;
  sizeBytes: number | null;
  modifiedAt: string | null;
  mediaKind: FileMediaKind | null;
  privacyScope: PrivacyScope;
}

export interface FolderListingSummary {
  path: string;
  parentPath: string | null;
  exists: boolean;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
  folders: FolderListingEntry[];
  files: FolderListingEntry[];
  totals: {
    folders: number;
    files: number;
    totalSizeBytes: number;
  };
}

export interface VolumeMonitorState {
  backgroundMonitoring: boolean;
  lastRefreshAt: string | null;
  volumes: Array<{
    volumeId: string;
    rootPath: string;
    watcherHealth: FileMonitorHealthState;
    journalCapable: boolean;
    cursorSource: FileMonitorCursorSource;
    lastCursorAt: string | null;
    lastSeenChangeAt: string | null;
    lastError: string | null;
  }>;
}

export interface FileAwarenessCounts {
  volumes: number;
  roots: number;
  files: number;
  folders: number;
  media: number;
  recentChanges: number;
  protectedEntries: number;
  sensitiveEntries: number;
}

export interface FileChangeCounts {
  created: number;
  modified: number;
  deleted: number;
  renamed: number;
}

export interface FileRootSummary {
  path: string;
  label: string;
  fileCount: number;
  folderCount: number;
  totalSizeBytes: number;
  recentChangeCount: number;
  hotScore: number;
}

export interface FileChangeSummaryItem {
  type: FileChangeType;
  path: string;
  previousPath: string | null;
  timestamp: string;
}

export interface FileAwarenessSummary {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  isTruncated: boolean;
  counts: FileAwarenessCounts;
  changeCounts: FileChangeCounts;
  volumes: Array<{
    id: string;
    rootPath: string;
    freeBytes: number | null;
    totalBytes: number | null;
    fileSystem: string | null;
    volumeType: VolumeAwarenessType;
  }>;
  rootSummaries: FileRootSummary[];
  largestFiles: Array<{
    path: string;
    sizeBytes: number | null;
    modifiedAt: string | null;
    category: string | null;
    mediaKind: FileMediaKind | null;
  }>;
  recentChanges: FileChangeSummaryItem[];
  hotFolders: Array<{
    path: string;
    totalSizeBytes: number;
    recentChangeCount: number;
    hotScore: number;
  }>;
  blockedScopes: PrivacyScope[];
  monitor: VolumeMonitorState | null;
}

export interface FileAwarenessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  volumes: VolumeAwarenessSnapshot[];
  journalCursors: FileJournalCursor[];
  monitor: VolumeMonitorState | null;
  roots: FileRootSnapshot[];
  files: FileCatalogEntry[];
  folders: FileFolderSummary[];
  media: MediaCatalogEntry[];
  changes: FileChangeEntry[];
  summary: FileAwarenessSummary;
  fingerprint: string;
  isTruncated: boolean;
}

export interface FileContentSlice {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  truncated: boolean;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
  mimeType: string | null;
  contentHint: string | null;
}

export interface SessionBaseline {
  sessionId: string;
  appStartedAt: string;
  capturedAt: string;
  awarenessMode: AwarenessMode;
  permissionTier: PermissionTier;
  privacyScope: PrivacyScope;
  previousSessionId: string | null;
  previousSessionRestored: boolean;
  workspaceRoot: string;
  runtimeRoot: string;
  currentSessionPath: string;
  previousSessionPath: string;
  lastReportedBaselinePath: string;
  latestDigestPath: string;
  eventsPath: string;
}

export interface LastReportedBaseline {
  sessionId: string;
  reportedAt: string;
  baselineFingerprint: string;
  repoFingerprint: string;
  machineFingerprint: string;
  sessionFingerprint: string;
  digestId: string;
  baselinePath: string;
  digestPath: string;
}

export interface UpdateCorrelationSummary {
  capturedAt: string;
  freshness: FreshnessMetadata;
  currentBuild: string | null;
  releaseChannel: string | null;
  recentUpdates: Array<{
    kb: string | null;
    title: string;
    installedAt: string | null;
  }>;
  knownIssueMatches: string[];
  whatsNewHighlights: string[];
}

export interface AwarenessEvent {
  id: string;
  timestamp: string;
  type: AwarenessEventType;
  source: string;
  sessionId: string;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  confidence?: number;
  privacyScope?: PrivacyScope;
  permissionTier?: PermissionTier;
  message?: string;
  details?: Record<string, unknown>;
}

export interface AwarenessDigest {
  id: string;
  baselineFingerprint: string;
  sessionId: string;
  generatedAt: string;
  awarenessMode: AwarenessMode;
  permissionTier: PermissionTier;
  privacyScope: PrivacyScope;
  freshness: FreshnessMetadata;
  includeInContext: boolean;
  includeReason: AwarenessContextReason;
  relevanceSignals: string[];
  blockedScopes: PrivacyScope[];
  summary: string;
  repo: {
    branch: string | null;
    headSha: string | null;
    dirtyState: RepoState;
    recentCommits: RepoCommitSummary[];
    workingTree: RepoWorkingTreeSummary;
    watchedRoots: string[];
    ignoredRoots: string[];
    activeFeatureFlags: string[];
  };
  machine: {
    machineName: string;
    osVersion: string;
    osBuild: string;
    timezone: string;
  };
  session: {
    appStartedAt: string;
    previousSessionRestored: boolean;
  };
  lastReportedBaseline: LastReportedBaseline | null;
  startupDigest?: AwarenessStartupDigest | null;
  fileAwareness?: FileAwarenessSummary | null;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
}

export const AWARENESS_INTENT_FAMILIES = [
  "repo-change",
  "file-folder-media",
  "process-service-startup",
  "settings-control-panel",
  "registry",
  "live-usage",
  "hardware",
  "resource-hotspot",
  "performance-diagnostic",
  "on-screen"
] as const;

export type AwarenessIntentFamily = (typeof AWARENESS_INTENT_FAMILIES)[number];

export const AWARENESS_SUMMARY_SCOPES = [
  "session",
  "previous-session",
  "last-report",
  "current-machine"
] as const;

export type AwarenessSummaryScope = (typeof AWARENESS_SUMMARY_SCOPES)[number];

export const AWARENESS_QUERY_SCOPES = [...AWARENESS_SUMMARY_SCOPES, "current-ui"] as const;

export type AwarenessQueryScope = (typeof AWARENESS_QUERY_SCOPES)[number];

export const AWARENESS_SUMMARY_MODES = ["short", "medium", "detailed"] as const;

export type AwarenessSummaryMode = (typeof AWARENESS_SUMMARY_MODES)[number];

export const AWARENESS_ANSWER_MODES = ["evidence-first", "llm-primary"] as const;

export type AwarenessAnswerMode = (typeof AWARENESS_ANSWER_MODES)[number];

export const AWARENESS_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type AwarenessConfidenceLevel = (typeof AWARENESS_CONFIDENCE_LEVELS)[number];

export const AWARENESS_GROUNDING_STATUSES = ["grounded", "partial", "weak"] as const;

export type AwarenessGroundingStatus = (typeof AWARENESS_GROUNDING_STATUSES)[number];

export interface AwarenessIntentRoute {
  family: AwarenessIntentFamily;
  label: string;
  confidence: number;
  signals: string[];
  targetAreas: AwarenessArea[];
}

export interface AwarenessIntentPlan {
  primary: AwarenessIntentRoute;
  secondary: AwarenessIntentRoute[];
}

export interface AwarenessConversationContext {
  recentUserMessages: string[];
  lastAwarenessIntentFamily?: AwarenessIntentFamily | null;
}

export interface AwarenessQueryClarification {
  question: string;
  options: string[];
}

export interface AwarenessEvidenceBundle {
  verifiedFindings: string[];
  officialVerified: string[];
  likelyInterpretation: string[];
  inferredFindings: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction: string | null;
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  groundingStatus: AwarenessGroundingStatus;
  evidenceTraceIds: string[];
  freshness: FreshnessMetadata;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  compactSummary: string;
  resourceHotspots?: AwarenessResourceHotspotEntry[];
  recurringPatterns?: AwarenessRecurringPattern[];
  screenDiff?: ScreenDiffSummary | null;
  correlationHighlights?: string[];
  officialEvidence?: OfficialKnowledgeHit[];
}

export interface AwarenessQueryExecutionHints {
  force?: boolean;
  strictGrounding?: boolean;
  maxScanMs?: number;
  officialKnowledgePolicy?: OfficialKnowledgePolicy;
  allowOfficialWindowsKnowledge?: boolean;
  windowsVersionHint?: string;
}

export interface AwarenessQueryAnswer {
  id: string;
  query: string;
  generatedAt: string;
  intent: AwarenessIntentRoute;
  intentPlan?: AwarenessIntentPlan | null;
  scope: AwarenessQueryScope;
  mode: AwarenessSummaryMode;
  answerMode?: AwarenessAnswerMode;
  strictGrounding?: boolean;
  scanTimedOut?: boolean;
  scanTargets?: string[];
  includeInContext: boolean;
  summary: string;
  bundle: AwarenessEvidenceBundle;
  officialSources?: OfficialKnowledgeSource[];
  officialEvidence?: OfficialKnowledgeHit[];
  versionMatched?: boolean;
  officialKnowledgeUsed?: boolean;
  clarification?: AwarenessQueryClarification | null;
  card?: AwarenessAnswerCard | null;
}

export interface AwarenessQueryRequest {
  query: string;
  scope?: AwarenessQueryScope;
  mode?: AwarenessSummaryMode;
  awarenessAnswerMode?: AwarenessAnswerMode;
  hints?: AwarenessQueryExecutionHints;
  refresh?: boolean;
  conversationContext?: AwarenessConversationContext | null;
  officialKnowledgePolicy?: OfficialKnowledgePolicy;
  allowOfficialWindowsKnowledge?: boolean;
  windowsVersionHint?: string;
}

export interface AwarenessScopeSummary {
  scope: AwarenessSummaryScope;
  mode: AwarenessSummaryMode;
  generatedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction: string | null;
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
}

export interface AwarenessPerformanceHotspot {
  processName: string;
  pid: number | null;
  memoryBytes: number | null;
  cpuSeconds: number | null;
  linkedServices: string[];
}

export interface AwarenessPerformanceDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  topProcesses: AwarenessPerformanceHotspot[];
  serviceHotspots: Array<{
    serviceName: string;
    displayName: string;
    state: string;
    startupType: string;
    linkedProcessId: number | null;
    matchReason: string | null;
  }>;
}

export interface AwarenessStartupDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  startupEntries: Array<{
    name: string;
    source: StartupEntrySource;
    location: string;
    command: string | null;
    target: string | null;
    linkedAppName: string | null;
  }>;
}

export interface AwarenessStorageDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  topFiles: Array<{
    path: string;
    sizeBytes: number | null;
    category: string | null;
    mediaKind: FileMediaKind | null;
  }>;
  hotFolders: Array<{
    path: string;
    totalSizeBytes: number;
    recentChangeCount: number;
    hotScore: number;
  }>;
}

export interface AwarenessEventLogDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  windowStartAt: string;
  windowEndAt: string;
  counts: MachineEventLogCounts;
  topProviders: Array<{
    provider: string;
    totalCount: number;
    errorCount: number;
  }>;
  recentEntries: MachineEventLogEntry[];
}

export const MACHINE_ANOMALY_SEVERITIES = ["low", "medium", "high"] as const;

export type MachineAnomalySeverity = (typeof MACHINE_ANOMALY_SEVERITIES)[number];

export interface MachineAnomalyFinding {
  id: string;
  category: string;
  severity: MachineAnomalySeverity;
  title: string;
  evidence: string[];
  confidence: number;
}

export interface AwarenessAnomalyDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  findings: MachineAnomalyFinding[];
}

export interface AwarenessCurrentUiDiagnostic {
  capturedAt: string;
  freshness: FreshnessMetadata;
  summary: string;
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  activeWindow: ForegroundWindowSnapshot | null;
  visibleControls: string[];
  hoveredTarget: string | null;
  focusedTarget: string | null;
  blockedInputs: string[];
}
