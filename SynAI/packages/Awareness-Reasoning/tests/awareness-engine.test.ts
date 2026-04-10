import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../src/memory/index";
import {
  buildAwarenessDigest,
  buildLastReportedBaseline,
  buildSessionBaseline,
  captureMachineBaseline,
  captureRepoBaseline,
  type GitRunner,
  canUsePermissionTier,
  filterPrivacyScopedValues
} from "../src/baseline";
import { buildAwarenessContextSection } from "../src/context";
import { createAwarenessApiServer } from "../src/api";
import { initializeAwarenessEngine, readAwarenessJournal, readAwarenessRuntimeSnapshot } from "../src/bootstrap";
import { appendAwarenessEvent } from "../src/journal";
import {
  buildMachineAwarenessSummary,
  captureMachineAwarenessSnapshot,
  createFixtureMachineInventorySource,
  type MachineInventorySource
} from "../src/machine";
import {
  SYSTEM_STATS_QUERY_VARIANTS,
  buildStorageClarification,
  buildAwarenessQueryAnswer,
  buildAwarenessQueryContextSection,
  routeAwarenessIntent
} from "../src/reasoning";
import { createFixtureScreenCaptureSource } from "../src/screen/windows";

const fixedNow = (): Date => new Date("2026-04-08T01:00:00.000Z");

const gitRunner: GitRunner = (args) => {
  const key = args.join(" ");

  if (key === "rev-parse --abbrev-ref HEAD") {
    return "main";
  }

  if (key === "rev-parse HEAD") {
    return "abc1234567890abcdef1234567890abcdef123456";
  }

  if (key === "status --porcelain") {
    return "";
  }

  if (key === "log --pretty=format:%H%x09%h%x09%ad%x09%s --date=iso-strict -n 5") {
    return [
      "abc1234567890abcdef1234567890abcdef123456\tabc1234\t2026-04-08T00:55:00.000Z\tInitial awareness snapshot",
      "def4567890abcdef1234567890abcdef12345678\tdef4567\t2026-04-07T23:55:00.000Z\tFollow-up tweak"
    ].join("\n");
  }

  return null;
};

const buildFreshness = (capturedAt: string) => ({
  capturedAt,
  generatedAt: capturedAt,
  observedAt: capturedAt,
  ageMs: 0,
  staleAfterMs: 5 * 60 * 1000,
  isFresh: true
});

const fixedIso = (): string => fixedNow().toISOString();
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const createTrackedMachineInventorySource = (waitMs = 25): {
  source: MachineInventorySource;
  counters: Record<"systemIdentity" | "processes" | "services" | "startup" | "installedApps" | "eventLogs", number>;
} => {
  const counters = {
    systemIdentity: 0,
    processes: 0,
    services: 0,
    startup: 0,
    installedApps: 0,
    eventLogs: 0
  };

  const source: MachineInventorySource = {
    captureSystemIdentity: async () => {
      counters.systemIdentity += 1;
      await delay(waitMs);
      return machineInventorySource.captureSystemIdentity();
    },
    captureProcesses: async () => {
      counters.processes += 1;
      await delay(waitMs);
      return machineInventorySource.captureProcesses();
    },
    captureServices: async () => {
      counters.services += 1;
      await delay(waitMs);
      return machineInventorySource.captureServices();
    },
    captureStartup: async () => {
      counters.startup += 1;
      await delay(waitMs);
      return machineInventorySource.captureStartup();
    },
    captureInstalledApps: async () => {
      counters.installedApps += 1;
      await delay(waitMs);
      return machineInventorySource.captureInstalledApps();
    },
    captureEventLogs: async () => {
      counters.eventLogs += 1;
      await delay(waitMs);
      return machineInventorySource.captureEventLogs();
    }
  };

  return { source, counters };
};

const machineInventorySource = createFixtureMachineInventorySource({
  systemIdentity: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    machineName: "test-machine",
    windowsEdition: "Windows 11 Pro",
    windowsVersion: "22631",
    windowsBuild: "22631",
    architecture: "x64",
    currentUser: "test-user",
    uptimeSeconds: 12345,
    timezone: "America/New_York",
    localTime: fixedNow().toString(),
      hardware: {
        capturedAt: fixedIso(),
        freshness: buildFreshness(fixedIso()),
        cpuLoadPercent: 37,
        drives: [
          {
            deviceId: "C:",
            volumeLabel: "System",
          fileSystem: "NTFS",
          totalBytes: 1_000_000_000,
          freeBytes: 400_000_000,
          driveType: "3"
        }
      ],
      memory: {
        totalBytes: 16_000_000_000,
        availableBytes: 8_000_000_000,
        freeBytes: 8_000_000_000
      },
      cpu: {
        name: "Test CPU",
        manufacturer: "TestVendor",
        architecture: "x64",
        cores: 8,
        logicalCores: 16,
        speedMHz: 3200
      },
      gpus: [
        {
          name: "Test GPU",
          driverVersion: "1.0",
          memoryBytes: 4_000_000_000,
          resolution: "1920x1080",
          loadPercent: 18
        }
      ],
      networkAdapters: [
        {
          name: "Ethernet",
          description: "Ethernet Adapter",
          macAddress: "AA:BB:CC:DD:EE:FF",
          ipAddresses: ["192.168.1.10"],
          status: "up"
        }
      ],
      displays: [
        {
          name: "Display 1",
          width: 1920,
          height: 1080,
          refreshRateHz: 60,
          primary: true
        }
      ]
    }
  },
  releaseChannel: "Retail",
  recentUpdates: [
    {
      kb: "KB5031455",
      title: "Cumulative Update Preview",
      installedAt: fixedIso()
    },
    {
      kb: "KB5031217",
      title: "Security Update",
      installedAt: "2026-04-07T12:00:00.000Z"
    }
  ],
  processes: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    totalCount: 3,
    isTruncated: false,
    processes: [
      {
        pid: 1111,
        parentPid: 1000,
        name: "SynAI.exe",
        executablePath: "C:\\Apps\\SynAI\\SynAI.exe",
        commandLine: "\"C:\\Apps\\SynAI\\SynAI.exe\" --profile local",
        cpuSeconds: 12.5,
        cpuPercent: 12,
        memoryBytes: 256_000_000,
        ioReadBytes: 12_000_000,
        ioWriteBytes: 4_000_000,
        startTime: "2026-04-08T00:50:00.000Z",
        signer: "Test Signer",
        publisher: "SynAI",
        windowTitle: "SynAI"
      },
      {
        pid: 2222,
        parentPid: 100,
        name: "explorer.exe",
        executablePath: "C:\\Windows\\explorer.exe",
        commandLine: "explorer.exe",
        cpuSeconds: 40.2,
        cpuPercent: 42,
        memoryBytes: 320_000_000,
        ioReadBytes: 20_000_000,
        ioWriteBytes: 8_000_000,
        startTime: "2026-04-08T00:45:00.000Z",
        signer: null,
        publisher: "Microsoft Corporation",
        windowTitle: "Desktop"
      },
      {
        pid: 3333,
        parentPid: 2222,
        name: "msedge.exe",
        executablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        commandLine: "\"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe\" --profile-directory=Default",
        cpuSeconds: 6.1,
        cpuPercent: 8,
        memoryBytes: 180_000_000,
        ioReadBytes: 8_000_000,
        ioWriteBytes: 2_000_000,
        startTime: "2026-04-08T00:55:00.000Z",
        signer: null,
        publisher: "Microsoft Corporation",
        windowTitle: "Microsoft Edge"
      }
    ]
  },
  services: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    totalCount: 2,
    isTruncated: false,
    services: [
      {
        serviceName: "Spooler",
        displayName: "Print Spooler",
        state: "Running",
        startupType: "Auto",
        executablePath: "C:\\Windows\\System32\\spoolsv.exe",
        dependentServices: ["Fax"],
        linkedProcessId: 4444,
        account: "LocalSystem"
      },
      {
        serviceName: "wuauserv",
        displayName: "Windows Update",
        state: "Running",
        startupType: "Manual",
        executablePath: "C:\\Windows\\system32\\svchost.exe -k netsvcs -p",
        dependentServices: [],
        linkedProcessId: 5555,
        account: "LocalSystem"
      }
    ]
  },
  startup: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    totalCount: 3,
    folderEntries: [
      {
        name: "SynAI Launcher",
        source: "startup-folder",
        location: "C:\\Users\\test-user\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\SynAI Launcher.lnk",
        command: "",
        target: "C:\\Apps\\SynAI\\SynAI.exe",
        processId: null,
        linkedAppName: null
      }
    ],
    registryEntries: [
      {
        name: "OneDrive",
        source: "run",
        location: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        command: "\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background",
        target: null,
        processId: null,
        linkedAppName: null
      }
    ],
    scheduledTaskEntries: [
      {
        name: "Vendor Update",
        source: "scheduled-task",
        location: "\\Vendor\\Update",
        command: "C:\\Program Files\\Vendor\\Updater.exe",
        target: null,
        processId: null,
        linkedAppName: null
      }
    ],
    launcherHints: []
  },
  installedApps: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    totalCount: 2,
    isTruncated: false,
    apps: [
      {
        name: "SynAI",
        publisher: "SynAI",
        version: "1.0.0",
        installLocation: "C:\\Apps\\SynAI",
        installDate: "20260408",
        uninstallCommand: "\"C:\\Apps\\SynAI\\uninstall.exe\"",
        quietUninstallCommand: null,
        displayIcon: "C:\\Apps\\SynAI\\SynAI.exe",
        estimatedSizeKb: 512000,
        sources: ["HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SynAI"],
        associatedProcessIds: [],
        associatedProcessNames: [],
        startupReferences: []
      },
      {
        name: "Microsoft Edge",
        publisher: "Microsoft Corporation",
        version: "125.0.0.0",
        installLocation: "C:\\Program Files\\Microsoft\\Edge\\Application",
        installDate: "20260401",
        uninstallCommand: "\"C:\\Program Files\\Microsoft\\Edge\\Application\\setup.exe\" --uninstall",
        quietUninstallCommand: null,
        displayIcon: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        estimatedSizeKb: 2048000,
        sources: ["HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Edge"],
        associatedProcessIds: [],
        associatedProcessNames: [],
        startupReferences: []
      }
    ]
  },
  eventLogs: {
    capturedAt: fixedIso(),
    freshness: buildFreshness(fixedIso()),
    totalCount: 4,
    isTruncated: false,
    windowStartAt: "2026-04-08T00:00:00.000Z",
    windowEndAt: fixedIso(),
    logs: ["System", "Application"],
    entries: [
      {
        id: "event-1",
        timestamp: "2026-04-08T00:58:00.000Z",
        logName: "System",
        level: "critical",
        provider: "Kernel-Power",
        eventId: 41,
        taskCategory: "None",
        opcode: null,
        machineName: "test-machine",
        message: "The system rebooted without cleanly shutting down first.",
        processId: null
      },
      {
        id: "event-2",
        timestamp: "2026-04-08T00:57:00.000Z",
        logName: "System",
        level: "error",
        provider: "Service Control Manager",
        eventId: 7000,
        taskCategory: "None",
        opcode: null,
        machineName: "test-machine",
        message: "The SynAI Helper service failed to start.",
        processId: null
      },
      {
        id: "event-3",
        timestamp: "2026-04-08T00:56:00.000Z",
        logName: "Application",
        level: "warning",
        provider: "Application Hang",
        eventId: 1002,
        taskCategory: "Hanging Events",
        opcode: null,
        machineName: "test-machine",
        message: "explorer.exe hung briefly.",
        processId: 2222
      },
      {
        id: "event-4",
        timestamp: "2026-04-08T00:54:00.000Z",
        logName: "System",
        level: "error",
        provider: "Disk",
        eventId: 153,
        taskCategory: "None",
        opcode: null,
        machineName: "test-machine",
        message: "Disk retried an IO operation.",
        processId: null
      }
    ],
    counts: {
      total: 4,
      critical: 1,
      error: 2,
      warning: 1,
      information: 0,
      verbose: 0,
      unknown: 0
    }
  }
});

