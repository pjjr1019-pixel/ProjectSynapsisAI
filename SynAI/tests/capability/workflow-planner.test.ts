import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { WebSearchContext } from "@contracts";
import { buildWorkflowPlan, type WorkflowPlanningContext } from "../../apps/desktop/electron/workflow-planner";

const chromeApp = {
  name: "Google Chrome",
  publisher: "Google LLC",
  installLocation: "C:/Program Files/Google/Chrome/Application",
  uninstallCommand: 'chrome_installer.exe --uninstall',
  quietUninstallCommand: 'chrome_installer.exe --uninstall --force-uninstall',
  displayIcon: "chrome.exe",
  associatedProcessNames: ["chrome.exe"],
  associatedProcessIds: [1234],
  startupReferences: []
};

const chromeProcess = {
  name: "chrome.exe",
  pid: 1234,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  commandLine: "chrome.exe --profile-directory=Default",
  windowTitle: "Google Chrome"
};

const buildContext = (overrides: Partial<WorkflowPlanningContext> = {}): WorkflowPlanningContext =>
  ({
    workspaceRoot: "C:/workspace",
    desktopPath: "C:/Users/Alex/Desktop",
    documentsPath: "C:/Users/Alex/Documents",
    machineAwareness: {
      summary: {
        machineName: "DESKTOP-TEST"
      },
      processSnapshot: {
        totalCount: 1,
        processes: [chromeProcess]
      },
      serviceSnapshot: {
        totalCount: 0,
        services: []
      },
      installedAppsSnapshot: {
        totalCount: 1,
        apps: [chromeApp]
      }
    } as any,
    fileAwareness: {
      counts: {
        files: 12,
        folders: 4,
        media: 2
      },
      hotFolders: [{ path: "C:/workspace" }]
    } as any,
    screenAwareness: {
      foregroundWindow: { title: "Explorer" },
      uiTree: { focusedElement: { name: "Address bar" } },
      assistMode: { enabled: true }
    } as any,
    recentWebContext: null,
    ...overrides
  }) satisfies WorkflowPlanningContext;

const buildWebContext = (title: string): WebSearchContext => ({
  status: "used",
  query: "current state of AI",
  results: [
    {
      title,
      url: `https://example.com/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`,
      source: "Example News",
      snippet: `${title} summary`,
      publishedAt: "2026-04-10T00:00:00.000Z"
    }
  ]
});

