import type {
  AwarenessMode,
  ControlPanelEntry,
  ControlPanelMap,
  InstalledAppsSnapshot,
  MachineAwarenessCounts,
  MachineAwarenessHighlights,
  MachineAwarenessSnapshot,
  MachineAwarenessSummary,
  ProcessEntry,
  ProcessSnapshot,
  RegistryZoneEntry,
  RegistryZoneMap,
  ServiceEntry,
  ServiceSnapshot,
  SettingsMap,
  StartupEntry,
  StartupSnapshot,
  SystemIdentity
} from "../../../contracts/src/awareness";
import { createFreshnessMetadata } from "../context";
import {
  buildControlPanelMap,
  buildRegistryZoneMap,
  buildSettingsMap,
  searchControlPanelEntries,
  searchRegistryZoneEntries,
  searchSettingsMapEntries,
  toControlPanelSummary,
  toMapSummary,
  toRegistryZoneSummary
} from "./maps";
import { createWindowsMachineInventorySource } from "./windows";

export interface MachineInventorySource {
  captureSystemIdentity(): Promise<SystemIdentity> | SystemIdentity;
  captureProcesses(): Promise<ProcessSnapshot> | ProcessSnapshot;
  captureServices(): Promise<ServiceSnapshot> | ServiceSnapshot;
  captureStartup(): Promise<StartupSnapshot> | StartupSnapshot;
  captureInstalledApps(): Promise<InstalledAppsSnapshot> | InstalledAppsSnapshot;
}

export interface MachineCaptureOptions {
  now?: () => Date;
  source?: MachineInventorySource;
  maxProcesses?: number;
  maxServices?: number;
  maxStartupEntries?: number;
  maxInstalledApps?: number;
}

const DEFAULT_MAX_PROCESSES = 150;
const DEFAULT_MAX_SERVICES = 150;
const DEFAULT_MAX_STARTUP_ENTRIES = 100;
const DEFAULT_MAX_INSTALLED_APPS = 150;
const MAX_CONTEXT_LIST_ITEMS = 6;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ensureArray = <T>(value: T[] | T | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
};

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const compactJoin = (values: Array<string | null | undefined>, limit = MAX_CONTEXT_LIST_ITEMS): string =>
  values
    .filter((value): value is string => Boolean(value))
    .slice(0, limit)
    .join(", ");

