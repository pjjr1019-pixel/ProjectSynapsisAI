import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../../memory/src/index";
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
import { captureMachineAwarenessSnapshot, createFixtureMachineInventorySource } from "../src/machine";
import { buildAwarenessQueryAnswer, routeAwarenessIntent } from "../src/reasoning";
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
          resolution: "1920x1080"
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
  const repoCapture = captureRepoBaseline({
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

      const events = await readAwarenessJournal(engine.paths.eventsPath);
      expect(events.map((event) => event.type)).toContain("baseline_restored");
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

  it("generates compact awareness digests and keeps context assembly small", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const repoCapture = captureRepoBaseline({
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
      const repoCapture = captureRepoBaseline({
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
        const status = (await statusResponse.json()) as { summary: string; supportedPermissionTiers: string[] };
        expect(status.summary).toContain("repo main@abc1234");
        expect(status.supportedPermissionTiers).toEqual(["Observe", "Open/Navigate"]);

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
      expect(routeAwarenessIntent("what is using the most RAM?").family).toBe("performance-diagnostic");
      expect(routeAwarenessIntent("what am I looking at right now?").family).toBe("on-screen");

      const weakAnswer = engine.queryAwareness({ query: "what changed since last session?" });
      expect(weakAnswer?.intent.family).toBe("repo-change");
      expect(weakAnswer?.bundle.uncertainty.join(" ")).toContain(
        "No previous session snapshot was available."
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

      const performanceAnswer = engine.queryAwareness({ query: "what is using the most RAM?" });
      expect(performanceAnswer?.intent.family).toBe("performance-diagnostic");
      expect(performanceAnswer?.bundle.verifiedFindings.join(" ")).toContain("explorer.exe");

      const settingsAnswer = engine.queryAwareness({ query: "where is the Bluetooth setting?" });
      expect(settingsAnswer?.intent.family).toBe("settings-control-panel");
      expect(settingsAnswer?.bundle.verifiedFindings.join(" ")).toContain("ms-settings:bluetooth");

      const serviceAnswer = engine.queryAwareness({ query: "what service is tied to Print Spooler?" });
      expect(serviceAnswer?.intent.family).toBe("process-service-startup");
      expect(serviceAnswer?.bundle.verifiedFindings.join(" ")).toContain("Print Spooler");

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
          bundle: { verifiedFindings: string[]; confidenceLevel: string };
        };
        expect(query.intent.family).toBe("performance-diagnostic");
        expect(query.bundle.verifiedFindings.join(" ")).toContain("explorer.exe");

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
      } finally {
        await api.close();
      }
    });
  });
});
