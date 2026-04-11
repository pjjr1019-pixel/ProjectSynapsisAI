import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const loadContextModules = async () => {
  const scanModule = await import("../../scripts/context/scan-repo.mjs");
  const refreshModule = await import("../../scripts/context/refresh-context.mjs");
  return {
    scanRepository: scanModule.scanRepository as (options?: Record<string, unknown>) => Promise<any>,
    refreshContext: refreshModule.refreshContext as (options?: Record<string, unknown>) => Promise<any>
  };
};

const writeFixtureFile = async (root: string, relativePath: string, content: string) => {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createFixtureRepo = async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "synai-context-"));
  await writeFixtureFile(repoRoot, "docs/secondary.md", "# Secondary context\n");
  await writeFixtureFile(repoRoot, "SynAI/package.json", JSON.stringify({ name: "synai-context-test", private: true }, null, 2));
  await writeFixtureFile(repoRoot, "SynAI/tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022" } }, null, 2));
  await writeFixtureFile(repoRoot, "SynAI/vite.config.ts", 'import { defineConfig } from "vite";\nexport default defineConfig({});\n');
  await writeFixtureFile(repoRoot, "SynAI/vite.config.js", "module.exports = {};\n");
  await writeFixtureFile(repoRoot, "SynAI/electron.vite.config.ts", 'export default { main: { entry: "apps/desktop/electron/main.ts" } };\n');
  await writeFixtureFile(repoRoot, "SynAI/apps/desktop/electron/main.ts", 'import { join } from "node:path";\nexport const launch = () => join("a", "b");\n');
  await writeFixtureFile(repoRoot, "SynAI/packages/Governance-Execution/package.json", JSON.stringify({ name: "gov-exec", private: true }, null, 2));
  await writeFixtureFile(repoRoot, "SynAI/apps/vscode-capability-testing/package.json", JSON.stringify({ name: "vscode-capability-testing", private: true }, null, 2));
  await writeFixtureFile(repoRoot, "SynAI/tests/capability/main.test.ts", 'import { describe, it, expect } from "vitest";\nimport { launch } from "../../apps/desktop/electron/main";\ndescribe("main", () => { it("works", () => expect(launch()).toBe("a/b")); });\n');
  await writeFixtureFile(repoRoot, "SynAI/packages/Awareness-Reasoning/src/contracts/broken.ts", "export const broken = ;\n");
  await writeFixtureFile(repoRoot, "SynAI/node_modules/ignored-package/index.js", "module.exports = {};\n");
  await writeFixtureFile(repoRoot, "SynAI/context/ignored.md", "ignored\n");
  await writeFixtureFile(repoRoot, "SynAI/artifacts/ignored.json", "{}\n");

  return repoRoot;
};

const cleanupRoots: string[] = [];

afterEach(async () => {
  while (cleanupRoots.length > 0) {
    const root = cleanupRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("context pipeline", () => {
  it("scans deterministic repo facts and tolerates parse failures", async () => {
    const repoRoot = await createFixtureRepo();
    cleanupRoots.push(repoRoot);
    const synaiRoot = path.join(repoRoot, "SynAI");
    const artifactsDir = path.join(synaiRoot, "artifacts");
    const { scanRepository } = await loadContextModules();

    const result = await scanRepository({
      repoRoot,
      synaiRoot,
      artifactsDir
    });

    const repoTree = result.artifacts["repo-tree.json"] as Array<{ path: string; area: string }>;
    const imports = result.artifacts["imports.json"] as Array<{ path: string; parseConfidence: string; errors: string[] }>;
    const duplicates = result.artifacts["duplicate-candidates.json"] as Array<{
      members: string[];
      canonicalCandidate: string | null;
      action: string;
    }>;
    const configSurfaces = result.artifacts["config-surfaces.json"] as Array<{
      path: string;
      pairedWith: string[];
    }>;
    const boundaries = result.artifacts["package-boundaries.json"] as Array<{ root: string }>;

    expect(repoTree).toContainEqual(expect.objectContaining({ path: "SynAI/apps/desktop/electron/main.ts", area: "primary-synai" }));
    expect(repoTree).toContainEqual(expect.objectContaining({ path: "docs/secondary.md", area: "secondary-root" }));
    expect(repoTree.some((entry) => entry.path.includes("node_modules"))).toBe(false);
    expect(repoTree.some((entry) => entry.path.startsWith("SynAI/context/"))).toBe(false);
    expect(repoTree.some((entry) => entry.path.startsWith("SynAI/artifacts/"))).toBe(false);

    const brokenImportEntry = imports.find((entry) => entry.path === "SynAI/packages/Awareness-Reasoning/src/contracts/broken.ts");
    expect(brokenImportEntry?.errors.length).toBeGreaterThan(0);
    expect(brokenImportEntry?.parseConfidence).not.toBe("not-applicable");

    const viteDuplicate = duplicates.find((entry) => entry.members.includes("SynAI/vite.config.ts") && entry.members.includes("SynAI/vite.config.js"));
    expect(viteDuplicate).toEqual(expect.objectContaining({
      canonicalCandidate: "SynAI/vite.config.ts",
      action: "document-only"
    }));
    expect(configSurfaces.find((entry) => entry.path === "SynAI/vite.config.ts")?.pairedWith).toEqual(["SynAI/vite.config.js"]);
    expect(configSurfaces.find((entry) => entry.path === "SynAI/vite.config.js")?.pairedWith).toEqual(["SynAI/vite.config.ts"]);

    expect(boundaries.map((entry) => entry.root)).toEqual(expect.arrayContaining([
      "SynAI",
      "SynAI/apps/desktop",
      "SynAI/apps/vscode-capability-testing",
      "SynAI/packages/Governance-Execution"
    ]));
  });

  it("refreshes canonical context docs and skips duplicate js mirror notes on rerun", async () => {
    const repoRoot = await createFixtureRepo();
    cleanupRoots.push(repoRoot);
    const synaiRoot = path.join(repoRoot, "SynAI");
    const artifactsDir = path.join(synaiRoot, "artifacts");
    const contextDir = path.join(synaiRoot, "context");
    const fileNotesDir = path.join(contextDir, "file-notes");
    const taskPacksDir = path.join(contextDir, "task-packs");
    const { scanRepository, refreshContext } = await loadContextModules();

    await scanRepository({
      repoRoot,
      synaiRoot,
      artifactsDir
    });

    const firstRefresh = await refreshContext({
      repoRoot,
      synaiRoot,
      artifactsDir,
      contextDir,
      fileNotesDir,
      taskPacksDir
    });
    const secondRefresh = await refreshContext({
      repoRoot,
      synaiRoot,
      artifactsDir,
      contextDir,
      fileNotesDir,
      taskPacksDir
    });

    expect(firstRefresh.rewrittenCount).toBeGreaterThan(0);
    expect(secondRefresh.rewrittenCount).toBe(0);

    const agentGuide = await readFile(path.join(contextDir, "AGENT_GUIDE.md"), "utf8");
    const mainNote = await readFile(path.join(fileNotesDir, "apps/desktop/electron/main.ts.md"), "utf8");

    expect(agentGuide).toContain("`SynAI` is the canonical app/package root.");
    expect(mainNote).toContain("## Path");
    expect(mainNote).toContain("SynAI/apps/desktop/electron/main.ts");
    expect(mainNote).toContain("## Edit Guidance");

    await expect(readFile(path.join(fileNotesDir, "vite.config.ts.md"), "utf8")).resolves.toContain("## Path");
    await expect(readFile(path.join(fileNotesDir, "vite.config.js.md"), "utf8")).rejects.toThrow();
  });
});
