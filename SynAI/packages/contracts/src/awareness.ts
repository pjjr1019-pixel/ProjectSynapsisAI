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

export const EVIDENCE_REF_KINDS = ["file", "git", "session", "digest", "event", "api", "window", "ui-tree", "screen", "display"] as const;

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

export interface FreshnessMetadata {
  capturedAt: string;
  generatedAt: string;
  observedAt: string;
  ageMs: number;
  staleAfterMs: number;
  isFresh: boolean;
}

export interface RepoCommitSummary {
  sha: string;
  shortSha: string;
  subject: string;
  authoredAt: string;
}

export interface RepoBaseline {
  repoRoot: string;
  branch: string | null;
  headSha: string | null;
  dirtyState: RepoState;
  dirty: boolean | null;
  recentCommits: RepoCommitSummary[];
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
  memoryBytes: number | null;
  ioReadBytes: number | null;
  ioWriteBytes: number | null;
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
  settings: number;
  controlPanels: number;
  registryZones: number;
}

export interface MachineAwarenessHighlights {
  processes: string[];
  services: string[];
  startup: string[];
  installedApps: string[];
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
}

export interface MachineAwarenessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
  systemIdentity: SystemIdentity;
  processSnapshot: ProcessSnapshot;
  serviceSnapshot: ServiceSnapshot;
  startupSnapshot: StartupSnapshot;
  installedAppsSnapshot: InstalledAppsSnapshot;
  settingsMap: SettingsMap;
  controlPanelMap: ControlPanelMap;
  registryZoneMap: RegistryZoneMap;
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

export const FILE_ROOT_SOURCES = ["default", "workspace", "user"] as const;

export type FileRootSource = (typeof FILE_ROOT_SOURCES)[number];

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

export interface FileAwarenessCounts {
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
}

export interface FileAwarenessSnapshot {
  capturedAt: string;
  freshness: FreshnessMetadata;
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
  "hardware",
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

export const AWARENESS_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type AwarenessConfidenceLevel = (typeof AWARENESS_CONFIDENCE_LEVELS)[number];

export interface AwarenessIntentRoute {
  family: AwarenessIntentFamily;
  label: string;
  confidence: number;
  signals: string[];
  targetAreas: AwarenessArea[];
}

export interface AwarenessEvidenceBundle {
  verifiedFindings: string[];
  likelyInterpretation: string[];
  uncertainty: string[];
  suggestedNextChecks: string[];
  safeNextAction: string | null;
  confidence: number;
  confidenceLevel: AwarenessConfidenceLevel;
  freshness: FreshnessMetadata;
  evidenceRefs: EvidenceRef[];
  affectedAreas: AwarenessArea[];
  compactSummary: string;
}

export interface AwarenessQueryAnswer {
  id: string;
  query: string;
  generatedAt: string;
  intent: AwarenessIntentRoute;
  scope: AwarenessQueryScope;
  mode: AwarenessSummaryMode;
  includeInContext: boolean;
  summary: string;
  bundle: AwarenessEvidenceBundle;
}

export interface AwarenessQueryRequest {
  query: string;
  scope?: AwarenessQueryScope;
  mode?: AwarenessSummaryMode;
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