const buildMachineAwarenessFixture = async () =>
  captureMachineAwarenessSnapshot({
    now: fixedNow,
    source: machineInventorySource
  });

const buildPhase5ScreenFixture = () => {
  const capturedAt = fixedIso();
  const freshness = buildFreshness(capturedAt);

  const nextButton = {
    id: "next-button",
    automationId: null,
    controlType: "Button",
    localizedControlType: "Button",
    name: "Next",
    value: null,
    className: null,
    helpText: null,
    bounds: { x: 24, y: 120, width: 120, height: 32 },
    enabled: true,
    focused: false,
    selected: false,
    offscreen: false,
    visible: true,
    isPassword: false,
    privacyScope: "user-visible local content" as const,
    children: []
  };

  const root = {
    id: "root-pane",
    automationId: null,
    controlType: "Pane",
    localizedControlType: "pane",
    name: "Settings",
    value: null,
    className: null,
    helpText: null,
    bounds: { x: 0, y: 0, width: 640, height: 400 },
    enabled: true,
    focused: false,
    selected: false,
    offscreen: false,
    visible: true,
    isPassword: false,
    privacyScope: "user-visible local content" as const,
    children: [nextButton]
  };

  return {
    foregroundWindow: {
      capturedAt,
      freshness,
      windowHandle: "0x1234",
      title: "Settings - Bluetooth",
      processId: 4242,
      processName: "SystemSettings",
      executablePath: "C:\\Windows\\ImmersiveControlPanel\\SystemSettings.exe",
      className: "ApplicationFrameWindow",
      bounds: { x: 0, y: 0, width: 640, height: 400 },
      isForeground: true,
      isFocused: true,
      zOrder: 1
    },
    uiTree: {
      capturedAt,
      freshness,
      scope: null,
      targetLabel: null,
      rootWindowHandle: "0x1234",
      rootWindowTitle: "Settings - Bluetooth",
      cursorPosition: { x: 56, y: 132 },
      elementUnderCursor: nextButton,
      focusedElement: nextButton,
      root,
      totalCount: 2,
      isTruncated: false,
      redactedCount: 0
    }
  };
};

const buildPaths = (workspaceRoot: string) => {
  const runtimeRoot = path.join(workspaceRoot, ".runtime", "awareness");
  return {
    runtimeRoot,
    currentSessionPath: path.join(runtimeRoot, "current-session.json"),
    previousSessionPath: path.join(runtimeRoot, "previous-session.json"),
    lastReportedBaselinePath: path.join(runtimeRoot, "last-reported-baseline.json"),
    lastReportedSnapshotPath: path.join(runtimeRoot, "last-reported-session.json"),
    latestDigestPath: path.join(runtimeRoot, "latest-digest.json"),
    eventsPath: path.join(runtimeRoot, "events.jsonl")
  };
};

