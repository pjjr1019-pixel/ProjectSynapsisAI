import type {
  AwarenessRecurringPattern,
  AwarenessStartupDigest,
  FileAwarenessSummary,
  MachineAwarenessSnapshot,
  MachineMetricSample,
  MachineMetricTrend,
  MachineRollingMetrics,
  RepoBaseline,
  ScreenAwarenessSnapshot,
  SessionBaseline
} from "../contracts/awareness";
import { createFreshnessMetadata } from "../context";

const MAX_METRIC_SAMPLES = 24;
const ROLLING_WINDOW_MINUTES = 10;

export interface RuntimeInsightView {
  session: SessionBaseline;
  repo: RepoBaseline;
  machineAwareness: MachineAwarenessSnapshot;
  fileAwareness: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessSnapshot | null;
}

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
};

const summarizeTrend = (
  label: string,
  previous: number | null,
  current: number | null
): MachineMetricTrend => {
  if (previous == null || current == null) {
    return {
      direction: "stable",
      changePercent: null,
      summary: `${label} trend unavailable`
    };
  }

  const delta = current - previous;
  const baseline = Math.max(Math.abs(previous), 1);
  const changePercent = clamp(Math.abs(delta) / baseline, 0, 5);

  if (Math.abs(delta) < Math.max(1, baseline * 0.05)) {
    return {
      direction: "stable",
      changePercent,
      summary: `${label} stable`
    };
  }

  return {
    direction: delta > 0 ? "rising" : "falling",
    changePercent,
    summary: `${label} ${delta > 0 ? "rising" : "falling"}`
  };
};

const formatPercent = (value: number | null | undefined): string =>
  value == null ? "n/a" : `${Math.round(value)}%`;

const topBy = <T>(items: T[], read: (item: T) => number | null | undefined): T | null => {
  const sorted = [...items]
    .map((item) => ({ item, value: read(item) ?? -1 }))
    .filter((entry) => entry.value >= 0)
    .sort((left, right) => right.value - left.value);

  return sorted[0]?.item ?? null;
};

const buildMetricSample = (snapshot: MachineAwarenessSnapshot): MachineMetricSample => {
  const hardware = snapshot.systemIdentity.hardware;
  const ramUsedBytes =
    hardware.memory.totalBytes > 0 && hardware.memory.availableBytes != null
      ? Math.max(0, hardware.memory.totalBytes - hardware.memory.availableBytes)
      : null;
  const topRamProcess = topBy(snapshot.processSnapshot.processes, (process) => process.memoryBytes);
  const topCpuProcess = topBy(snapshot.processSnapshot.processes, (process) => process.cpuPercent ?? process.cpuSeconds);
  const topDiskProcess = topBy(
    snapshot.processSnapshot.processes,
    (process) => (process.ioReadBytesPerSec ?? 0) + (process.ioWriteBytesPerSec ?? 0) || (process.ioReadBytes ?? 0) + (process.ioWriteBytes ?? 0)
  );
  const primaryDrive =
    hardware.drives.find((drive) => drive.deviceId?.toUpperCase().startsWith("C:")) ?? hardware.drives[0] ?? null;
  const primaryGpu = topBy(hardware.gpus, (gpu) => gpu.loadPercent ?? null);

  return {
    capturedAt: snapshot.capturedAt,
    cpuLoadPercent: hardware.cpuLoadPercent ?? null,
    ramUsedBytes,
    ramAvailableBytes: hardware.memory.availableBytes ?? null,
    gpuLoadPercent: primaryGpu?.loadPercent ?? null,
    vramUsedBytes: null,
    diskFreeBytes: primaryDrive?.freeBytes ?? null,
    diskTotalBytes: primaryDrive?.totalBytes ?? null,
    topRamProcess: topRamProcess ? `${topRamProcess.name}#${topRamProcess.pid}` : null,
    topCpuProcess: topCpuProcess ? `${topCpuProcess.name}#${topCpuProcess.pid}` : null,
    topDiskProcess: topDiskProcess ? `${topDiskProcess.name}#${topDiskProcess.pid}` : null
  };
};

