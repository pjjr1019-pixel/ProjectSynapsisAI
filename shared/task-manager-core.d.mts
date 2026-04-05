export interface TaskManagerProcessRow {
  processName: string;
  pid: number;
  parentPid?: number | null;
  cpuSeconds: number;
  cpuPercentHint: number;
  gpuPercent: number;
  gpuDedicatedBytes: number;
  gpuSharedBytes: number;
  workingSetBytes: number;
  privateBytes: number;
  sessionId: number | null;
  path: string | null;
  mainWindowTitle: string | null;
  responding: boolean | null;
  startTime: string | null;
}

export interface TaskManagerSnapshot {
  capturedAt: string;
  logicalCpuCount: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  totalVramBytes?: number | null;
  usedVramBytes?: number | null;
  diskBytesPerSecond?: number | null;
  totalCpuPercentHint: number;
  totalGpuPercentHint: number;
  platform: string;
  appProcessPids?: number[];
  processes: TaskManagerProcessRow[];
}

export interface TaskManagerPrefs {
  monitoringEnabled: boolean;
  ignoredFingerprints: string[];
  keepFingerprints: string[];
  snoozedUntil: Record<string, number>;
  showProtected: boolean;
}

export interface TaskManagerProcessView extends TaskManagerProcessRow {
  cpuPercent: number;
  protectionReasons: string[];
  isProtected: boolean;
}

export interface TaskManagerRecommendation {
  groupId: string;
  severity: "medium" | "high";
  title: string;
  reason: string;
  actionLabel: string;
  estimatedReliefCpuPercent: number;
  estimatedReliefBytes: number;
  tone: "close_if_unused" | "background_cleanup";
}

export interface TaskManagerHistory {
  visibleCpuHighCount: number;
  visibleMemoryHighCount: number;
  backgroundCpuHighCount: number;
  backgroundMemoryHighCount: number;
  backgroundComboHighCount: number;
}

export interface TaskManagerGroup {
  groupId: string;
  fingerprint: string;
  displayName: string;
  processName: string;
  sessionId: number | null;
  path: string | null;
  mainWindowTitle: string | null;
  hasVisibleWindow: boolean;
  hasAnyWindow: boolean;
  isHelperLike: boolean;
  isProtected: boolean;
  protectionReasons: string[];
  instanceCount: number;
  pids: number[];
  totalCpuPercent: number;
  totalGpuPercent: number;
  totalWorkingSetBytes: number;
  totalPrivateBytes: number;
  totalGpuDedicatedBytes: number;
  totalGpuSharedBytes: number;
  totalGpuMemoryBytes: number;
  processRows: TaskManagerProcessView[];
  suppressionState: "active" | "kept" | "ignored" | "snoozed";
  history: TaskManagerHistory;
  isHeavy: boolean;
  recommendation: TaskManagerRecommendation | null;
}

export interface TaskManagerRecommendationView extends TaskManagerRecommendation {
  group: TaskManagerGroup;
}

export interface TaskManagerView {
  snapshot: TaskManagerSnapshot;
  groups: TaskManagerGroup[];
  visibleGroups: TaskManagerGroup[];
  recommendations: TaskManagerRecommendationView[];
  heavyGroupCount: number;
  actionableGroupCount: number;
  totalCpuPercent: number;
  totalGpuPercent: number;
  totalPrivateBytes: number;
  totalWorkingSetBytes: number;
  totalGpuDedicatedBytes: number;
  totalGpuSharedBytes: number;
  totalGpuMemoryBytes: number;
  usedMemoryBytes: number;
  memoryUsedRatio: number;
  cpuPressure: "low" | "moderate" | "high";
  gpuPressure: "low" | "moderate" | "high";
  memoryPressure: "low" | "moderate" | "high";
  nextHistoryByFingerprint: Record<string, TaskManagerHistory>;
}

export const TASK_MANAGER_POLL_VISIBLE_MS: number;
export const TASK_MANAGER_POLL_BACKGROUND_MS: number;
export const TASK_MANAGER_SNOOZE_MS: number;
export const PROTECTED_PROCESS_NAMES: readonly string[];
export const SECURITY_PROCESS_NAMES: readonly string[];
export const TOOLING_PROCESS_NAMES: readonly string[];
export const HELPER_KEYWORDS: readonly string[];

export function getProtectionReasons(
  row: Partial<TaskManagerProcessRow> & { pid?: number; processName?: string },
  opts?: { protectedPids?: number[] }
): string[];

export function buildTaskManagerView(
  snapshot: Partial<TaskManagerSnapshot> | null | undefined,
  previousSnapshot: Partial<TaskManagerSnapshot> | null | undefined,
  prefs?: Partial<TaskManagerPrefs>,
  opts?: {
    now?: number;
    protectedPids?: number[];
    historyByFingerprint?: Record<string, TaskManagerHistory>;
  }
): TaskManagerView;