const formatUptime = (uptimeSeconds: number): string => {
  const totalMinutes = Math.max(0, Math.floor(uptimeSeconds / 60));
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

const buildFreshness = (capturedAt: string, now: Date) => createFreshnessMetadata(capturedAt, capturedAt, now);

const sortProcesses = (processes: ProcessEntry[]): ProcessEntry[] =>
  [...processes].sort((a, b) => {
    const memoryDelta = (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0);
    if (memoryDelta !== 0) {
      return memoryDelta;
    }

    const cpuDelta = (b.cpuSeconds ?? 0) - (a.cpuSeconds ?? 0);
    if (cpuDelta !== 0) {
      return cpuDelta;
    }

    return a.name.localeCompare(b.name);
  });

const sortServices = (services: ServiceEntry[]): ServiceEntry[] =>
  [...services].sort((a, b) => {
    const runningDelta = Number(b.state.toLowerCase() === "running") - Number(a.state.toLowerCase() === "running");
    if (runningDelta !== 0) {
      return runningDelta;
    }

    const autoDelta = Number(b.startupType.toLowerCase() === "auto") - Number(a.startupType.toLowerCase() === "auto");
    if (autoDelta !== 0) {
      return autoDelta;
    }

    return a.displayName.localeCompare(b.displayName);
  });

const sortStartupEntries = (entries: StartupEntry[]): StartupEntry[] =>
  [...entries].sort((a, b) => {
    const sourceOrder: Record<StartupEntry["source"], number> = {
      "startup-folder": 0,
      run: 1,
      runonce: 2,
      "scheduled-task": 3,
      "launcher-hint": 4
    };
    const sourceDelta = sourceOrder[a.source] - sourceOrder[b.source];
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    return a.name.localeCompare(b.name);
  });

const sortApps = (apps: InstalledAppsSnapshot["apps"]): InstalledAppsSnapshot["apps"] =>
  [...apps].sort((a, b) => a.name.localeCompare(b.name));

const cloneSnapshot = <T extends object>(value: T): T => clone(value);

const matchTokens = (haystack: string, tokens: string[]): boolean => {
  const normalizedHaystack = normalizeText(haystack);
  return tokens.some((token) => normalizedHaystack.includes(normalizeText(token)));
};

const extractTokens = (...values: Array<string | null | undefined>): string[] =>
  values
    .flatMap((value) => (value ? normalizeText(value).split(/\s+/) : []))
    .filter((token) => token.length > 2);

const buildAssociatedStartups = (
  app: InstalledAppsSnapshot["apps"][number],
  startupEntries: StartupEntry[],
  processes: ProcessEntry[]
): string[] => {
  const tokens = extractTokens(app.name, app.publisher, app.installLocation, app.displayIcon);
  const matches: string[] = [];

  for (const entry of startupEntries) {
    const haystack = [entry.name, entry.command, entry.target, entry.location].filter(Boolean).join(" ");
    if (matchTokens(haystack, tokens)) {
      matches.push(`${entry.source}:${entry.name}`);
    }
  }

  for (const process of processes) {
    const haystack = [process.name, process.executablePath, process.commandLine, process.windowTitle]
      .filter(Boolean)
      .join(" ");
    if (matchTokens(haystack, tokens)) {
      matches.push(`process:${process.name}`);
    }
  }

  return [...new Set(matches)];
};

const enrichInstalledApps = (
  installedAppsSnapshot: InstalledAppsSnapshot,
  startupSnapshot: StartupSnapshot,
  processSnapshot: ProcessSnapshot
): InstalledAppsSnapshot => {
  const apps = installedAppsSnapshot.apps.map((app) => {
    const tokens = extractTokens(app.name, app.publisher, app.installLocation, app.uninstallCommand, app.displayIcon);
    const associatedProcesses = processSnapshot.processes.filter((process) =>
      matchTokens([process.name, process.executablePath, process.commandLine, process.windowTitle].filter(Boolean).join(" "), tokens)
    );
    const startupReferences = buildAssociatedStartups(
      app,
      [
        ...startupSnapshot.folderEntries,
        ...startupSnapshot.registryEntries,
        ...startupSnapshot.scheduledTaskEntries,
        ...startupSnapshot.launcherHints
      ],
      associatedProcesses
    );

    return {
      ...app,
      associatedProcessIds: [...new Set(associatedProcesses.map((process) => process.pid))],
      associatedProcessNames: [...new Set(associatedProcesses.map((process) => process.name))],
      startupReferences
    };
  });

  return {
    ...installedAppsSnapshot,
    apps
  };
};

const enrichStartup = (
  startupSnapshot: StartupSnapshot,
  processSnapshot: ProcessSnapshot,
  installedAppsSnapshot: InstalledAppsSnapshot
): StartupSnapshot => {
  const launcherHints = [
    ...startupSnapshot.folderEntries,
    ...startupSnapshot.registryEntries,
    ...startupSnapshot.scheduledTaskEntries
  ].map((entry) => {
    const tokens = extractTokens(entry.name, entry.command, entry.target, entry.location);
    const associatedProcess = processSnapshot.processes.find((process) =>
      matchTokens([process.name, process.executablePath, process.commandLine, process.windowTitle].filter(Boolean).join(" "), tokens)
    );
    const associatedApp = installedAppsSnapshot.apps.find((app) =>
      matchTokens([app.name, app.publisher, app.installLocation, app.uninstallCommand].filter(Boolean).join(" "), tokens)
    );

    return {
      ...entry,
      source: "launcher-hint" as const,
      processId: associatedProcess?.pid ?? entry.processId,
      linkedAppName: associatedApp?.name ?? entry.linkedAppName ?? entry.name
    };
  });

  return {
    ...startupSnapshot,
    launcherHints: [...startupSnapshot.launcherHints, ...launcherHints]
      .filter((entry, index, array) =>
        index ===
        array.findIndex(
          (candidate) =>
            candidate.name === entry.name &&
            candidate.location === entry.location &&
            candidate.source === entry.source
        )
      )
  };
};

export const createFixtureMachineInventorySource = (fixture: {
  systemIdentity: SystemIdentity;
  processes: ProcessSnapshot;
  services: ServiceSnapshot;
  startup: StartupSnapshot;
  installedApps: InstalledAppsSnapshot;
}): MachineInventorySource => ({
  captureSystemIdentity: async () => cloneSnapshot(fixture.systemIdentity),
  captureProcesses: async () => cloneSnapshot(fixture.processes),
  captureServices: async () => cloneSnapshot(fixture.services),
  captureStartup: async () => cloneSnapshot(fixture.startup),
  captureInstalledApps: async () => cloneSnapshot(fixture.installedApps)
});

const summarizeSettings = (settingsMap: SettingsMap): string[] =>
  settingsMap.entries.slice(0, MAX_CONTEXT_LIST_ITEMS).map(toMapSummary);

const summarizeControlPanels = (controlPanelMap: ControlPanelMap): string[] =>
  controlPanelMap.entries.slice(0, MAX_CONTEXT_LIST_ITEMS).map(toControlPanelSummary);

const summarizeRegistryZones = (registryZoneMap: RegistryZoneMap): string[] =>
  registryZoneMap.zones.slice(0, MAX_CONTEXT_LIST_ITEMS).map(toRegistryZoneSummary);

const summarizeProcesses = (processSnapshot: ProcessSnapshot): string[] =>
  sortProcesses(processSnapshot.processes)
    .slice(0, MAX_CONTEXT_LIST_ITEMS)
    .map((process) => {
      const memoryMb = process.memoryBytes ? Math.round(process.memoryBytes / (1024 * 1024)) : null;
      const cpuLabel = process.cpuSeconds != null ? `cpu ${process.cpuSeconds.toFixed(1)}s` : "cpu n/a";
      const memoryLabel = memoryMb != null ? `${memoryMb}MB` : "mem n/a";
      return `${process.name}#${process.pid} (${cpuLabel}, ${memoryLabel})`;
    });

const summarizeServices = (serviceSnapshot: ServiceSnapshot): string[] =>
  sortServices(serviceSnapshot.services)
    .slice(0, MAX_CONTEXT_LIST_ITEMS)
    .map((service) => `${service.serviceName} [${service.state}, ${service.startupType}]`);

const summarizeStartup = (startupSnapshot: StartupSnapshot): string[] =>
  sortStartupEntries([
    ...startupSnapshot.folderEntries,
    ...startupSnapshot.registryEntries,
    ...startupSnapshot.scheduledTaskEntries,
    ...startupSnapshot.launcherHints
  ])
    .filter((entry, index, array) =>
      index ===
      array.findIndex(
        (candidate) =>
          candidate.name === entry.name &&
          candidate.source === entry.source &&
          candidate.location === entry.location
      )
    )
    .slice(0, MAX_CONTEXT_LIST_ITEMS)
    .map((entry) => `${entry.name} (${entry.source})`);

const summarizeApps = (installedAppsSnapshot: InstalledAppsSnapshot): string[] =>
  sortApps(installedAppsSnapshot.apps)
    .slice(0, MAX_CONTEXT_LIST_ITEMS)
    .map((app) => app.name);

const buildHighlights = (snapshot: MachineAwarenessSnapshot): MachineAwarenessHighlights => ({
  processes: summarizeProcesses(snapshot.processSnapshot),
  services: summarizeServices(snapshot.serviceSnapshot),
  startup: summarizeStartup(snapshot.startupSnapshot),
  installedApps: summarizeApps(snapshot.installedAppsSnapshot),
  settings: summarizeSettings(snapshot.settingsMap),
  controlPanels: summarizeControlPanels(snapshot.controlPanelMap),
  registryZones: summarizeRegistryZones(snapshot.registryZoneMap)
});

const buildCounts = (snapshot: MachineAwarenessSnapshot): MachineAwarenessCounts => ({
  processes: snapshot.processSnapshot.totalCount,
  services: snapshot.serviceSnapshot.totalCount,
  startupEntries: snapshot.startupSnapshot.totalCount,
  installedApps: snapshot.installedAppsSnapshot.totalCount,
  settings: snapshot.settingsMap.entries.length,
  controlPanels: snapshot.controlPanelMap.entries.length,
  registryZones: snapshot.registryZoneMap.zones.length
});

export const buildMachineAwarenessSummary = (snapshot: MachineAwarenessSnapshot): MachineAwarenessSummary => {
  const counts = buildCounts(snapshot);
  const highlights = buildHighlights(snapshot);
  const system = snapshot.systemIdentity;
  const summary = [
    system.machineName,
    system.windowsEdition ?? system.windowsVersion ?? "Windows",
    system.architecture,
    `uptime ${formatUptime(system.uptimeSeconds)}`,
    `${counts.processes} processes`,
    `${counts.services} services`,
    `${counts.startupEntries} startup items`,
    `${counts.installedApps} apps`
  ].join(" | ");

  return {
    capturedAt: snapshot.capturedAt,
    freshness: snapshot.freshness,
    summary,
    machineName: system.machineName,
    currentUser: system.currentUser,
    windowsEdition: system.windowsEdition,
    windowsVersion: system.windowsVersion,
    windowsBuild: system.windowsBuild,
    architecture: system.architecture,
    timezone: system.timezone,
    uptimeSeconds: system.uptimeSeconds,
    counts,
    highlights
  };
};

const relevanceKeywords: Record<"process" | "service" | "startup" | "apps" | "settings" | "control" | "registry", string[]> = {
  process: ["process", "task manager", "running", "pid", "window title"],
  service: ["service", "services", "service manager", "startup type"],
  startup: ["startup", "boot", "login", "launch at sign in", "tray", "background launcher"],
  apps: ["app", "application", "installed", "software", "program", "uninstall"],
  settings: ["setting", "settings", "ms-settings", "display", "sound", "personalization", "taskbar", "bluetooth", "privacy", "battery"],
  control: ["control panel", "device manager", "task scheduler", "services.msc", "regedit", "computer management", "event viewer", "perfmon"],
  registry: ["registry", "run key", "uninstall key", "file association", "policy", "shell", "winlogon", "diagnostics"]
};

const queryIncludes = (query: string, keywords: string[]): boolean => {
  const normalized = normalizeText(query);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
};

const shouldIncludeMachineContext = (query: string, awarenessMode: AwarenessMode): boolean =>
  awarenessMode === "debug" ||
  queryIncludes(query, [
    "windows",
    "machine",
    "system",
    "computer",
    "pc",
    "what is running",
    "where is",
    "how do i change",
    "what registry",
    "what services",
    "what processes",
    "startup"
  ]) ||
  Object.values(relevanceKeywords).some((keywords) => queryIncludes(query, keywords));

const lookupSections = (snapshot: MachineAwarenessSnapshot, query: string): string[] => {
  const sections: string[] = [];

  if (queryIncludes(query, relevanceKeywords.process)) {
    sections.push(`Processes: ${compactJoin(snapshot.summary.highlights.processes)}`);
  }

  if (queryIncludes(query, relevanceKeywords.service)) {
    sections.push(`Services: ${compactJoin(snapshot.summary.highlights.services)}`);
  }

  if (queryIncludes(query, relevanceKeywords.startup)) {
    sections.push(`Startup: ${compactJoin(snapshot.summary.highlights.startup)}`);
  }

  if (queryIncludes(query, relevanceKeywords.apps)) {
    sections.push(`Installed apps: ${compactJoin(snapshot.summary.highlights.installedApps)}`);
  }

  if (queryIncludes(query, relevanceKeywords.settings)) {
    const matchedSettings = searchSettingsMapEntries(query, 4);
    const settingsSummary =
      matchedSettings.length > 0
        ? matchedSettings.map((entry) => `${entry.label} -> ${entry.launchTarget}`).join(" | ")
        : compactJoin(snapshot.summary.highlights.settings);
    sections.push(`Settings map: ${settingsSummary}`);
  }

  if (queryIncludes(query, relevanceKeywords.control)) {
    const matchedControlPanels = searchControlPanelEntries(query, 4);
    const controlSummary =
      matchedControlPanels.length > 0
        ? matchedControlPanels.map(toControlPanelSummary).join(" | ")
        : compactJoin(snapshot.summary.highlights.controlPanels);
    sections.push(`Control panels: ${controlSummary}`);
  }

  if (queryIncludes(query, relevanceKeywords.registry)) {
    const matchedZones = searchRegistryZoneEntries(query, 4);
    const registrySummary =
      matchedZones.length > 0
        ? matchedZones.map((entry) => `${entry.category}: ${entry.hive}${entry.path}`).join(" | ")
        : compactJoin(snapshot.summary.highlights.registryZones);
    sections.push(`Registry zones: ${registrySummary}`);
  }

  return sections;
};

export const buildMachineAwarenessContextSection = (
  snapshot: MachineAwarenessSnapshot | null | undefined,
  latestUserMessage: string,
  awarenessMode: AwarenessMode = "observe"
): string | null => {
  if (!snapshot || !shouldIncludeMachineContext(latestUserMessage, awarenessMode)) {
    return null;
  }

  const summary = snapshot.summary;
  const identity = snapshot.systemIdentity;
  const lines = [
    `Machine awareness: ${summary.summary}`,
    `Identity: ${identity.machineName} | ${identity.windowsEdition ?? identity.windowsVersion ?? "Windows"} | ${identity.timezone}`,
    `Counts: ${summary.counts.processes} processes, ${summary.counts.services} services, ${summary.counts.startupEntries} startup items, ${summary.counts.installedApps} apps`,
    ...lookupSections(snapshot, latestUserMessage)
  ].filter(Boolean);

  return lines.join("\n");
};

const trimContainer = <T>(entries: T[], limit: number): { entries: T[]; totalCount: number; isTruncated: boolean } => {
  const totalCount = entries.length;
  return {
    entries: entries.slice(0, limit),
    totalCount,
    isTruncated: totalCount > limit
  };
};

export const captureMachineAwarenessSnapshot = async (
  options: MachineCaptureOptions = {}
): Promise<MachineAwarenessSnapshot> => {
  const now = options.now ?? (() => new Date());
  const source = options.source ?? createWindowsMachineInventorySource();
  const [systemIdentity, processSnapshot, serviceSnapshot, startupSnapshot, installedAppsSnapshot] = await Promise.all([
    source.captureSystemIdentity(),
    source.captureProcesses(),
    source.captureServices(),
    source.captureStartup(),
    source.captureInstalledApps()
  ]);
  const observedAt = now();
  const capturedAt = observedAt.toISOString();
  const freshness = buildFreshness(capturedAt, observedAt);
  const trimmedProcesses = trimContainer(
    sortProcesses(cloneSnapshot(ensureArray(processSnapshot.processes))),
    options.maxProcesses ?? DEFAULT_MAX_PROCESSES
  );
  const trimmedServices = trimContainer(
    sortServices(cloneSnapshot(ensureArray(serviceSnapshot.services))),
    options.maxServices ?? DEFAULT_MAX_SERVICES
  );
  const trimmedFolderEntries = trimContainer(
    sortStartupEntries(cloneSnapshot(ensureArray(startupSnapshot.folderEntries))),
    options.maxStartupEntries ?? DEFAULT_MAX_STARTUP_ENTRIES
  );
  const trimmedRegistryEntries = trimContainer(
    sortStartupEntries(cloneSnapshot(ensureArray(startupSnapshot.registryEntries))),
    options.maxStartupEntries ?? DEFAULT_MAX_STARTUP_ENTRIES
  );
  const trimmedScheduledEntries = trimContainer(
    sortStartupEntries(cloneSnapshot(ensureArray(startupSnapshot.scheduledTaskEntries))),
    options.maxStartupEntries ?? DEFAULT_MAX_STARTUP_ENTRIES
  );
  const trimmedLauncherHints = trimContainer(
    sortStartupEntries(cloneSnapshot(ensureArray(startupSnapshot.launcherHints))),
    options.maxStartupEntries ?? DEFAULT_MAX_STARTUP_ENTRIES
  );
  const trimmedApps = trimContainer(
    sortApps(cloneSnapshot(ensureArray(installedAppsSnapshot.apps))),
    options.maxInstalledApps ?? DEFAULT_MAX_INSTALLED_APPS
  );

  const normalizedProcesses: ProcessSnapshot = {
    ...processSnapshot,
    capturedAt,
    freshness,
    processes: trimmedProcesses.entries,
    totalCount: trimmedProcesses.totalCount,
    isTruncated: trimmedProcesses.isTruncated
  };

  const normalizedServices: ServiceSnapshot = {
    ...serviceSnapshot,
    capturedAt,
    freshness,
    services: trimmedServices.entries,
    totalCount: trimmedServices.totalCount,
    isTruncated: trimmedServices.isTruncated
  };

  const normalizedStartup: StartupSnapshot = {
    ...startupSnapshot,
    capturedAt,
    freshness,
    folderEntries: trimmedFolderEntries.entries,
    registryEntries: trimmedRegistryEntries.entries,
    scheduledTaskEntries: trimmedScheduledEntries.entries,
    launcherHints: trimmedLauncherHints.entries,
    totalCount:
      trimmedFolderEntries.totalCount +
      trimmedRegistryEntries.totalCount +
      trimmedScheduledEntries.totalCount
  };

  const normalizedApps: InstalledAppsSnapshot = {
    ...installedAppsSnapshot,
    capturedAt,
    freshness,
    apps: trimmedApps.entries,
    totalCount: trimmedApps.totalCount,
    isTruncated: trimmedApps.isTruncated
  };

  const enrichedApps = enrichInstalledApps(normalizedApps, normalizedStartup, normalizedProcesses);
  const enrichedStartup = enrichStartup(normalizedStartup, normalizedProcesses, enrichedApps);
  const settingsMap = buildSettingsMap(observedAt);
  const controlPanelMap = buildControlPanelMap(observedAt);
  const registryZoneMap = buildRegistryZoneMap(observedAt);

  const snapshot: MachineAwarenessSnapshot = {
    capturedAt,
    freshness,
    systemIdentity: cloneSnapshot(systemIdentity),
    processSnapshot: normalizedProcesses,
    serviceSnapshot: normalizedServices,
    startupSnapshot: enrichedStartup,
    installedAppsSnapshot: enrichedApps,
    settingsMap,
    controlPanelMap,
    registryZoneMap,
    summary: {} as MachineAwarenessSummary
  };

  snapshot.summary = buildMachineAwarenessSummary(snapshot);
  snapshot.startupSnapshot = {
    ...snapshot.startupSnapshot,
    launcherHints: sortStartupEntries(snapshot.startupSnapshot.launcherHints)
  };
  return snapshot;
};

export {
  buildControlPanelMap,
  buildRegistryZoneMap,
  buildSettingsMap,
  createWindowsMachineInventorySource,
  searchControlPanelEntries,
  searchRegistryZoneEntries,
  searchSettingsMapEntries,
  toControlPanelSummary,
  toMapSummary,
  toRegistryZoneSummary
};

export { findControlPanelEntry, findRegistryZoneEntry, findSettingsMapEntry } from "./maps";