export const updateRollingMetrics = (
  current: MachineRollingMetrics | null | undefined,
  snapshot: MachineAwarenessSnapshot,
  now = new Date()
): MachineRollingMetrics => {
  const sample = buildMetricSample(snapshot);
  const previousSamples = current?.samples ?? [];
  const deduped = previousSamples.filter((entry) => entry.capturedAt !== sample.capturedAt);
  const samples = [...deduped, sample].slice(-MAX_METRIC_SAMPLES);
  const baseline = samples[Math.max(0, samples.length - 5)] ?? samples[0] ?? sample;

  return {
    capturedAt: sample.capturedAt,
    freshness: createFreshnessMetadata(sample.capturedAt, sample.capturedAt, now),
    windowMinutes: ROLLING_WINDOW_MINUTES,
    samples,
    cpuTrend: summarizeTrend("CPU", baseline.cpuLoadPercent, sample.cpuLoadPercent),
    ramTrend: summarizeTrend("RAM", baseline.ramUsedBytes, sample.ramUsedBytes),
    gpuTrend: summarizeTrend("GPU", baseline.gpuLoadPercent, sample.gpuLoadPercent)
  };
};

const sameProcess = (
  left: MachineAwarenessSnapshot | null | undefined,
  right: MachineAwarenessSnapshot | null | undefined,
  read: (snapshot: MachineAwarenessSnapshot) => string | null
): string | null => {
  if (!left || !right) {
    return null;
  }

  const leftValue = read(left);
  const rightValue = read(right);
  return leftValue && leftValue === rightValue ? leftValue : null;
};

const topProcessName = (
  snapshot: MachineAwarenessSnapshot | null | undefined,
  selector: "ram" | "cpu"
): string | null => {
  if (!snapshot) {
    return null;
  }

  const process =
    selector === "ram"
      ? topBy(snapshot.processSnapshot.processes, (entry) => entry.memoryBytes)
      : topBy(snapshot.processSnapshot.processes, (entry) => entry.cpuPercent ?? entry.cpuSeconds);

  return process ? `${process.name}#${process.pid}` : null;
};

