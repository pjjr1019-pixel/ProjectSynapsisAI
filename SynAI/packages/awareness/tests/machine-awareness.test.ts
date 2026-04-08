import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../../memory/src/index";
import { createAwarenessApiServer } from "../src/api";
import { initializeAwarenessEngine } from "../src/bootstrap";
import {
  buildMachineAwarenessContextSection,
  buildMachineAwarenessSummary,
  captureMachineAwarenessSnapshot,
  createFixtureMachineInventorySource,
  findControlPanelEntry,
  findRegistryZoneEntry,
  findSettingsMapEntry
} from "../src/machine";

const fixedNow = (): Date => new Date("2026-04-08T01:00:00.000Z");

const buildFreshness = (capturedAt: string) => ({
  capturedAt,
  generatedAt: capturedAt,
  observedAt: capturedAt,
  ageMs: 0,
  staleAfterMs: 5 * 60 * 1000,
  isFresh: true
});

const timestamp = fixedNow().toISOString();
const freshness = buildFreshness(timestamp);

const machineInventorySource = createFixtureMachineInventorySource({
  systemIdentity: {
    capturedAt: timestamp,
    freshness,
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
      capturedAt: timestamp,
      freshness,
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
    capturedAt: timestamp,
    freshness,
    totalCount: 2,
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
        name: "OneDrive.exe",
        executablePath: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe",
        commandLine: "\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background",
        cpuSeconds: 6.1,
        memoryBytes: 180_000_000,
        ioReadBytes: 8_000_000,
        ioWriteBytes: 2_000_000,
        startTime: "2026-04-08T00:55:00.000Z",
        signer: null,
        publisher: "Microsoft Corporation",
        windowTitle: "OneDrive"
      }
    ]
  },
  services: {
    capturedAt: timestamp,
    freshness,
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
    capturedAt: timestamp,
    freshness,
    totalCount: 2,
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
    scheduledTaskEntries: [],
    launcherHints: []
  },
  installedApps: {
    capturedAt: timestamp,
    freshness,
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
        name: "Microsoft OneDrive",
        publisher: "Microsoft Corporation",
        version: "25.0.0.0",
        installLocation: "C:\\Program Files\\Microsoft OneDrive",
        installDate: "20260401",
        uninstallCommand: "\"C:\\Program Files\\Microsoft OneDrive\\OneDriveSetup.exe\" /uninstall",
        quietUninstallCommand: null,
        displayIcon: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe",
        estimatedSizeKb: 2048000,
        sources: ["HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OneDrive"],
        associatedProcessIds: [],
        associatedProcessNames: [],
        startupReferences: []
      }
    ]
  }
});

const withWorkspace = async <T>(fn: (workspaceRoot: string) => Promise<T>): Promise<T> => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "synai-machine-awareness-"));
  try {
    return await fn(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
};

const runGit = (args: string[], cwd: string): string | null => {
  void cwd;
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
      "abc1234567890abcdef1234567890abcdef123456\tabc1234\t2026-04-08T00:55:00.000Z\tInitial awareness snapshot"
    ].join("\n");
  }

  return null;
};

