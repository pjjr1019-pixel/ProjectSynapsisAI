import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  buildCapabilityCliArgs,
  discoverCapabilityCards,
  parseCapabilityCliSummary,
  resolveCardArtifactPath
} from "../../apps/vscode-capability-testing/src/core";

describe("vscode capability extension smoke helpers", () => {
  it("discovers capability cards for Test Explorer listing", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-vscode-"));
    const cardsRoot = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards", "windows");
    await mkdir(cardsRoot, { recursive: true });
    await writeFile(
      path.join(cardsRoot, "one.json"),
      `${JSON.stringify({ id: "windows.one", name: "One" }, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      path.join(cardsRoot, "two.json"),
      `${JSON.stringify({ id: "windows.two", name: "Two" }, null, 2)}\n`,
      "utf8"
    );

    try {
      const cards = await discoverCapabilityCards(path.join(workspaceRoot, "packages", "Capability-Catalog", "cards"));
      expect(cards.map((entry) => entry.id)).toEqual(["windows.one", "windows.two"]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("builds run-one and rerun-failed CLI args", () => {
    expect(buildCapabilityCliArgs({ command: "run", cardId: "windows.highest-ram-process" })).toEqual([
      "run",
      "capability:run",
      "--",
      "--card-id",
      "windows.highest-ram-process",
      "--json"
    ]);
    expect(buildCapabilityCliArgs({ command: "rerun-failed" })).toEqual([
      "run",
      "capability:rerun-failed",
      "--",
      "--json"
    ]);
  });

  it("parses JSON summary output and resolves artifact links", () => {
    const summary = parseCapabilityCliSummary(
      JSON.stringify({
        runId: "run-1",
        totals: { total: 1, passed: 0, failed: 1 },
        cardResults: [
          {
            cardId: "windows.fail",
            status: "failed",
            artifactDir: "C:/repo/.runtime/capability-eval/runs/run-1/windows.fail"
          }
        ]
      })
    );
    expect(summary.runId).toBe("run-1");
    expect(resolveCardArtifactPath(summary, "windows.fail")).toContain("windows.fail");
  });
});