const topEventProvider = (snapshot: MachineAwarenessSnapshot | null | undefined): string | null => {
  if (!snapshot) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const entry of snapshot.eventLogSnapshot.entries) {
    const provider = entry.provider?.trim();
    if (!provider || (entry.level !== "critical" && entry.level !== "error")) {
      continue;
    }
    counts.set(provider, (counts.get(provider) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
};

const overlapRatio = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  const shared = left.filter((value) => rightSet.has(value));
  return shared.length / Math.max(left.length, right.length);
};

export const buildRecurringPatterns = (input: {
  current: RuntimeInsightView;
  previous?: RuntimeInsightView | null;
  lastReport?: RuntimeInsightView | null;
  now?: Date;
}): AwarenessRecurringPattern[] => {
  const now = input.now ?? new Date();
  const patterns: AwarenessRecurringPattern[] = [];
  const previous = input.previous?.machineAwareness ?? input.lastReport?.machineAwareness ?? null;

  const repeatedRam = sameProcess(
    input.current.machineAwareness,
    previous,
    (snapshot) => topProcessName(snapshot, "ram")
  );
  if (repeatedRam) {
    patterns.push({
      id: `pattern:ram:${repeatedRam}`,
      category: "resource",
      title: `${repeatedRam} is a recurring RAM hotspot`,
      summary: `${repeatedRam} remained the top memory consumer across snapshots.`,
      firstObservedAt: previous?.capturedAt ?? input.current.machineAwareness.capturedAt,
      lastObservedAt: input.current.machineAwareness.capturedAt,
      confidence: 0.82,
      evidence: [repeatedRam]
    });
  }

  const repeatedCpu = sameProcess(
    input.current.machineAwareness,
    previous,
    (snapshot) => topProcessName(snapshot, "cpu")
  );
  if (repeatedCpu && repeatedCpu !== repeatedRam) {
    patterns.push({
      id: `pattern:cpu:${repeatedCpu}`,
      category: "performance",
      title: `${repeatedCpu} is a recurring CPU hotspot`,
      summary: `${repeatedCpu} stayed near the top of CPU activity across snapshots.`,
      firstObservedAt: previous?.capturedAt ?? input.current.machineAwareness.capturedAt,
      lastObservedAt: input.current.machineAwareness.capturedAt,
      confidence: 0.76,
      evidence: [repeatedCpu]
    });
  }

  const repeatedProvider = sameProcess(
    input.current.machineAwareness,
    previous,
    (snapshot) => topEventProvider(snapshot)
  );
  if (repeatedProvider) {
    patterns.push({
      id: `pattern:event:${repeatedProvider}`,
      category: "event-log",
      title: `${repeatedProvider} keeps appearing in recent error logs`,
      summary: `The same error provider showed up across snapshots, which suggests a recurring issue.`,
      firstObservedAt: previous?.capturedAt ?? input.current.machineAwareness.capturedAt,
      lastObservedAt: input.current.machineAwareness.capturedAt,
      confidence: 0.7,
      evidence: [repeatedProvider]
    });
  }

  const currentStartup = uniqueStrings(
    [
      ...input.current.machineAwareness.startupSnapshot.folderEntries.map((entry) => entry.name),
      ...input.current.machineAwareness.startupSnapshot.registryEntries.map((entry) => entry.name),
      ...input.current.machineAwareness.startupSnapshot.scheduledTaskEntries.map((entry) => entry.name)
    ]
  );
  const previousStartup = previous
    ? uniqueStrings([
        ...previous.startupSnapshot.folderEntries.map((entry) => entry.name),
        ...previous.startupSnapshot.registryEntries.map((entry) => entry.name),
        ...previous.startupSnapshot.scheduledTaskEntries.map((entry) => entry.name)
      ])
    : [];
  const startupOverlap = overlapRatio(currentStartup, previousStartup);
  if (startupOverlap >= 0.5 && currentStartup.length > 0) {
    patterns.push({
      id: "pattern:startup:stable",
      category: "startup",
      title: "Startup set is broadly stable",
      summary: `${Math.round(startupOverlap * 100)}% of startup entries matched the previous snapshot.`,
      firstObservedAt: previous?.capturedAt ?? input.current.machineAwareness.capturedAt,
      lastObservedAt: now.toISOString(),
      confidence: 0.66,
      evidence: currentStartup.slice(0, 4)
    });
  }

  return patterns.slice(0, 5);
};

const buildRepoDeltaHighlight = (current: RepoBaseline, previous?: RepoBaseline | null): string | null => {
  if (!previous) {
    return current.recentCommits[0]?.subject
      ? `Latest repo change: ${current.recentCommits[0].subject}`
      : `Repo is on ${current.branch ?? "no-git"} (${current.dirtyState})`;
  }

  if (current.headSha && previous.headSha && current.headSha !== previous.headSha) {
    return `Repo head moved from ${previous.headSha.slice(0, 8)} to ${current.headSha.slice(0, 8)} on ${current.branch ?? "the current branch"}.`;
  }

  if (current.workingTree.totalCount !== previous.workingTree.totalCount) {
    return `Working tree changed from ${previous.workingTree.totalCount} to ${current.workingTree.totalCount} tracked entries.`;
  }

  return null;
};

const buildUpdateHighlight = (snapshot: MachineAwarenessSnapshot): string | null => {
  const updateCorrelation = snapshot.updateCorrelation;
  if (!updateCorrelation) {
    return null;
  }

  const latestUpdate = updateCorrelation.recentUpdates[0];
  if (latestUpdate) {
    return latestUpdate.kb
      ? `Latest Windows update: ${latestUpdate.kb} (${latestUpdate.title})`
      : `Latest Windows update: ${latestUpdate.title}`;
  }

  if (updateCorrelation.currentBuild) {
    return `Windows build: ${updateCorrelation.currentBuild}`;
  }

  return null;
};

export const buildStartupDigest = (input: {
  current: RuntimeInsightView;
  previous?: RuntimeInsightView | null;
  lastReport?: RuntimeInsightView | null;
  patterns?: AwarenessRecurringPattern[];
  now?: Date;
}): AwarenessStartupDigest => {
  const now = input.now ?? new Date();
  const previous = input.previous ?? input.lastReport ?? null;
  const patterns = input.patterns ?? [];
  const rolling = input.current.machineAwareness.rollingMetrics;
  const topRamProcess = topProcessName(input.current.machineAwareness, "ram");
  const topCpuProcess = topProcessName(input.current.machineAwareness, "cpu");
  const highlights = uniqueStrings([
    buildRepoDeltaHighlight(input.current.repo, previous?.repo),
    buildUpdateHighlight(input.current.machineAwareness),
    topRamProcess ? `Top RAM process: ${topRamProcess}` : null,
    topCpuProcess ? `Top CPU process: ${topCpuProcess}` : null,
    rolling?.cpuTrend.summary,
    rolling?.ramTrend.summary,
    input.current.fileAwareness ? `Tracked files: ${input.current.fileAwareness.summary}` : null,
    input.current.screenAwareness?.summary.diff?.changed ? input.current.screenAwareness.summary.diff.summary : null
  ]).slice(0, 5);

  const whyItMatters = uniqueStrings([
    patterns[0]?.summary,
    input.current.repo.workingTree.totalCount > 0
      ? `You have ${input.current.repo.workingTree.totalCount} uncommitted working-tree changes.`
      : null,
    input.current.machineAwareness.summary.counts.eventLogErrors > 0
      ? `${input.current.machineAwareness.summary.counts.eventLogErrors} recent machine errors were captured.`
      : null,
    input.current.machineAwareness.updateCorrelation?.knownIssueMatches.length
      ? `${input.current.machineAwareness.updateCorrelation.knownIssueMatches.length} Microsoft-known issue notes matched the current Windows context.`
      : null,
    input.current.machineAwareness.summary.counts.startupEntries > 0
      ? `${input.current.machineAwareness.summary.counts.startupEntries} startup entries are part of the current machine baseline.`
      : null
  ]).slice(0, 4);

  const recurringPatternSummaries = patterns.map((pattern) => pattern.title).slice(0, 4);
  const summary =
    highlights[0] ??
    whyItMatters[0] ??
    `Awareness startup digest ready for ${input.current.machineAwareness.summary.machineName}.`;

  return {
    generatedAt: now.toISOString(),
    freshness: createFreshnessMetadata(now.toISOString(), now.toISOString(), now),
    title: previous ? "What's new since your last run" : "Startup awareness ready",
    summary,
    highlights,
    whyItMatters,
    recurringPatterns: recurringPatternSummaries,
    safeNextAction:
      input.current.repo.workingTree.totalCount > 0
        ? "Review the current repo and hotspot deltas."
        : "Ask what changed, what is using resources, or what stands out."
  };
};

export const buildRollingMetricsSummaryLines = (
  rollingMetrics: MachineRollingMetrics | null | undefined
): string[] => {
  if (!rollingMetrics) {
    return [];
  }

  const latest = rollingMetrics.samples.at(-1);
  if (!latest) {
    return [];
  }

  return [
    `CPU ${formatPercent(latest.cpuLoadPercent)} (${rollingMetrics.cpuTrend.summary})`,
    latest.ramUsedBytes != null && latest.ramAvailableBytes != null
      ? `RAM ${(latest.ramUsedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB used / ${(latest.ramAvailableBytes / (1024 * 1024 * 1024)).toFixed(1)}GB free (${rollingMetrics.ramTrend.summary})`
      : null,
    latest.gpuLoadPercent != null ? `GPU ${formatPercent(latest.gpuLoadPercent)} (${rollingMetrics.gpuTrend.summary})` : null,
    latest.topRamProcess ? `Top RAM process ${latest.topRamProcess}` : null
  ].filter((value): value is string => Boolean(value));
};