describe("machine awareness", () => {
  it("captures structured machine snapshots and keeps summaries compact", async () => {
    const snapshot = await captureMachineAwarenessSnapshot({
      now: fixedNow,
      source: machineInventorySource
    });

    expect(snapshot.systemIdentity.machineName).toBe("test-machine");
    expect(snapshot.processSnapshot.totalCount).toBe(2);
    expect(snapshot.serviceSnapshot.totalCount).toBe(2);
    expect(snapshot.startupSnapshot.totalCount).toBe(2);
    expect(snapshot.installedAppsSnapshot.totalCount).toBe(2);
    expect(snapshot.installedAppsSnapshot.apps[0].associatedProcessNames).toContain("SynAI.exe");
    expect(snapshot.installedAppsSnapshot.apps[0].startupReferences.length).toBeGreaterThan(0);
    expect(snapshot.summary.summary).toContain("test-machine");
    expect(snapshot.summary.summary.length).toBeLessThan(220);
    expect(snapshot.summary.highlights.processes[0]).toContain("SynAI.exe#1111");
  });

  it("looks up Windows settings, control panel items, and registry zones", () => {
    expect(findSettingsMapEntry("taskbar")?.launchTarget).toBe("ms-settings:taskbar");
    expect(findSettingsMapEntry("display")?.launchTarget).toBe("ms-settings:display");
    expect(findControlPanelEntry("device manager")?.launchTarget).toBe("devmgmt.msc");
    expect(findControlPanelEntry("registry")?.launchTarget).toBe("regedit.exe");
    expect(findRegistryZoneEntry("startup")?.path).toContain("Run");
    expect(findRegistryZoneEntry("uninstall")?.path).toContain("Uninstall");
  });

  it("injects only a compact machine section when the query is relevant", async () => {
    const snapshot = await captureMachineAwarenessSnapshot({
      now: fixedNow,
      source: machineInventorySource
    });
    const assembled = assembleContext({
      systemInstruction: "system",
      summaryText: "summary",
      allMessages: [
        {
          id: "msg-1",
          conversationId: "conversation-1",
          role: "user",
          content: "what processes are running?",
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
      machineAwareness: snapshot
    });

    expect(assembled.promptMessages[0].content).toContain("Machine awareness:");
    expect(assembled.promptMessages[0].content).toContain("Processes:");
    expect(assembled.promptMessages[0].content).not.toContain("C:\\Apps\\SynAI\\SynAI.exe\" --profile local");
    expect(assembled.promptMessages[0].content.length).toBeLessThan(1600);
  });

  it("serves the machine inventory endpoints on localhost", async () => {
    await withWorkspace(async (workspaceRoot) => {
      const engine = await initializeAwarenessEngine({
        workspaceRoot,
        sessionId: "session-machine-api",
        appStartedAt: fixedNow().toISOString(),
        activeFeatureFlags: ["local-chat", "memory"],
        machineInventory: {
          source: machineInventorySource
        },
        runGit,
        now: fixedNow
      });

      const api = await createAwarenessApiServer(engine, { host: "127.0.0.1" });

      try {
        const statusResponse = await fetch(`${api.baseUrl}/api/awareness/status`);
        expect(statusResponse.status).toBe(200);
        const status = (await statusResponse.json()) as { machineAwareness: { summary: string } };
        expect(status.machineAwareness.summary).toContain("test-machine");

        const identityResponse = await fetch(`${api.baseUrl}/api/awareness/system/identity`);
        expect(identityResponse.status).toBe(200);
        const identity = (await identityResponse.json()) as { machineName: string };
        expect(identity.machineName).toBe("test-machine");

        const processesResponse = await fetch(`${api.baseUrl}/api/awareness/system/processes`);
        expect(processesResponse.status).toBe(200);
        const processes = (await processesResponse.json()) as { processes: Array<{ name: string }> };
        expect(processes.processes.map((entry) => entry.name)).toContain("SynAI.exe");

        const servicesResponse = await fetch(`${api.baseUrl}/api/awareness/system/services`);
        expect(servicesResponse.status).toBe(200);
        const services = (await servicesResponse.json()) as { services: Array<{ serviceName: string }> };
        expect(services.services.map((entry) => entry.serviceName)).toContain("Spooler");

        const startupResponse = await fetch(`${api.baseUrl}/api/awareness/system/startup`);
        expect(startupResponse.status).toBe(200);
        const startup = (await startupResponse.json()) as { folderEntries: Array<{ name: string }> };
        expect(startup.folderEntries.map((entry) => entry.name)).toContain("SynAI Launcher");

        const appsResponse = await fetch(`${api.baseUrl}/api/awareness/system/apps`);
        expect(appsResponse.status).toBe(200);
        const apps = (await appsResponse.json()) as { apps: Array<{ name: string }> };
        expect(apps.apps.map((entry) => entry.name)).toContain("SynAI");

        const settingsResponse = await fetch(`${api.baseUrl}/api/awareness/system/settings-map`);
        expect(settingsResponse.status).toBe(200);
        const settings = (await settingsResponse.json()) as { entries: Array<{ label: string }> };
        expect(settings.entries.map((entry) => entry.label)).toContain("Display");

        const controlResponse = await fetch(`${api.baseUrl}/api/awareness/system/control-map`);
        expect(controlResponse.status).toBe(200);
        const controls = (await controlResponse.json()) as { entries: Array<{ label: string }> };
        expect(controls.entries.map((entry) => entry.label)).toContain("Device Manager");

        const registryResponse = await fetch(`${api.baseUrl}/api/awareness/system/registry-zones`);
        expect(registryResponse.status).toBe(200);
        const registry = (await registryResponse.json()) as { zones: Array<{ category: string }> };
        expect(registry.zones.map((entry) => entry.category)).toContain("startup");
      } finally {
        await api.close();
      }
    });
  });

  it("builds a compact machine-aware context section for relevant queries", async () => {
    const snapshot = await captureMachineAwarenessSnapshot({
      now: fixedNow,
      source: machineInventorySource
    });
    const section = buildMachineAwarenessContextSection(snapshot, "where is this Windows setting?", "observe");

    expect(section).not.toBeNull();
    expect(section).toContain("Machine awareness:");
    expect(section).toContain("Settings map:");
    expect(section?.length ?? 0).toBeLessThan(1200);

    const summary = buildMachineAwarenessSummary(snapshot);
    expect(summary.summary).toContain("test-machine");
    expect(summary.summary).toContain("processes");
  });
});