describe("workflow planner", () => {
  it("builds a research workflow that saves a report in Documents", async () => {
    const plan = await buildWorkflowPlan(
      "research the current state of AI and write a report and save it in my documents",
      buildContext({
        recentWebContext: buildWebContext("State of AI 2026")
      })
    );

    expect(plan.family).toBe("research-report");
    expect(plan.workflowHash).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.targetPaths[0]).toContain("Documents");
    expect(plan.steps.map((step) => step.kind)).toEqual(
      expect.arrayContaining(["collect-web", "browser-open", "write-markdown"])
    );
  });

  it("builds a computer-health report workflow that saves to Desktop", async () => {
    const plan = await buildWorkflowPlan(
      "give me a report on my computers health and save it in a md file on my desktop",
      buildContext()
    );

    expect(plan.family).toBe("computer-health-report");
    expect(plan.approvalRequired).toBe(false);
    expect(plan.targetPaths[0]).toContain("Desktop");
    expect(plan.steps.map((step) => step.kind)).toEqual(
      expect.arrayContaining(["collect-machine", "collect-file", "write-markdown"])
    );
  });

  it("builds an application workflow for launching a program", async () => {
    const plan = await buildWorkflowPlan("launch notepad", buildContext());

    expect(plan.family).toBe("application-management");
    expect(plan.steps[0]?.kind).toBe("desktop-action");
    expect(plan.steps[0]?.actionId).toBe("launch-program");
    expect(plan.targetPaths).toEqual(expect.arrayContaining(["notepad.exe"]));
  });

  it("builds application workflows for shell launch prompts from chat history", async () => {
    const cmdPlan = await buildWorkflowPlan("open cmd", buildContext());
    expect(cmdPlan.family).toBe("application-management");
    expect(cmdPlan.steps[0]?.actionId).toBe("launch-program");
    expect(cmdPlan.steps[0]?.target).toBe("cmd.exe");
    expect(cmdPlan.targetPaths[0]).toBe("cmd.exe");

    const powershellPlan = await buildWorkflowPlan("open powershell", buildContext());
    expect(powershellPlan.family).toBe("application-management");
    expect(powershellPlan.steps[0]?.target).toBe("powershell.exe");
    expect(powershellPlan.targetPaths[0]).toBe("powershell.exe");

    const terminalPlan = await buildWorkflowPlan("open terminal", buildContext());
    expect(terminalPlan.family).toBe("application-management");
    expect(terminalPlan.steps[0]?.target).toBe("wt.exe");
    expect(terminalPlan.targetPaths[0]).toBe("wt.exe");

    const notepadPlusPlan = await buildWorkflowPlan("open notepad++", buildContext());
    expect(notepadPlusPlan.family).toBe("application-management");
    expect(notepadPlusPlan.steps[0]?.target).toBe("notepad++.exe");
    expect(notepadPlusPlan.targetPaths[0]).toBe("notepad++.exe");
  });

  it("builds browser-navigation workflows for site open prompts", async () => {
    const googlePlan = await buildWorkflowPlan("open google", buildContext());
    expect(googlePlan.family).toBe("browser-playback");
    expect(googlePlan.steps[0]?.kind).toBe("browser-open");
    expect(googlePlan.steps[0]?.url).toBe("https://www.google.com");
    expect(googlePlan.targetPaths[0]).toBe("https://www.google.com");

    const youtubePlan = await buildWorkflowPlan("open youtube", buildContext());
    expect(youtubePlan.family).toBe("browser-playback");
    expect(youtubePlan.steps[0]?.kind).toBe("browser-open");
    expect(youtubePlan.steps[0]?.url).toBe("https://www.youtube.com");
    expect(youtubePlan.targetPaths[0]).toBe("https://www.youtube.com");

    const facebookPlan = await buildWorkflowPlan("open facebook.com", buildContext());
    expect(facebookPlan.family).toBe("browser-playback");
    expect(facebookPlan.steps[0]?.kind).toBe("browser-open");
    expect(facebookPlan.steps[0]?.url).toBe("https://facebook.com");
    expect(facebookPlan.targetPaths[0]).toBe("https://facebook.com");

    const bingPlan = await buildWorkflowPlan("open bing", buildContext());
    expect(bingPlan.family).toBe("browser-playback");
    expect(bingPlan.steps[0]?.kind).toBe("browser-open");
    expect(bingPlan.steps[0]?.url).toBe("https://www.bing.com");
    expect(bingPlan.targetPaths[0]).toBe("https://www.bing.com");

    const githubPlan = await buildWorkflowPlan("open github", buildContext());
    expect(githubPlan.family).toBe("browser-playback");
    expect(githubPlan.steps[0]?.kind).toBe("browser-open");
    expect(githubPlan.steps[0]?.url).toBe("https://github.com");
    expect(githubPlan.targetPaths[0]).toBe("https://github.com");

    const duckduckgoPlan = await buildWorkflowPlan("open duckduckgo", buildContext());
    expect(duckduckgoPlan.family).toBe("browser-playback");
    expect(duckduckgoPlan.steps[0]?.kind).toBe("browser-open");
    expect(duckduckgoPlan.steps[0]?.url).toBe("https://duckduckgo.com");
    expect(duckduckgoPlan.targetPaths[0]).toBe("https://duckduckgo.com");

    const redditPlan = await buildWorkflowPlan("open reddit", buildContext());
    expect(redditPlan.family).toBe("browser-playback");
    expect(redditPlan.steps[0]?.kind).toBe("browser-open");
    expect(redditPlan.steps[0]?.url).toBe("https://www.reddit.com");
    expect(redditPlan.targetPaths[0]).toBe("https://www.reddit.com");
  });

  it("builds a system-navigation workflow for Add or Remove Programs", async () => {
    const plan = await buildWorkflowPlan("open Add or Remove Programs", buildContext());

    expect(plan.family).toBe("system-navigation");
    expect(plan.steps[0]?.actionId).toBe("open-add-remove-programs");
    expect(plan.targetPaths[0]).toBe("ms-settings:appsfeatures");
  });

  it("builds the remaining history-failed workflows for registry, files, closing, and desktop organization", async () => {
    const registryPlan = await buildWorkflowPlan("open registry", buildContext());
    expect(registryPlan.family).toBe("system-navigation");
    expect(registryPlan.steps[0]?.actionId).toBe("open-registry-editor");
    expect(registryPlan.targetPaths[0]).toBe("regedit");

    const fileDirectoryPlan = await buildWorkflowPlan("open file directory", buildContext());
    expect(fileDirectoryPlan.family).toBe("file-management");
    expect(fileDirectoryPlan.steps[0]?.kind).toBe("desktop-action");
    expect(fileDirectoryPlan.steps[0]?.actionId).toBe("open-file");
    expect(fileDirectoryPlan.steps[0]?.target).toBe("C:/Users/Alex/Documents");

    const closeSynaiPlan = await buildWorkflowPlan("close synai", buildContext());
    expect(closeSynaiPlan.family).toBe("application-management");
    expect(closeSynaiPlan.steps[0]?.actionId).toBe("close-app");
    expect(closeSynaiPlan.steps[0]?.target).toBe("SynAI");

    const organizePlan = await buildWorkflowPlan("orginaze my desktop", buildContext());
    expect(organizePlan.family).toBe("maintenance-review");
    expect(organizePlan.steps.map((step) => step.kind)).toEqual(
      expect.arrayContaining(["collect-machine", "collect-file", "write-markdown"])
    );
  });

  it("builds a bulk desktop organization workflow from the actual desktop contents", async () => {
    const root = await mkdtemp(join(tmpdir(), "synai-desktop-"));
    const desktopPath = join(root, "Desktop");
    await mkdir(desktopPath, { recursive: true });
    await writeFile(join(desktopPath, "alpha.txt"), "alpha", "utf8");
    await writeFile(join(desktopPath, "beta.txt"), "beta", "utf8");
    await mkdir(join(desktopPath, "Projects"), { recursive: true });

    try {
      const plan = await buildWorkflowPlan(
        "move everything on my desktop into a new folder named organize laster",
        buildContext({
          desktopPath,
          fileAwareness: {
            counts: {
              files: 3,
              folders: 1,
              media: 1
            },
            hotFolders: [{ path: desktopPath }]
          } as any
        })
      );

      expect(plan.family).toBe("file-management");
      expect(plan.approvalRequired).toBe(true);
      expect(plan.steps[0]?.actionId).toBe("create-folder");
      expect(plan.steps.some((step) => step.actionId === "move-item")).toBe(true);
      expect(plan.targetPaths[0]).toContain("organize laster");
      expect(plan.steps.filter((step) => step.actionId === "move-item")).toHaveLength(3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("builds a file workflow that creates, renames, and moves a file", async () => {
    const plan = await buildWorkflowPlan(
      "create a file on my desktop rename it to bob then move it into my document folder",
      buildContext()
    );

    expect(plan.family).toBe("file-management");
    expect(plan.steps.map((step) => step.id)).toEqual(["create-file", "rename-file", "move-file"]);
    expect(plan.approvalRequired).toBe(false);
    expect(plan.steps[0]?.target).toContain("Desktop");
    expect(plan.steps[1]?.destination).toContain("bob");
    expect(plan.steps[2]?.destination).toContain("Documents");
  });

  it("asks for clarification when a kill task is ambiguous", async () => {
    const plan = await buildWorkflowPlan("kill task", buildContext());

    expect(plan.family).toBe("process-control");
    expect(plan.clarificationNeeded.length).toBeGreaterThan(0);
    expect(plan.steps[0]?.kind).toBe("confirm-approval");
  });

  it("builds an approval-gated uninstall workflow for Chrome", async () => {
    const plan = await buildWorkflowPlan("remove chrome completely from my system", buildContext());

    expect(plan.family).toBe("app-uninstall");
    expect(plan.approvalRequired).toBe(true);
    expect(plan.steps.map((step) => step.actionId)).toContain("uninstall-app");
    expect(plan.targetPaths[0]).toBe("Google Chrome");
  });

  it("changes the workflow hash when the plan content changes", async () => {
    const planA = await buildWorkflowPlan(
      "research the current state of AI and write a report and save it in my documents",
      buildContext({
        recentWebContext: buildWebContext("State of AI 2026")
      })
    );
    const planB = await buildWorkflowPlan(
      "research the current state of AI and write a report and save it in my documents",
      buildContext({
        recentWebContext: buildWebContext("AI Safety 2026")
      })
    );

    expect(planA.workflowHash).not.toBe(planB.workflowHash);
  });
});