const withWorkspace = async <T>(fn: (workspaceRoot: string) => Promise<T>): Promise<T> => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "synai-awareness-"));
  try {
    return await fn(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
};

const createDeliveredSnapshot = async (workspaceRoot: string, sessionId: string) => {
  const paths = buildPaths(workspaceRoot);
  const repoCapture = await captureRepoBaseline({
    workspaceRoot,
    runGit: gitRunner,
    now: fixedNow,
    watchedRoots: ["SynAI"],
    ignoredRoots: [".runtime"],
    activeFeatureFlags: ["local-chat", "memory"]
  });
  const machine = captureMachineBaseline({
    now: fixedNow,
    hostname: "test-machine",
    username: "test-user",
    osVersion: "Windows 11",
    osBuild: "22631",
    platform: "win32",
    arch: "x64",
    timezone: "America/New_York"
  });
  const machineAwareness = await buildMachineAwarenessFixture();
  const session = buildSessionBaseline({
    sessionId,
    appStartedAt: fixedNow().toISOString(),
    workspaceRoot,
    runtimeRoot: paths.runtimeRoot,
    currentSessionPath: paths.currentSessionPath,
    previousSessionPath: paths.previousSessionPath,
    lastReportedBaselinePath: paths.lastReportedBaselinePath,
    latestDigestPath: paths.latestDigestPath,
    eventsPath: paths.eventsPath,
    awarenessMode: "observe",
    permissionTier: "Observe",
    privacyScope: "public metadata",
    previousSessionId: null,
    previousSessionRestored: false,
    now: fixedNow
  });
  const startupDigest = buildAwarenessDigest({
    session,
    repo: repoCapture.repo,
    machine,
    lastReportedBaseline: null,
    generatedAt: fixedNow().toISOString(),
    evidenceRefs: repoCapture.evidenceRefs
  });
  const lastReportedBaseline = buildLastReportedBaseline({
    session,
    repo: repoCapture.repo,
    machine,
    digest: startupDigest,
    now: fixedNow
  });
  const finalDigest = buildAwarenessDigest({
    session,
    repo: repoCapture.repo,
    machine,
    lastReportedBaseline,
    generatedAt: fixedNow().toISOString(),
    evidenceRefs: repoCapture.evidenceRefs
  });

  return {
    ...paths,
    snapshot: {
      version: 1 as const,
      capturedAt: session.capturedAt,
      session,
      repo: repoCapture.repo,
      machine,
      machineAwareness,
      lastReportedBaseline,
      digest: finalDigest
    }
  };
};

describe("awareness engine", () => {
  it("creates startup baselines, digest artifacts, and phase-one capability limits", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-first",
        appStartedAt: fixedNow().toISOString(),
        awarenessMode: "observe",
        permissionTier: "Observe",
        privacyScope: "public metadata",
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const current = await readAwarenessRuntimeSnapshot(engine.paths.currentSessionPath);
      expect(current).not.toBeNull();
      expect(current?.session.sessionId).toBe("session-first");
      expect(current?.machineAwareness).not.toBeNull();
      expect(current?.lastReportedBaseline).not.toBeNull();
      expect(current?.digest.includeInContext).toBe(false);
      expect(current?.digest.summary).toContain("repo main@abc1234");

      const status = engine.getStatus();
      expect(status.supportedPermissionTiers).toEqual(["Observe", "Open/Navigate"]);
      expect(status.supportedPermissionTiers).not.toContain("SoftAction");
      expect(canUsePermissionTier("SoftAction")).toBe(false);

      const events = await readAwarenessJournal(engine.paths.eventsPath);
      expect(events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          "session_started",
          "baseline_created",
          "digest_generated",
          "report_marked_delivered"
        ])
      );
    });
  });

  it("restores the previous session snapshot when one already exists", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const seeded = await createDeliveredSnapshot(workspaceRoot, "seed-session");
      seeded.snapshot.repo.headSha = "0000000000000000000000000000000000000000";
      seeded.snapshot.repo.recentCommits = [
        {
          sha: "0000000000000000000000000000000000000000",
          shortSha: "0000000",
          authoredAt: "2026-04-07T20:00:00.000Z",
          subject: "Old baseline commit"
        }
      ];
      await mkdir(path.dirname(seeded.currentSessionPath), { recursive: true });
      await writeFile(seeded.currentSessionPath, `${JSON.stringify(seeded.snapshot, null, 2)}\n`, "utf8");

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-restored",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const previous = await readAwarenessRuntimeSnapshot(engine.paths.previousSessionPath);
      expect(previous?.session.sessionId).toBe("seed-session");
      expect(previous?.machineAwareness).not.toBeNull();

      const current = await readAwarenessRuntimeSnapshot(engine.paths.currentSessionPath);
      expect(current?.session.previousSessionRestored).toBe(true);
      expect(current?.session.previousSessionId).toBe("seed-session");

      const whatsNew = engine.queryAwareness({ query: "whats new", awarenessAnswerMode: "evidence-first" });
      expect(whatsNew?.scope).toBe("previous-session");
      expect(whatsNew?.bundle.verifiedFindings.join(" ")).toContain("commit(s) since previous session");

      const events = await readAwarenessJournal(engine.paths.eventsPath);
      expect(events.map((event) => event.type)).toContain("baseline_restored");
    });
  });

  it("summarizes the changelog when asking whats new even if the git delta is flat", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const seeded = await createDeliveredSnapshot(workspaceRoot, "seed-session");
      await mkdir(path.dirname(seeded.currentSessionPath), { recursive: true });
      await writeFile(seeded.currentSessionPath, `${JSON.stringify(seeded.snapshot, null, 2)}\n`, "utf8");
      await writeFile(
        path.join(workspaceRoot, "CHANGELOG.md"),
        [
          "# Changelog",
          "",
          "## 2026-04-08",
          "",
          "### Added",
          "- AwarenessEngine foundation for startup baselines, session tracking, digests, and event journaling.",
          "- Machine awareness for Windows identity, hardware, processes, services, startup items, installed apps, settings maps, control panel maps, and registry zone maps.",
          "",
          "### Improved",
          "- Chat workspace density, scroll behavior, and auto-follow behavior.",
          "- Live local hardware answers for CPU, RAM, GPU, disk, uptime, and top-process hotspot questions.",
          "",
          "### Tests",
          "- Added and expanded behavior-focused tests for awareness routing, file/machine/screen awareness, diagnostics, live usage answers, and hotspot ranking."
        ].join("\n"),
        "utf8"
      );

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-changelog",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const whatsNew = engine.queryAwareness({ query: "what's new", awarenessAnswerMode: "evidence-first" });
      expect(whatsNew?.scope).toBe("previous-session");
      expect(whatsNew?.bundle.verifiedFindings.join(" ")).toContain("Previous session id: seed-session");
      expect(whatsNew?.bundle.verifiedFindings.join(" ")).toContain("Changelog highlights:");
      expect(whatsNew?.bundle.verifiedFindings.join(" ")).toContain("AwarenessEngine foundation");
      expect(whatsNew?.bundle.verifiedFindings.join(" ")).toContain("Live local hardware answers");
    });
  });

  it("writes awareness journal entries as normalized JSONL", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const eventsPath = path.join(workspaceRoot, ".runtime", "awareness", "events.jsonl");
      await appendAwarenessEvent(eventsPath, {
        type: "digest_generated",
        source: "test",
        sessionId: "session-journal",
        evidenceRefs: [
          {
            id: "digest-1",
            kind: "digest",
            label: "digest"
          }
        ],
        affectedAreas: ["context"],
        confidence: 0.9,
        details: {
          reason: "test"
        }
      });

      const raw = await readFile(eventsPath, "utf8");
      expect(raw.trim().split(/\r?\n/)).toHaveLength(1);
      const events = await readAwarenessJournal(eventsPath);
      expect(events[0].type).toBe("digest_generated");
      expect(events[0].source).toBe("test");
      expect(events[0].sessionId).toBe("session-journal");
    });
  });

  it("captures structured repo working-tree deltas from git status output", async () => {
    const dirtyGitRunner: GitRunner = (args) => {
      const key = args.join(" ");

      if (key === "rev-parse --abbrev-ref HEAD") {
        return "feature/awareness";
      }

      if (key === "rev-parse HEAD") {
        return "fedcba9876543210fedcba9876543210fedcba98";
      }

      if (key === "status --porcelain") {
        return [
          "M  packages/Awareness-Reasoning/src/bootstrap/index.ts",
          " M apps/desktop/electron/main.ts",
          "R  old-name.ts -> new-name.ts",
          "?? Downloads/fresh.txt",
          "UU packages/Awareness-Reasoning/src/reasoning/index.ts"
        ].join("\n");
      }

      if (key === "log --pretty=format:%H%x09%h%x09%ad%x09%s --date=iso-strict -n 5") {
        return "fedcba9876543210fedcba9876543210fedcba98\tfedcba9\t2026-04-08T00:59:00.000Z\tWorking tree snapshot";
      }

      return null;
    };

    const repoCapture = await captureRepoBaseline({
      workspaceRoot: process.cwd(),
      runGit: dirtyGitRunner,
      now: fixedNow,
      watchedRoots: ["SynAI"],
      ignoredRoots: [".runtime"]
    });

    expect(repoCapture.repo.dirtyState).toBe("dirty");
    expect(repoCapture.repo.workingTree.totalCount).toBe(5);
    expect(repoCapture.repo.workingTree.counts.staged).toBe(3);
    expect(repoCapture.repo.workingTree.counts.unstaged).toBe(2);
    expect(repoCapture.repo.workingTree.counts.untracked).toBe(1);
    expect(repoCapture.repo.workingTree.counts.conflicted).toBe(1);
    expect(repoCapture.repo.workingTree.counts.renamed).toBe(1);
    expect(repoCapture.repo.workingTree.entries.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        "packages/Awareness-Reasoning/src/bootstrap/index.ts",
        "apps/desktop/electron/main.ts",
        "new-name.ts",
        "Downloads/fresh.txt"
      ])
    );
    expect(repoCapture.repo.workingTree.summary).toContain("staged");
    expect(repoCapture.repo.workingTree.entries.some((entry) => entry.path.endsWith("fresh.txt"))).toBe(true);
  });

  it("runs narrow live refreshes and compares against the last reported snapshot", async () => {
    await withWorkspace(async (workspaceRoot) => {
      let currentTimeMs = fixedNow().getTime();
      const downloadsRoot = path.join(workspaceRoot, "Downloads");
      await mkdir(downloadsRoot, { recursive: true });
      await writeFile(path.join(downloadsRoot, "seed.txt"), "seed", "utf8");

      const gitState = {
        branch: "main",
        head: "abc1234567890abcdef1234567890abcdef123456",
        status: ""
      };
      const gitRunnerWithState: GitRunner = (args) => {
        const key = args.join(" ");

        if (key === "rev-parse --abbrev-ref HEAD") {
          return gitState.branch;
        }

        if (key === "rev-parse HEAD") {
          return gitState.head;
        }

        if (key === "status --porcelain") {
          return gitState.status;
        }

        if (key === "log --pretty=format:%H%x09%h%x09%ad%x09%s --date=iso-strict -n 5") {
          return `${gitState.head}\t${gitState.head.slice(0, 7)}\t2026-04-08T00:58:00.000Z\tLive repo state`;
        }

        return null;
      };

      const machineCalls = {
        identity: 0,
        processes: 0,
        services: 0,
        startup: 0,
        installedApps: 0
      };
      const countingMachineSource = {
        captureSystemIdentity: async () => {
          machineCalls.identity += 1;
          return machineInventorySource.captureSystemIdentity();
        },
        captureProcesses: async () => {
          machineCalls.processes += 1;
          return machineInventorySource.captureProcesses();
        },
        captureServices: async () => {
          machineCalls.services += 1;
          return machineInventorySource.captureServices();
        },
        captureStartup: async () => {
          machineCalls.startup += 1;
          return machineInventorySource.captureStartup();
        },
        captureInstalledApps: async () => {
          machineCalls.installedApps += 1;
          return machineInventorySource.captureInstalledApps();
        }
      };

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-live-query",
        appStartedAt: fixedNow().toISOString(),
        fileInventory: {
          roots: [workspaceRoot]
        },
        machineInventory: {
          source: countingMachineSource
        },
        runGit: gitRunnerWithState,
        now: () => new Date(currentTimeMs)
      });

      expect(machineCalls.identity).toBe(1);
      expect(machineCalls.processes).toBe(1);
      expect(engine.paths.lastReportedSnapshotPath).toContain("last-reported-session.json");

      gitState.head = "fedcba9876543210fedcba9876543210fedcba98";
      gitState.status = "?? Downloads/fresh.txt";
      await writeFile(path.join(downloadsRoot, "fresh.txt"), "fresh", "utf8");
      currentTimeMs += 5_000;

      const answer = await engine.queryAwarenessLive({
        query: "what changed since you last told me?"
      });

      expect(answer?.scope).toBe("last-report");
      expect(answer?.bundle.verifiedFindings.join(" ")).toContain("Last report");
      expect(engine.currentSnapshot.repo.workingTree.counts.untracked).toBe(1);
      expect(engine.currentSnapshot.repo.workingTree.entries.some((entry) => entry.path.endsWith("fresh.txt"))).toBe(true);
      expect(engine.currentSnapshot.fileAwareness?.recentChanges.some((change) => change.path.endsWith("fresh.txt"))).toBe(true);
      expect(machineCalls.identity).toBe(1);
      expect(machineCalls.processes).toBe(1);
    });
  });

  it("deduplicates concurrent machine refreshes for the same awareness target", async () => {
    await withWorkspace(async (workspaceRoot) => {
      let currentTimeMs = fixedNow().getTime();
      const tracked = createTrackedMachineInventorySource();
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-machine-dedupe",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: tracked.source
        },
        runGit: gitRunner,
        now: () => new Date(currentTimeMs)
      });

      expect(tracked.counters.systemIdentity).toBe(1);
      expect(tracked.counters.processes).toBe(1);

      currentTimeMs += 5_000;
      const request = {
        query: "what's using all my ram",
        refresh: true,
        awarenessAnswerMode: "evidence-first" as const,
        hints: {
          force: true,
          strictGrounding: true,
          maxScanMs: 300
        }
      };

      const [first, second] = await Promise.all([
        engine.queryAwarenessLive(request),
        engine.queryAwarenessLive(request)
      ]);

      expect(first?.intent.family).toBe("resource-hotspot");
      expect(second?.intent.family).toBe("resource-hotspot");
      expect(tracked.counters.systemIdentity).toBe(2);
      expect(tracked.counters.processes).toBe(2);
      expect(tracked.counters.services).toBe(2);
      expect(tracked.counters.startup).toBe(2);
      expect(tracked.counters.installedApps).toBe(2);
      expect(engine.getStatus().runtime.inFlightTargets).toEqual([]);
      expect(engine.getStatus().runtime.recentDurationsMs.machine).toBeGreaterThanOrEqual(0);
    });
  });

  it("deduplicates concurrent live-usage refreshes and skips unnecessary fresh refreshes", async () => {
    await withWorkspace(async (workspaceRoot) => {
      let currentTimeMs = fixedNow().getTime();
      const tracked = createTrackedMachineInventorySource();
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-live-usage-dedupe",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: tracked.source
        },
        runGit: gitRunner,
        now: () => new Date(currentTimeMs)
      });

      const freshAnswer = await engine.queryAwarenessLive({
        query: "what is my cpu usage right now?",
        refresh: true,
        awarenessAnswerMode: "evidence-first",
        hints: {
          force: true,
          strictGrounding: true,
          maxScanMs: 250
        }
      });

      expect(freshAnswer?.intent.family).toBe("live-usage");
      expect(tracked.counters.systemIdentity).toBe(1);
      expect(tracked.counters.processes).toBe(1);

      currentTimeMs += 2_000;
      const request = {
        query: "what is my cpu usage right now?",
        refresh: true,
        awarenessAnswerMode: "evidence-first" as const,
        hints: {
          force: true,
          strictGrounding: true,
          maxScanMs: 250
        }
      };

      const [first, second] = await Promise.all([
        engine.queryAwarenessLive(request),
        engine.queryAwarenessLive(request)
      ]);

      expect(first?.intent.family).toBe("live-usage");
      expect(second?.intent.family).toBe("live-usage");
      expect(tracked.counters.systemIdentity).toBe(2);
      expect(tracked.counters.processes).toBe(1);
      expect(engine.getStatus().runtime.inFlightTargets).toEqual([]);
      expect(engine.getStatus().runtime.recentDurationsMs["live-usage"]).toBeGreaterThanOrEqual(0);
    });
  });

  it("generates compact awareness digests and keeps context assembly small", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const repoCapture = await captureRepoBaseline({
        workspaceRoot,
        runGit: gitRunner,
        now: fixedNow,
        watchedRoots: ["SynAI"],
        ignoredRoots: [".runtime"],
        activeFeatureFlags: ["local-chat", "memory"]
      });
      const machine = captureMachineBaseline({
        now: fixedNow,
        hostname: "test-machine",
        username: "test-user",
        osVersion: "Windows 11",
        osBuild: "22631",
        platform: "win32",
        arch: "x64",
        timezone: "America/New_York"
      });
      const session = buildSessionBaseline({
        sessionId: "session-context",
        appStartedAt: fixedNow().toISOString(),
        workspaceRoot,
        runtimeRoot: path.join(workspaceRoot, ".runtime", "awareness"),
        currentSessionPath: path.join(workspaceRoot, ".runtime", "awareness", "current-session.json"),
        previousSessionPath: path.join(workspaceRoot, ".runtime", "awareness", "previous-session.json"),
        lastReportedBaselinePath: path.join(workspaceRoot, ".runtime", "awareness", "last-reported-baseline.json"),
        latestDigestPath: path.join(workspaceRoot, ".runtime", "awareness", "latest-digest.json"),
        eventsPath: path.join(workspaceRoot, ".runtime", "awareness", "events.jsonl"),
        awarenessMode: "observe",
        permissionTier: "Observe",
        privacyScope: "public metadata",
        previousSessionId: null,
        previousSessionRestored: false,
        now: fixedNow
      });
      const digest = buildAwarenessDigest({
        session,
        repo: repoCapture.repo,
        machine,
        lastReportedBaseline: null,
        generatedAt: fixedNow().toISOString(),
        evidenceRefs: repoCapture.evidenceRefs
      });
      const assembled = assembleContext({
        systemInstruction: "system",
        summaryText: "summary",
        allMessages: [
          {
            id: "msg-1",
            conversationId: "conversation-1",
            role: "user",
            content: "hello",
            createdAt: fixedNow().toISOString()
          }
        ],
        stableMemories: [],
        retrievedMemories: [],
        webSearch: {
          status: "off",
          query: "",
          results: []
        },
        awareness: digest
      });

      expect(assembled.preview.awareness).not.toBeNull();
      expect(assembled.promptMessages[0].content).toContain("Awareness snapshot");
      expect(assembled.promptMessages[0].content).not.toContain(workspaceRoot);
      expect(assembled.promptMessages[0].content).not.toContain("test-user");
      expect(assembled.promptMessages[0].content.length).toBeLessThan(1200);
    });
  });

  it("enforces privacy scope and keeps phase one in observe-only capability mode", () => {
    const privacy = filterPrivacyScopedValues(
      [
        { privacyScope: "public metadata", value: "visible" },
        { privacyScope: "sensitive local content", value: "secret" },
        { privacyScope: "protected/system-sensitive surfaces", value: "blocked" }
      ],
      "user-visible local content"
    );

    expect(privacy.allowed).toEqual(["visible"]);
    expect(privacy.blockedScopes).toEqual([
      "sensitive local content",
      "protected/system-sensitive surfaces"
    ]);
    expect(canUsePermissionTier("Observe")).toBe(true);
    expect(canUsePermissionTier("SoftAction")).toBe(false);
  });

  it("generates a relevant digest with a compact summary", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const repoCapture = await captureRepoBaseline({
        workspaceRoot,
        runGit: gitRunner,
        now: fixedNow,
        watchedRoots: ["SynAI"],
        ignoredRoots: [".runtime"],
        activeFeatureFlags: ["local-chat"]
      });
      const machine = captureMachineBaseline({
        now: fixedNow,
        hostname: "test-machine",
        username: "test-user",
        osVersion: "Windows 11",
        osBuild: "22631",
        platform: "win32",
        arch: "x64",
        timezone: "America/New_York"
      });
      const session = buildSessionBaseline({
        sessionId: "session-digest",
        appStartedAt: fixedNow().toISOString(),
        workspaceRoot,
        runtimeRoot: path.join(workspaceRoot, ".runtime", "awareness"),
        currentSessionPath: path.join(workspaceRoot, ".runtime", "awareness", "current-session.json"),
        previousSessionPath: path.join(workspaceRoot, ".runtime", "awareness", "previous-session.json"),
        lastReportedBaselinePath: path.join(workspaceRoot, ".runtime", "awareness", "last-reported-baseline.json"),
        latestDigestPath: path.join(workspaceRoot, ".runtime", "awareness", "latest-digest.json"),
        eventsPath: path.join(workspaceRoot, ".runtime", "awareness", "events.jsonl"),
        awarenessMode: "observe",
        permissionTier: "Observe",
        privacyScope: "public metadata",
        previousSessionId: null,
        previousSessionRestored: false,
        now: fixedNow
      });

      const digest = buildAwarenessDigest({
        session,
        repo: repoCapture.repo,
        machine,
        lastReportedBaseline: null,
        generatedAt: fixedNow().toISOString(),
        evidenceRefs: repoCapture.evidenceRefs
      });

      expect(digest.includeInContext).toBe(true);
      expect(digest.includeReason).toBe("relevant");
      expect(digest.summary).toContain("repo main@abc1234");
      expect(digest.summary).toContain("machine test-machine");
      expect(buildAwarenessContextSection(digest)).toContain("Awareness snapshot");
    });
  });

  it("serves compact awareness status, digest, and refresh endpoints on localhost", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-api",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });
      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const statusResponse = await fetch(`${api.baseUrl}/api/awareness/status`);
        expect(statusResponse.status).toBe(200);
        const status = (await statusResponse.json()) as {
          summary: string;
          supportedPermissionTiers: string[];
          runtime: { ready: boolean; inFlightTargets: string[] };
        };
        expect(status.summary).toContain("repo main@abc1234");
        expect(status.supportedPermissionTiers).toEqual(["Observe", "Open/Navigate"]);
        expect(status.runtime.ready).toBe(true);
        expect(status.runtime.inFlightTargets).toEqual([]);

        const digestResponse = await fetch(`${api.baseUrl}/api/awareness/digest`);
        expect(digestResponse.status).toBe(200);
        const digest = (await digestResponse.json()) as { summary: string; includeInContext: boolean };
        expect(digest.summary).toContain("repo main@abc1234");
        expect(digest.includeInContext).toBe(false);

        const refreshResponse = await fetch(`${api.baseUrl}/api/awareness/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ reason: "test" })
        });
        expect(refreshResponse.status).toBe(200);
        const refreshed = (await refreshResponse.json()) as { summary: string };
        expect(refreshed.summary).toContain("repo main@abc1234");
      } finally {
        await api.close();
      }
    });
  });

  it("serves Microsoft-only official knowledge endpoints with mirror refresh and query hits", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const fetchImpl: typeof fetch = async (input) => {
        const url = String(input);
        const title = url.includes("launch-settings")
          ? "Launch Windows Settings"
          : url.includes("windows11-release-information")
            ? "Windows 11 release information"
            : "Windows release health";
        const body = url.includes("launch-settings")
          ? "Use the ms-settings URI scheme to open Bluetooth & devices and other Settings pages."
          : "Windows 11 release notes and known issues for supported builds.";
        return new Response(`<html><title>${title}</title><body><p>${body}</p></body></html>`, {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        });
      };

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-official-knowledge",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        officialKnowledge: {
          fetchImpl,
          allowLiveFetch: true,
          backgroundRefresh: false
        },
        runGit: gitRunner,
        now: fixedNow
      });
      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const refreshResponse = await fetch(`${api.baseUrl}/api/awareness/knowledge/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ reason: "test" })
        });
        expect(refreshResponse.status).toBe(200);

        const statusResponse = await fetch(`${api.baseUrl}/api/awareness/knowledge/status`);
        expect(statusResponse.status).toBe(200);
        const status = (await statusResponse.json()) as {
          documentCount: number;
          allowedDomains: string[];
          ready: boolean;
        };
        expect(status.ready).toBe(true);
        expect(status.documentCount).toBeGreaterThan(0);
        expect(status.allowedDomains).toEqual(["learn.microsoft.com", "support.microsoft.com"]);

        const queryResponse = await fetch(`${api.baseUrl}/api/awareness/knowledge/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: "where is the bluetooth setting",
            officialKnowledgePolicy: "mirror-first"
          })
        });
        expect(queryResponse.status).toBe(200);
        const query = (await queryResponse.json()) as {
          used: boolean;
          source: string;
          hits: Array<{ domain: string; canonicalUrl: string; title: string }>;
        };
        expect(query.used).toBe(true);
        expect(query.source).toBe("mirror");
        expect(query.hits.length).toBeGreaterThan(0);
        expect(query.hits.every((hit) => ["learn.microsoft.com", "support.microsoft.com"].includes(hit.domain))).toBe(true);
        expect(query.hits.some((hit) => hit.canonicalUrl.includes("launch-settings"))).toBe(true);
      } finally {
        await api.close();
      }
    });
  });

  it("serves volume, folder, and monitor-status file-awareness endpoints", async () => {
    await withWorkspace(async (workspaceRoot) => {
      await mkdir(path.join(workspaceRoot, "FolderA"), { recursive: true });
      await writeFile(path.join(workspaceRoot, "FolderA", "note.txt"), "folder browse fixture", "utf8");
      const folderPath = path.join(workspaceRoot, "FolderA");

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-volume-endpoints",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });
      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const volumesResponse = await fetch(`${api.baseUrl}/api/awareness/files/volumes`);
        expect(volumesResponse.status).toBe(200);
        const volumes = (await volumesResponse.json()) as Array<{ rootPath: string; volumeType: string }>;
        expect(volumes.length).toBeGreaterThan(0);

        const folderResponse = await fetch(
          `${api.baseUrl}/api/awareness/files/folder?path=${encodeURIComponent(folderPath)}`
        );
        expect(folderResponse.status).toBe(200);
        const folder = (await folderResponse.json()) as {
          path: string;
          folders: Array<{ name: string }>;
          files: Array<{ name: string }>;
        };
        expect(path.normalize(folder.path)).toBe(path.normalize(folderPath));
        expect(Array.isArray(folder.folders)).toBe(true);
        expect(Array.isArray(folder.files)).toBe(true);

        const monitorResponse = await fetch(`${api.baseUrl}/api/awareness/files/monitor-status`);
        expect(monitorResponse.status).toBe(200);
        const monitor = (await monitorResponse.json()) as {
          backgroundMonitoring: boolean;
          volumes: Array<{ rootPath: string; cursorSource: string }>;
        };
        expect(typeof monitor.backgroundMonitoring).toBe("boolean");
        expect(monitor.volumes.length).toBeGreaterThan(0);
      } finally {
        await api.close();
      }
    });
  });

  it("routes awareness intents and keeps uncertainty explicit when evidence is weak", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-routing",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      expect(routeAwarenessIntent("what changed since restart?").family).toBe("repo-change");
      expect(routeAwarenessIntent("what apps launch at startup?").family).toBe("process-service-startup");
      expect(routeAwarenessIntent("where is the Bluetooth setting?").family).toBe("settings-control-panel");
      expect(routeAwarenessIntent("what is using the most RAM?").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("top 5 programs using CPU").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("what's my cpu usage and which process is the main hog").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("what's the top 4 processss using ram").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("what's using all my disk?").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("whats my ram usage").family).toBe("live-usage");
      expect(routeAwarenessIntent("what is my cpu usage right now?").family).toBe("live-usage");
      expect(routeAwarenessIntent("my ram and cpu").family).toBe("live-usage");
      expect(routeAwarenessIntent("cpu and ram").family).toBe("live-usage");
      expect(routeAwarenessIntent("how much free storage do i have").family).toBe("live-usage");
      expect(routeAwarenessIntent("what about the storage on my hard drive").family).toBe("live-usage");
      expect(routeAwarenessIntent("what gpu and vram do I have?").family).toBe("hardware");
      expect(routeAwarenessIntent("whats new").family).toBe("repo-change");
      expect(routeAwarenessIntent("based on the current README only, what does Phase 1 include?").family).toBe("repo-change");
      expect(
        routeAwarenessIntent("using the current repo docs and settings copy, compare the two awareness answer modes").family
      ).toBe("repo-change");
      expect(routeAwarenessIntent("what am I looking at right now?").family).toBe("on-screen");
      expect(routeAwarenessIntent("whts usng al my ramm rite now").family).toBe("resource-hotspot");
      expect(routeAwarenessIntent("wher is the bluetoth seting").family).toBe("settings-control-panel");
      expect(routeAwarenessIntent("wats nu sins last sesion").family).toBe("repo-change");
      expect(buildStorageClarification("what about storage")).not.toBeNull();
      expect(
        routeAwarenessIntent("what about storage", {
          recentUserMessages: ["how much free storage do i have"],
          lastAwarenessIntentFamily: "live-usage"
        }).family
      ).toBe("live-usage");

      const weakAnswer = engine.queryAwareness({ query: "what changed since last session?" });
      expect(weakAnswer?.intent.family).toBe("repo-change");
      expect(weakAnswer?.bundle.uncertainty.join(" ")).toContain(
        "No previous session snapshot was available."
      );

      const misspelledFeatureSummary = engine.queryAwareness({
        query: "wats nu sins last sesion",
        awarenessAnswerMode: "evidence-first"
      });
      expect(misspelledFeatureSummary?.scope).toBe("previous-session");
    });
  });

  it("clarifies ambiguous storage prompts and keeps drive-space answers on machine data", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-storage-routing",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const ambiguous = engine.queryAwareness({
        query: "what about storage",
        awarenessAnswerMode: "evidence-first"
      });
      expect(ambiguous?.clarification?.question).toContain("free space on your drive");

      const contextual = engine.queryAwareness({
        query: "what about storage",
        awarenessAnswerMode: "evidence-first",
        conversationContext: {
          recentUserMessages: ["how much free storage do i have", "what about storage"],
          lastAwarenessIntentFamily: "live-usage"
        }
      });
      expect(contextual?.intent.family).toBe("live-usage");
      expect(contextual?.bundle.verifiedFindings[0]).toContain("free on");
      expect(contextual?.bundle.verifiedFindings.join(" ")).not.toContain("Largest files");

      const explicitFileStorage = engine.queryAwareness({
        query: "what files are taking up space",
        awarenessAnswerMode: "evidence-first"
      });
      expect(explicitFileStorage?.intent.family).toBe("file-folder-media");
    });
  });

  it("returns ranked resource hotspots with direct process and grouped program views", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-hotspots",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const ramHotspot = engine.queryAwareness({
        query: "what is using the most RAM?",
        awarenessAnswerMode: "evidence-first"
      });
      expect(ramHotspot?.intent.family).toBe("resource-hotspot");
      expect(ramHotspot?.bundle.resourceHotspots?.[0].label).toBe("explorer.exe#2222");
      expect(ramHotspot?.bundle.resourceHotspots?.[0].resource).toBe("ram");
      expect(ramHotspot?.bundle.verifiedFindings.join(" ")).toContain("Top RAM process");
      expect(ramHotspot?.bundle.verifiedFindings.join(" ")).toContain("explorer.exe#2222");
      expect(ramHotspot?.bundle.verifiedFindings.join(" ")).toContain("Publisher: Microsoft Corporation");
      expect(ramHotspot?.bundle.verifiedFindings.join(" ")).toContain("Microsoft Corporation");
      expect(ramHotspot?.bundle.suggestedNextChecks).toEqual([]);

      const mixedHotspot = engine.queryAwareness({
        query: "what's my cpu usage and which process is the main hog",
        awarenessAnswerMode: "evidence-first"
      });
      expect(mixedHotspot?.intent.family).toBe("resource-hotspot");
      expect(mixedHotspot?.bundle.verifiedFindings.join(" ")).toContain("Current CPU load");
      expect(mixedHotspot?.bundle.resourceHotspots?.length).toBeGreaterThan(0);

      const typoHotspot = engine.queryAwareness({
        query: "what's the top 4 processss using ram",
        awarenessAnswerMode: "evidence-first"
      });
      expect(typoHotspot?.intent.family).toBe("resource-hotspot");
      expect(typoHotspot?.bundle.resourceHotspots?.length).toBe(
        Math.min(4, engine.currentSnapshot.machineAwareness.processSnapshot.totalCount)
      );

      const groupedProcesses = [
        {
          pid: 2222,
          parentPid: 100,
          name: "explorer.exe",
          executablePath: "C:\\Windows\\explorer.exe",
          commandLine: "explorer.exe",
          cpuSeconds: 40.2,
          cpuPercent: 20,
          memoryBytes: 320_000_000,
          ioReadBytes: 20_000_000,
          ioWriteBytes: 8_000_000,
          startTime: "2026-04-08T00:45:00.000Z",
          signer: null,
          publisher: "Microsoft Corporation",
          windowTitle: "Desktop"
        },
        {
          pid: 3333,
          parentPid: 2222,
          name: "msedge.exe",
          executablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          commandLine: "\"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe\" --profile-directory=Default",
          cpuSeconds: 6.1,
          cpuPercent: 45,
          memoryBytes: 180_000_000,
          ioReadBytes: 8_000_000,
          ioWriteBytes: 2_000_000,
          startTime: "2026-04-08T00:55:00.000Z",
          signer: null,
          publisher: "Microsoft Corporation",
          windowTitle: "Microsoft Edge"
        }
      ];
      const groupedInstalledApps = [
        {
          ...engine.currentSnapshot.machineAwareness.installedAppsSnapshot.apps.find(
            (app) => app.name === "Microsoft Edge"
          )!,
          associatedProcessIds: [3333],
          associatedProcessNames: ["msedge.exe"]
        },
        {
          name: "Windows Explorer",
          publisher: "Microsoft Corporation",
          version: null,
          installLocation: "C:\\Windows",
          installDate: null,
          uninstallCommand: null,
          quietUninstallCommand: null,
          displayIcon: "C:\\Windows\\explorer.exe",
          estimatedSizeKb: null,
          sources: ["synthetic"],
          associatedProcessIds: [2222],
          associatedProcessNames: ["explorer.exe"],
          startupReferences: []
        }
      ];
      const groupedCurrent = {
        ...engine.currentSnapshot,
        machineAwareness: {
          ...engine.currentSnapshot.machineAwareness,
          processSnapshot: {
            ...engine.currentSnapshot.machineAwareness.processSnapshot,
            processes: groupedProcesses,
            totalCount: groupedProcesses.length,
            isTruncated: false
          },
          installedAppsSnapshot: {
            ...engine.currentSnapshot.machineAwareness.installedAppsSnapshot,
            apps: groupedInstalledApps
          },
          summary: buildMachineAwarenessSummary({
            ...engine.currentSnapshot.machineAwareness,
            processSnapshot: {
              ...engine.currentSnapshot.machineAwareness.processSnapshot,
              processes: groupedProcesses,
              totalCount: groupedProcesses.length,
              isTruncated: false
            },
            installedAppsSnapshot: {
              ...engine.currentSnapshot.machineAwareness.installedAppsSnapshot,
              apps: groupedInstalledApps
            }
          })
        }
      };

      const groupedHotspot = buildAwarenessQueryAnswer({
        query: "top 2 programs using CPU",
        current: groupedCurrent,
        paths: engine.paths,
        now: fixedNow(),
        awarenessAnswerMode: "evidence-first",
        strictGrounding: true
      });

      expect(groupedHotspot?.intent.family).toBe("resource-hotspot");
      expect(groupedHotspot?.bundle.resourceHotspots?.[0].grouping).toBe("program");
      expect(groupedHotspot?.bundle.resourceHotspots?.[0].label).toBe("Microsoft Edge");
      expect(groupedHotspot?.bundle.resourceHotspots?.length).toBe(2);
      expect(groupedHotspot?.bundle.verifiedFindings.join(" ")).toContain("Top CPU program");
      expect(groupedHotspot?.bundle.verifiedFindings.join(" ")).toContain("Microsoft Edge");
    });
  });

  it("recognizes 100 system-stats query variants as machine-aware intents", () => {
    expect(SYSTEM_STATS_QUERY_VARIANTS.length).toBe(100);
    for (const variant of SYSTEM_STATS_QUERY_VARIANTS) {
      const route = routeAwarenessIntent(variant);
      expect(route.family).toBe("live-usage");
      expect(route.confidence).toBeGreaterThan(0.2);
    }
  });

  it("switches between evidence-first and llm-primary pipelines for non-awareness prompts", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-mode-switch",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const evidenceFirst = await engine.queryAwarenessLive({
        query: "tell me a joke about dragons",
        refresh: false,
        awarenessAnswerMode: "evidence-first"
      });
      expect(evidenceFirst).not.toBeNull();
      expect(evidenceFirst?.answerMode).toBe("evidence-first");
      expect(evidenceFirst?.strictGrounding).toBe(true);

      const awarenessSection = buildAwarenessQueryContextSection(
        evidenceFirst,
        "tell me a joke about dragons"
      );
      expect(awarenessSection).toContain("Awareness query:");
      expect(awarenessSection?.length ?? 0).toBeLessThan(1200);

      const llmPrimary = await engine.queryAwarenessLive({
        query: "tell me a joke about dragons",
        refresh: false,
        awarenessAnswerMode: "llm-primary"
      });
      expect(llmPrimary).toBeNull();
    });
  });

  it("marks inference explicitly and surfaces uncertainty when strict grounding is weak", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-grounding",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const inferenceAnswer = engine.queryAwareness({
        query: "what is slowing my PC down?",
        awarenessAnswerMode: "evidence-first"
      });
      expect(inferenceAnswer).not.toBeNull();
      expect(inferenceAnswer?.bundle.inferredFindings.length).toBeGreaterThan(0);
      expect(inferenceAnswer?.bundle.likelyInterpretation.every((item) => item.startsWith("Inference:"))).toBe(true);

      const weakAnswer = engine.queryAwareness({
        query: "what am I looking at right now?",
        awarenessAnswerMode: "evidence-first"
      });

      expect(weakAnswer).not.toBeNull();
      expect(weakAnswer?.bundle.groundingStatus).toBe("weak");
      expect(weakAnswer?.bundle.evidenceTraceIds.length).toBeGreaterThan(0);
      expect(weakAnswer?.bundle.uncertainty.join(" ")).toContain("Grounding is weak");
      expect(weakAnswer?.bundle.suggestedNextChecks.join(" ")).toContain("Run a narrow refresh/scan");
    });
  });

  it("runs narrow intent-targeted scans and returns safe partial answers when the scan budget is exceeded", async () => {
    await withWorkspace(async (workspaceRoot) => {
      let currentTimeMs = fixedNow().getTime();
      await mkdir(path.join(workspaceRoot, "Downloads"), { recursive: true });
      await writeFile(path.join(workspaceRoot, "Downloads", "baseline.txt"), "baseline", "utf8");

      const pause = (ms: number): void => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          // busy wait for deterministic timeout behavior in tests
        }
      };

      const slowGitRunner: GitRunner = (args) => {
        pause(70);
        const key = args.join(" ");
        if (key === "rev-parse --abbrev-ref HEAD") {
          return "main";
        }
        if (key === "rev-parse HEAD") {
          return "abc1234567890abcdef1234567890abcdef123456";
        }
        if (key === "status --porcelain") {
          return "";
        }
        if (key === "log --pretty=format:%H%x09%h%x09%ad%x09%s --date=iso-strict -n 5") {
          return "abc1234567890abcdef1234567890abcdef123456\tabc1234\t2026-04-08T00:55:00.000Z\tInitial awareness snapshot";
        }
        return null;
      };

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-budgeted-refresh",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        fileInventory: {
          roots: [workspaceRoot]
        },
        machineInventory: {
          source: machineInventorySource
        },
        runGit: slowGitRunner,
        now: () => new Date(currentTimeMs)
      });

      currentTimeMs += 5_000;
      const machineTargeted = await engine.queryAwarenessLive({
        query: "what is using the most RAM?",
        awarenessAnswerMode: "evidence-first",
        hints: {
          maxScanMs: 300
        }
      });
      expect(machineTargeted?.scanTargets).toEqual(["machine"]);
      expect(machineTargeted?.scanTimedOut).toBe(false);

      const budgeted = await engine.queryAwarenessLive({
        query: "what changed since restart in files?",
        awarenessAnswerMode: "evidence-first",
        hints: {
          maxScanMs: 100
        }
      });
      expect(budgeted?.scanTimedOut).toBe(true);
      expect(budgeted?.scanTargets).toEqual(["repo"]);
      expect(budgeted?.bundle.uncertainty.join(" ")).toContain("Narrow scan budget was reached");
      expect(budgeted?.bundle.uncertainty.join(" ")).toContain("partially refreshed");
    });
  });

  it("returns machine-unique findings for the same question across different inventories", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const alternateMachineSource = {
        captureSystemIdentity: async () => machineInventorySource.captureSystemIdentity(),
        captureProcesses: async () => {
          const base = await machineInventorySource.captureProcesses();
          const adjusted = base.processes.map((process, index) =>
            index === 0
              ? {
                  ...process,
                  pid: 9090,
                  name: "FusionRender.exe",
                  executablePath: "C:\\Tools\\FusionRender\\FusionRender.exe",
                  memoryBytes: 950_000_000
                }
              : {
                  ...process,
                  memoryBytes: Math.min(process.memoryBytes ?? 0, 220_000_000)
                }
          );
          return {
            ...base,
            processes: adjusted
          };
        },
        captureServices: async () => machineInventorySource.captureServices(),
        captureStartup: async () => machineInventorySource.captureStartup(),
        captureInstalledApps: async () => machineInventorySource.captureInstalledApps(),
        captureEventLogs: async () => machineInventorySource.captureEventLogs()
      };

      const primaryEngine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-unique-primary",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const alternateRoot = path.join(workspaceRoot, "alternate");
      await mkdir(alternateRoot, { recursive: true });
      const alternateEngine = await initializeAwarenessEngine({
        workspaceRoot: alternateRoot,
        sessionId: "session-unique-alternate",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: alternateMachineSource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const query = "what is using the most RAM?";
      const primaryAnswer = primaryEngine.queryAwareness({
        query,
        awarenessAnswerMode: "evidence-first"
      });
      const alternateAnswer = alternateEngine.queryAwareness({
        query,
        awarenessAnswerMode: "evidence-first"
      });

      expect(primaryAnswer?.bundle.verifiedFindings.join(" ")).toContain("explorer.exe");
      expect(alternateAnswer?.bundle.verifiedFindings.join(" ")).toContain("FusionRender.exe");
      expect(primaryAnswer?.bundle.verifiedFindings.join(" ")).not.toBe(
        alternateAnswer?.bundle.verifiedFindings.join(" ")
      );
    });
  });

  it("answers file, process, service, performance, and on-screen questions from compact evidence", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const downloadsRoot = path.join(workspaceRoot, "Downloads");
      const videosRoot = path.join(workspaceRoot, "Videos");
      await mkdir(downloadsRoot, { recursive: true });
      await mkdir(videosRoot, { recursive: true });

      const secretNotesPath = path.join(downloadsRoot, "notes.txt");
      const planPath = path.join(downloadsRoot, "plan.txt");
      const freshFilePath = path.join(downloadsRoot, "today.txt");
      const smallVideoPath = path.join(videosRoot, "clip-small.mp4");
      const largeVideoPath = path.join(videosRoot, "clip-large.mp4");

      await writeFile(planPath, "initial plan");
      await writeFile(secretNotesPath, "TOP SECRET TOKEN SHOULD NEVER APPEAR IN PROMPTS");
      await writeFile(smallVideoPath, Buffer.alloc(512, 1));
      await writeFile(largeVideoPath, Buffer.alloc(4096, 2));

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-phase5",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        watchedRoots: ["SynAI"],
        ignoredRoots: [".runtime"],
        fileInventory: {
          roots: [workspaceRoot]
        },
        screenInventory: {
          source: createFixtureScreenCaptureSource(buildPhase5ScreenFixture())
        },
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });
      const fileCapturedAt = fixedIso();
      const fileFreshness = buildFreshness(fileCapturedAt);
      const fileQueryCurrent = {
          session: engine.currentSnapshot.session,
          repo: engine.currentSnapshot.repo,
          machine: engine.currentSnapshot.machine,
          machineAwareness: engine.currentSnapshot.machineAwareness,
          fileAwarenessSummary: {
            capturedAt: fileCapturedAt,
            freshness: fileFreshness,
            summary: "Synthetic file summary",
            isTruncated: false,
            counts: {
              roots: 2,
              files: 5,
              folders: 2,
              media: 2,
              recentChanges: 2,
              protectedEntries: 0,
              sensitiveEntries: 1
            },
            changeCounts: {
              created: 1,
              modified: 1,
              deleted: 0,
              renamed: 0
            },
            rootSummaries: [
              {
                path: path.normalize(downloadsRoot),
                label: "Downloads",
                fileCount: 3,
                folderCount: 1,
                totalSizeBytes: 6_000,
                recentChangeCount: 2,
                hotScore: 8
              },
              {
                path: path.normalize(videosRoot),
                label: "Videos",
                fileCount: 2,
                folderCount: 1,
                totalSizeBytes: 4_608,
                recentChangeCount: 0,
                hotScore: 2
              }
            ],
            largestFiles: [
              {
                path: path.normalize(largeVideoPath),
                sizeBytes: 4_096,
                modifiedAt: fileCapturedAt,
                category: "video",
                mediaKind: "video"
              },
              {
                path: path.normalize(smallVideoPath),
                sizeBytes: 512,
                modifiedAt: fileCapturedAt,
                category: "video",
                mediaKind: "video"
              }
            ],
            recentChanges: [
              {
                type: "created",
                path: path.normalize(freshFilePath),
                previousPath: null,
                timestamp: fileCapturedAt
              },
              {
                type: "modified",
                path: path.normalize(planPath),
                previousPath: path.normalize(planPath),
                timestamp: fileCapturedAt
              }
            ],
            hotFolders: [
              {
                path: path.normalize(downloadsRoot),
                totalSizeBytes: 6_000,
                recentChangeCount: 2,
                hotScore: 8
              },
              {
                path: path.normalize(videosRoot),
                totalSizeBytes: 4_608,
                recentChangeCount: 0,
                hotScore: 2
              }
            ],
            blockedScopes: ["sensitive local content"]
          },
          screenAwareness: engine.currentSnapshot.screenAwareness,
          digest: engine.currentSnapshot.digest,
          lastReportedBaseline: engine.currentSnapshot.lastReportedBaseline,
          fileAwarenessSnapshot: {
            capturedAt: fileCapturedAt,
            freshness: fileFreshness,
            roots: [
              {
                path: path.normalize(downloadsRoot),
                label: "Downloads",
                source: "user",
                privacyScope: "user-visible local content",
                included: true,
                excludedReason: null,
                freshness: fileFreshness,
                totalSizeBytes: 6_000,
                fileCount: 3,
                folderCount: 1,
                largeFolderCount: 0,
                hotFolderCount: 2,
                recentChangeCount: 2,
                isTruncated: false
              },
              {
                path: path.normalize(videosRoot),
                label: "Videos",
                source: "user",
                privacyScope: "user-visible local content",
                included: true,
                excludedReason: null,
                freshness: fileFreshness,
                totalSizeBytes: 4_608,
                fileCount: 2,
                folderCount: 1,
                largeFolderCount: 0,
                hotFolderCount: 0,
                recentChangeCount: 0,
                isTruncated: false
              }
            ],
            files: [
              {
                path: path.normalize(planPath),
                parentPath: path.normalize(downloadsRoot),
                name: "plan.txt",
                kind: "file",
                extension: ".txt",
                sizeBytes: 12,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "text/plain",
                contentHint: "text",
                hash: "plan-hash",
                mediaKind: null,
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                isSensitive: false,
                isProtected: false
              },
              {
                path: path.normalize(freshFilePath),
                parentPath: path.normalize(downloadsRoot),
                name: "today.txt",
                kind: "file",
                extension: ".txt",
                sizeBytes: 13,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "text/plain",
                contentHint: "text",
                hash: "fresh-hash",
                mediaKind: null,
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                isSensitive: false,
                isProtected: false
              },
              {
                path: path.normalize(secretNotesPath),
                parentPath: path.normalize(downloadsRoot),
                name: "notes.txt",
                kind: "file",
                extension: ".txt",
                sizeBytes: 48,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "text/plain",
                contentHint: "text",
                hash: null,
                mediaKind: null,
                privacyScope: "sensitive local content",
                freshness: fileFreshness,
                isSensitive: true,
                isProtected: false
              },
              {
                path: path.normalize(smallVideoPath),
                parentPath: path.normalize(videosRoot),
                name: "clip-small.mp4",
                kind: "file",
                extension: ".mp4",
                sizeBytes: 512,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "video/*",
                contentHint: "video",
                hash: "small-video-hash",
                mediaKind: "video",
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                isSensitive: false,
                isProtected: false
              },
              {
                path: path.normalize(largeVideoPath),
                parentPath: path.normalize(videosRoot),
                name: "clip-large.mp4",
                kind: "file",
                extension: ".mp4",
                sizeBytes: 4_096,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "video/*",
                contentHint: "video",
                hash: "large-video-hash",
                mediaKind: "video",
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                isSensitive: false,
                isProtected: false
              }
            ],
            folders: [
              {
                path: path.normalize(downloadsRoot),
                parentPath: path.normalize(workspaceRoot),
                name: "Downloads",
                totalSizeBytes: 6_000,
                fileCount: 3,
                folderCount: 1,
                largeFileCount: 0,
                recentChangeCount: 2,
                fileTypeCounts: {
                  txt: 3
                },
                newestModifiedAt: fileCapturedAt,
                oldestModifiedAt: fileCapturedAt,
                growthBytes: 512,
                hotScore: 8,
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                topFiles: [
                  {
                    path: path.normalize(planPath),
                    sizeBytes: 12,
                    modifiedAt: fileCapturedAt,
                    mediaKind: null
                  },
                  {
                    path: path.normalize(freshFilePath),
                    sizeBytes: 13,
                    modifiedAt: fileCapturedAt,
                    mediaKind: null
                  }
                ]
              },
              {
                path: path.normalize(videosRoot),
                parentPath: path.normalize(workspaceRoot),
                name: "Videos",
                totalSizeBytes: 4_608,
                fileCount: 2,
                folderCount: 1,
                largeFileCount: 0,
                recentChangeCount: 0,
                fileTypeCounts: {
                  video: 2
                },
                newestModifiedAt: fileCapturedAt,
                oldestModifiedAt: fileCapturedAt,
                growthBytes: 0,
                hotScore: 2,
                privacyScope: "user-visible local content",
                freshness: fileFreshness,
                topFiles: [
                  {
                    path: path.normalize(largeVideoPath),
                    sizeBytes: 4_096,
                    modifiedAt: fileCapturedAt,
                    mediaKind: "video"
                  }
                ]
              }
            ],
            media: [
              {
                path: path.normalize(smallVideoPath),
                parentPath: path.normalize(videosRoot),
                name: "clip-small.mp4",
                mediaKind: "video",
                extension: ".mp4",
                sizeBytes: 512,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "video/*",
                contentHint: "video",
                width: null,
                height: null,
                durationSeconds: null,
                codec: null,
                pageCount: null,
                previewRef: null,
                tags: ["clip", "small", "video"],
                privacyScope: "user-visible local content",
                freshness: fileFreshness
              },
              {
                path: path.normalize(largeVideoPath),
                parentPath: path.normalize(videosRoot),
                name: "clip-large.mp4",
                mediaKind: "video",
                extension: ".mp4",
                sizeBytes: 4_096,
                createdAt: fileCapturedAt,
                modifiedAt: fileCapturedAt,
                accessedAt: fileCapturedAt,
                owner: "test-user",
                mimeType: "video/*",
                contentHint: "video",
                width: null,
                height: null,
                durationSeconds: null,
                codec: null,
                pageCount: null,
                previewRef: null,
                tags: ["clip", "large", "video"],
                privacyScope: "user-visible local content",
                freshness: fileFreshness
              }
            ],
            changes: [
              {
                id: "change-created",
                timestamp: fileCapturedAt,
                type: "created",
                path: path.normalize(freshFilePath),
                previousPath: null,
                rootPath: path.normalize(downloadsRoot),
                kind: "file",
                sizeBytes: 13,
                hash: "fresh-hash",
                privacyScope: "user-visible local content",
                freshness: fileFreshness
              },
              {
                id: "change-modified",
                timestamp: fileCapturedAt,
                type: "modified",
                path: path.normalize(planPath),
                previousPath: path.normalize(planPath),
                rootPath: path.normalize(downloadsRoot),
                kind: "file",
                sizeBytes: 12,
                hash: "plan-hash",
                privacyScope: "user-visible local content",
                freshness: fileFreshness
              }
            ],
            summary: {
              capturedAt: fileCapturedAt,
              freshness: fileFreshness,
              summary: "Downloads changed today, with the largest video in Videos.",
              isTruncated: false,
              counts: {
                roots: 2,
                files: 5,
                folders: 2,
                media: 2,
                recentChanges: 2,
                protectedEntries: 0,
                sensitiveEntries: 1
              },
              changeCounts: {
                created: 1,
                modified: 1,
                deleted: 0,
                renamed: 0
              },
              rootSummaries: [
                {
                  path: path.normalize(downloadsRoot),
                  label: "Downloads",
                  fileCount: 3,
                  folderCount: 1,
                  totalSizeBytes: 6_000,
                  recentChangeCount: 2,
                  hotScore: 8
                },
                {
                  path: path.normalize(videosRoot),
                  label: "Videos",
                  fileCount: 2,
                  folderCount: 1,
                  totalSizeBytes: 4_608,
                  recentChangeCount: 0,
                  hotScore: 2
                }
              ],
              largestFiles: [
                {
                  path: path.normalize(largeVideoPath),
                  sizeBytes: 4_096,
                  modifiedAt: fileCapturedAt,
                  category: "video",
                  mediaKind: "video"
                },
                {
                  path: path.normalize(smallVideoPath),
                  sizeBytes: 512,
                  modifiedAt: fileCapturedAt,
                  category: "video",
                  mediaKind: "video"
                }
              ],
              recentChanges: [
                {
                  type: "created",
                  path: path.normalize(freshFilePath),
                  previousPath: null,
                  timestamp: fileCapturedAt
                },
                {
                  type: "modified",
                  path: path.normalize(planPath),
                  previousPath: path.normalize(planPath),
                  timestamp: fileCapturedAt
                }
              ],
              hotFolders: [
                {
                  path: path.normalize(downloadsRoot),
                  totalSizeBytes: 6_000,
                  recentChangeCount: 2,
                  hotScore: 8
                },
                {
                  path: path.normalize(videosRoot),
                  totalSizeBytes: 4_608,
                  recentChangeCount: 0,
                  hotScore: 2
                }
              ],
              blockedScopes: ["sensitive local content"]
            }
          }
      };

      const fileAnswer = buildAwarenessQueryAnswer({
        query: "what changed in Downloads today?",
        current: fileQueryCurrent,
        paths: engine.paths,
        now: fixedNow()
      });
      expect(fileAnswer?.intent.family).toBe("file-folder-media");
      expect(fileAnswer?.bundle.verifiedFindings.join(" ")).toContain("Downloads");
      expect(fileAnswer?.bundle.verifiedFindings.join(" ")).toMatch(/created|modified/);

      const mediaAnswer = buildAwarenessQueryAnswer({
        query: "where are my biggest videos?",
        current: fileQueryCurrent,
        paths: engine.paths,
        now: fixedNow()
      });
      expect(mediaAnswer?.intent.family).toBe("file-folder-media");
      expect(mediaAnswer?.bundle.verifiedFindings.join(" ")).toContain("clip-large.mp4");

      const resourceHotspotAnswer = engine.queryAwareness({ query: "what is using the most RAM?" });
      expect(resourceHotspotAnswer?.intent.family).toBe("resource-hotspot");
      expect(resourceHotspotAnswer?.bundle.resourceHotspots?.[0].label).toBe("explorer.exe#2222");
      expect(resourceHotspotAnswer?.bundle.verifiedFindings.join(" ")).toContain("Top RAM process");
      expect(resourceHotspotAnswer?.bundle.verifiedFindings.join(" ")).toContain("explorer.exe#2222");
      expect(resourceHotspotAnswer?.bundle.verifiedFindings.join(" ")).toContain("305.2MB");
      expect(resourceHotspotAnswer?.bundle.verifiedFindings.join(" ")).toContain("Publisher: Microsoft Corporation");
      expect(resourceHotspotAnswer?.bundle.suggestedNextChecks).toEqual([]);
      const performanceContextSection = buildAwarenessQueryContextSection(
        resourceHotspotAnswer ?? null,
        "what is using the most RAM?"
      );
      expect(performanceContextSection).not.toContain("Next:");
      expect(performanceContextSection).not.toContain("Safe next:");

      const systemStatsAnswer = engine.queryAwareness({ query: "what's my system stats?" });
      expect(systemStatsAnswer?.intent.family).toBe("live-usage");
      expect(systemStatsAnswer?.bundle.verifiedFindings.join(" ")).toContain("CPU load: 37%");
      expect(systemStatsAnswer?.bundle.verifiedFindings.join(" ")).toContain("RAM");
      expect(systemStatsAnswer?.bundle.verifiedFindings.join(" ")).toContain("GPU:");
      expect(systemStatsAnswer?.bundle.verifiedFindings.join(" ")).toContain("Disk:");
      expect(systemStatsAnswer?.bundle.verifiedFindings.join(" ")).toContain("Uptime:");
      expect(systemStatsAnswer?.bundle.suggestedNextChecks).toEqual([]);
      expect(systemStatsAnswer?.bundle.uncertainty).toEqual([]);

      const cpuAnswer = engine.queryAwareness({ query: "what is my cpu usage right now?" });
      expect(cpuAnswer?.intent.family).toBe("live-usage");
      expect(cpuAnswer?.bundle.verifiedFindings.join(" ")).toContain("CPU load: 37%");
      expect(cpuAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("RAM");
      expect(cpuAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("Uptime");
      expect(cpuAnswer?.bundle.uncertainty).toEqual([]);

      const cpuRamAnswer = engine.queryAwareness({ query: "my ram and cpu" });
      expect(cpuRamAnswer?.intent.family).toBe("live-usage");
      expect(cpuRamAnswer?.bundle.verifiedFindings.join(" ")).toContain("CPU load: 37%");
      expect(cpuRamAnswer?.bundle.verifiedFindings.join(" ")).toContain("RAM");
      expect(cpuRamAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("GPU:");
      expect(cpuRamAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("Disk:");
      expect(cpuRamAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("Uptime:");
      expect(cpuRamAnswer?.bundle.uncertainty).toEqual([]);

      const gpuAnswer = engine.queryAwareness({ query: "what gpu and vram do I have?" });
      expect(gpuAnswer?.intent.family).toBe("hardware");
      expect(gpuAnswer?.bundle.verifiedFindings.join(" ")).toContain("GPU:");
      expect(gpuAnswer?.bundle.verifiedFindings.join(" ")).toMatch(/VRAM|vram/);
      expect(gpuAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("CPU");
      expect(gpuAnswer?.bundle.verifiedFindings.join(" ")).not.toMatch(/\bRAM\b/);
      expect(gpuAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("Uptime");

      const vramUsageAnswer = engine.queryAwareness({ query: "what is my vram usage?" });
      expect(vramUsageAnswer?.intent.family).toBe("live-usage");
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).toContain("GPU: Test GPU");
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).toContain("live load 18%");
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).toContain("VRAM");
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("CPU");
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).not.toMatch(/\bRAM\b/);
      expect(vramUsageAnswer?.bundle.verifiedFindings.join(" ")).not.toContain("Uptime");
      expect(vramUsageAnswer?.bundle.uncertainty).toEqual([]);

      const anomalyAnswer = engine.queryAwareness({ query: "show machine anomalies from event logs" });
      expect(anomalyAnswer?.intent.family).toBe("performance-diagnostic");
      expect(anomalyAnswer?.bundle.verifiedFindings.join(" ")).toContain("event-log");

      const settingsAnswer = engine.queryAwareness({ query: "where is the Bluetooth setting?" });
      expect(settingsAnswer?.intent.family).toBe("settings-control-panel");
      expect(settingsAnswer?.bundle.verifiedFindings.join(" ")).toContain("ms-settings:bluetooth");

      const serviceAnswer = engine.queryAwareness({ query: "what service is tied to Print Spooler?" });
      expect(serviceAnswer?.intent.family).toBe("process-service-startup");
      expect(serviceAnswer?.bundle.verifiedFindings.join(" ")).toContain("Print Spooler");
      expect(serviceAnswer?.bundle.verifiedFindings.join(" ")).toContain("C:\\Windows\\System32\\spoolsv.exe");

      await engine.startAssistMode({
        scope: "current-window",
        targetLabel: "Settings",
        captureMode: "on-demand"
      });

      const screenAnswer = engine.queryAwareness({ query: "what am I looking at right now?" });
      expect(screenAnswer?.intent.family).toBe("on-screen");
      expect(screenAnswer?.bundle.verifiedFindings.join(" ")).toContain("Active window");

      const uiDiagnostic = engine.getCurrentUiDiagnostic();
      expect(uiDiagnostic.activeWindow?.title).toBe("Settings - Bluetooth");
      const eventLogDiagnostic = engine.getEventLogDiagnostic();
      expect(eventLogDiagnostic.counts.error).toBeGreaterThan(0);
      const anomalyDiagnostic = engine.getAnomalyDiagnostic();
      expect(anomalyDiagnostic.findings.length).toBeGreaterThan(0);

      const digest = engine.getDigest();
      const assembled = assembleContext({
        systemInstruction: "system",
        summaryText: "summary",
        allMessages: [
          {
            id: "msg-1",
            conversationId: "conversation-1",
            role: "user",
            content: "what changed in Downloads today?",
            createdAt: fixedIso()
          }
        ],
        stableMemories: [],
        retrievedMemories: [],
        webSearch: {
          status: "off",
          query: "",
          results: []
        },
        awareness: {
          ...digest,
          awarenessMode: "debug"
        },
        awarenessQuery: fileAnswer,
        machineAwareness: engine.machineAwareness,
        fileAwareness: engine.fileAwareness,
        screenAwareness: engine.screenAwareness
      });

      expect(assembled.preview.awarenessQuery).not.toBeNull();
      expect(assembled.promptMessages[0].content).toContain("Awareness query");
      expect(assembled.promptMessages[0].content).not.toContain("TOP SECRET TOKEN SHOULD NEVER APPEAR IN PROMPTS");
      expect(assembled.promptMessages[0].content.length).toBeLessThan(3000);
    });
  });

  it("serves awareness query, summary, and diagnostic endpoints", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-query-api",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        screenInventory: {
          source: createFixtureScreenCaptureSource(buildPhase5ScreenFixture())
        },
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      await engine.startAssistMode({
        scope: "current-window",
        targetLabel: "Settings",
        captureMode: "on-demand"
      });

      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const queryResponse = await fetch(`${api.baseUrl}/api/awareness/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: "what is using the most RAM?"
          })
        });
        expect(queryResponse.status).toBe(200);
        const query = (await queryResponse.json()) as {
          intent: { family: string };
          bundle: { verifiedFindings: string[]; confidenceLevel: string; resourceHotspots?: Array<{ label: string }> };
        };
        expect(query.intent.family).toBe("resource-hotspot");
        expect(query.bundle.verifiedFindings.join(" ")).toContain("Top RAM process");
        expect(query.bundle.resourceHotspots?.[0].label).toBe("explorer.exe#2222");

        const liveUsageResponse = await fetch(`${api.baseUrl}/api/awareness/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: "what is my cpu usage right now?"
          })
        });
        expect(liveUsageResponse.status).toBe(200);
        const liveUsage = (await liveUsageResponse.json()) as {
          intent: { family: string };
          bundle: { verifiedFindings: string[]; uncertainty: string[] };
        };
        expect(liveUsage.intent.family).toBe("live-usage");
        expect(liveUsage.bundle.verifiedFindings.join(" ")).toContain("CPU load: 37%");
        expect(liveUsage.bundle.uncertainty).toEqual([]);

        const summaryResponse = await fetch(
          `${api.baseUrl}/api/awareness/summary?scope=current-machine&mode=short`
        );
        expect(summaryResponse.status).toBe(200);
        const summary = (await summaryResponse.json()) as { scope: string; summary: string };
        expect(summary.scope).toBe("current-machine");
        expect(summary.summary.length).toBeGreaterThan(0);

        const performanceResponse = await fetch(`${api.baseUrl}/api/awareness/diagnostics/performance`);
        expect(performanceResponse.status).toBe(200);
        const performance = (await performanceResponse.json()) as {
          topProcesses: Array<{ processName: string }>;
        };
        expect(performance.topProcesses[0].processName).toBe("explorer.exe");

        const startupResponse = await fetch(`${api.baseUrl}/api/awareness/diagnostics/startup`);
        expect(startupResponse.status).toBe(200);
        const startup = (await startupResponse.json()) as { startupEntries: Array<{ name: string }> };
        expect(startup.startupEntries.length).toBeGreaterThan(0);

        const uiResponse = await fetch(`${api.baseUrl}/api/awareness/diagnostics/current-ui`);
        expect(uiResponse.status).toBe(200);
        const ui = (await uiResponse.json()) as { activeWindow: { title: string | null } | null };
        expect(ui.activeWindow?.title).toBe("Settings - Bluetooth");

        const eventsResponse = await fetch(`${api.baseUrl}/api/awareness/diagnostics/events`);
        expect(eventsResponse.status).toBe(200);
        const eventDiagnostic = (await eventsResponse.json()) as {
          counts: { critical: number; error: number };
          topProviders: Array<{ provider: string }>;
        };
        expect(eventDiagnostic.counts.critical).toBe(1);
        expect(eventDiagnostic.counts.error).toBe(2);
        expect(eventDiagnostic.topProviders.length).toBeGreaterThan(0);

        const anomaliesResponse = await fetch(`${api.baseUrl}/api/awareness/diagnostics/anomalies`);
        expect(anomaliesResponse.status).toBe(200);
        const anomalies = (await anomaliesResponse.json()) as {
          findings: Array<{ category: string; severity: string }>;
        };
        expect(anomalies.findings.length).toBeGreaterThan(0);
        expect(anomalies.findings.map((finding) => finding.category)).toContain("event-log-burst");
      } finally {
        await api.close();
      }
    });
  });

  it("serves storage diagnostics from the file-awareness snapshot", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const downloadsRoot = path.join(workspaceRoot, "Downloads");
      await mkdir(downloadsRoot, { recursive: true });
      const largeVideoPath = path.join(downloadsRoot, "movie-large.mp4");
      await writeFile(largeVideoPath, Buffer.alloc(16 * 1024, 7));

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-storage-api",
        appStartedAt: fixedNow().toISOString(),
        fileInventory: {
          roots: [workspaceRoot]
        },
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });
      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const response = await fetch(`${api.baseUrl}/api/awareness/diagnostics/storage`);
        expect(response.status).toBe(200);
        const diagnostic = (await response.json()) as {
          summary: string;
          topFiles: Array<{ path: string }>;
          hotFolders: Array<{ path: string }>;
        };
        expect(diagnostic.summary.length).toBeGreaterThan(0);
        expect(diagnostic.topFiles[0]?.path).toBe(path.normalize(largeVideoPath));
        expect(diagnostic.hotFolders.some((folder) => folder.path === path.normalize(downloadsRoot))).toBe(true);
      } finally {
        await api.close();
      }
    });
  });

  it("builds rolling metrics, startup digests, and runtime sampler health", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-runtime-insights",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      expect(engine.machineAwareness.rollingMetrics?.samples.length ?? 0).toBeGreaterThan(0);
      expect(engine.machineAwareness.summary.rollingMetrics?.cpuTrend.summary).toContain("CPU");
      expect(engine.machineAwareness.updateCorrelation?.recentUpdates[0]?.kb).toBe("KB5031455");
      expect(engine.machineAwareness.updateCorrelation?.releaseChannel).toBe("Retail");
      expect(engine.getStatus().startupDigest?.summary.length ?? 0).toBeGreaterThan(0);
      expect(
        engine.getStatus().startupDigest?.highlights.some((highlight) => highlight.includes("Latest Windows update"))
      ).toBe(true);
      expect(engine.getStatus().runtime.backgroundSamplerActive).toBe(true);
      expect(engine.getStatus().runtime.startupDigestReady).toBe(true);
    });
  });

  it("builds correlation graphs and recurring patterns across sessions", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const firstEngine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-patterns-a",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });
      await firstEngine.close();

      const secondEngine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-patterns-b",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      expect(secondEngine.machineAwareness.correlationGraph?.processLinks.length ?? 0).toBeGreaterThan(0);
      expect(secondEngine.machineAwareness.correlationGraph?.appLinks.length ?? 0).toBeGreaterThan(0);
      expect(secondEngine.machineAwareness.recurringPatterns?.length ?? 0).toBeGreaterThan(0);
      expect(
        secondEngine.machineAwareness.recurringPatterns?.some((pattern) =>
          pattern.title.toLowerCase().includes("recurring")
        )
      ).toBe(true);
    });
  });

  it("adds multi-intent planning and answer cards to grounded awareness answers", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-multi-intent",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      const answer = engine.queryAwareness({
        query: "what changed since last session and what is using my ram",
        awarenessAnswerMode: "evidence-first",
        hints: {
          force: true,
          strictGrounding: true
        }
      });

      expect(answer?.intentPlan?.secondary.length ?? 0).toBeGreaterThan(0);
      expect(answer?.card).not.toBeNull();
      expect(answer?.bundle.correlationHighlights?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it("captures screen diffs across assist-mode refreshes", async () => {
    await withWorkspace(async (workspaceRoot) => {
      let captureIndex = 0;
      const screenSource = createFixtureScreenCaptureSource({
        foregroundWindow: () => {
          const value =
            captureIndex === 0
              ? {
                  capturedAt: fixedIso(),
                  freshness: buildFreshness(fixedIso()),
                  windowHandle: "window-1",
                  title: "Settings - Bluetooth",
                  processId: 456,
                  processName: "SystemSettings.exe",
                  executablePath: "C:\\Windows\\SystemSettings.exe",
                  className: "ApplicationFrameWindow",
                  bounds: { x: 0, y: 0, width: 1280, height: 720 },
                  isForeground: true,
                  isFocused: true,
                  zOrder: 0
                }
              : {
                  capturedAt: fixedIso(),
                  freshness: buildFreshness(fixedIso()),
                  windowHandle: "window-2",
                  title: "Task Manager",
                  processId: 789,
                  processName: "Taskmgr.exe",
                  executablePath: "C:\\Windows\\System32\\Taskmgr.exe",
                  className: "TaskManagerWindow",
                  bounds: { x: 12, y: 12, width: 1280, height: 720 },
                  isForeground: true,
                  isFocused: true,
                  zOrder: 0
                };
          return value;
        },
        uiTree: () => {
          const tree =
            captureIndex === 0
              ? {
                  capturedAt: fixedIso(),
                  freshness: buildFreshness(fixedIso()),
                  scope: "current-window" as const,
                  targetLabel: "Settings",
                  rootWindowHandle: "window-1",
                  rootWindowTitle: "Settings - Bluetooth",
                  cursorPosition: { x: 24, y: 24 },
                  elementUnderCursor: {
                    id: "toggle",
                    automationId: "BluetoothToggle",
                    controlType: "Button",
                    localizedControlType: "button",
                    name: "Bluetooth",
                    value: null,
                    className: "Button",
                    helpText: null,
                    bounds: { x: 20, y: 20, width: 120, height: 24 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  focusedElement: {
                    id: "toggle",
                    automationId: "BluetoothToggle",
                    controlType: "Button",
                    localizedControlType: "button",
                    name: "Bluetooth",
                    value: null,
                    className: "Button",
                    helpText: null,
                    bounds: { x: 20, y: 20, width: 120, height: 24 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  root: {
                    id: "root-1",
                    automationId: null,
                    controlType: "Window",
                    localizedControlType: "window",
                    name: "Settings - Bluetooth",
                    value: null,
                    className: "Window",
                    helpText: null,
                    bounds: { x: 0, y: 0, width: 1280, height: 720 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  totalCount: 1,
                  isTruncated: false,
                  redactedCount: 0
                }
              : {
                  capturedAt: fixedIso(),
                  freshness: buildFreshness(fixedIso()),
                  scope: "current-window" as const,
                  targetLabel: "Task Manager",
                  rootWindowHandle: "window-2",
                  rootWindowTitle: "Task Manager",
                  cursorPosition: { x: 40, y: 40 },
                  elementUnderCursor: {
                    id: "process-list",
                    automationId: "ProcessList",
                    controlType: "List",
                    localizedControlType: "list",
                    name: "Processes",
                    value: null,
                    className: "List",
                    helpText: null,
                    bounds: { x: 40, y: 40, width: 320, height: 400 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  focusedElement: {
                    id: "process-list",
                    automationId: "ProcessList",
                    controlType: "List",
                    localizedControlType: "list",
                    name: "Processes",
                    value: null,
                    className: "List",
                    helpText: null,
                    bounds: { x: 40, y: 40, width: 320, height: 400 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  root: {
                    id: "root-2",
                    automationId: null,
                    controlType: "Window",
                    localizedControlType: "window",
                    name: "Task Manager",
                    value: null,
                    className: "Window",
                    helpText: null,
                    bounds: { x: 0, y: 0, width: 1280, height: 720 },
                    enabled: true,
                    focused: true,
                    selected: false,
                    offscreen: false,
                    visible: true,
                    isPassword: false,
                    privacyScope: "user-visible local content" as const,
                    children: []
                  },
                  totalCount: 1,
                  isTruncated: false,
                  redactedCount: 0
                };

          captureIndex += 1;
          return tree;
        }
      });

      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-screen-diff",
        appStartedAt: fixedNow().toISOString(),
        machineInventory: {
          source: machineInventorySource
        },
        screenInventory: {
          source: screenSource
        },
        runGit: gitRunner,
        now: fixedNow
      });

      await engine.startAssistMode({ scope: "current-window", captureMode: "on-demand" });
      await engine.refreshScreen("diff-check");

      expect(engine.screenAwareness?.summary.diff?.changed).toBe(true);
      expect(engine.screenAwareness?.summary.diff?.activeWindowChanged).toBe(true);
    });
  });
});
