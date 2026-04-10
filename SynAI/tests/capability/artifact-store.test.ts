import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  readLatestFailedCardIds,
  writeRunSummaryArtifacts
} from "../../packages/Awareness-Reasoning/src/capability-eval/artifacts/store";
import type { CapabilityRunSummary } from "../../packages/Awareness-Reasoning/src/capability-eval/types";

describe("capability artifact store", () => {
  it("writes summary artifacts and reads latest failed cards", async () => {
    const artifactsRoot = await mkdtemp(path.join(tmpdir(), "capability-artifacts-"));
    const summary: CapabilityRunSummary = {
      runId: "run-1",
      startedAt: "2026-04-09T00:00:00.000Z",
      completedAt: "2026-04-09T00:00:05.000Z",
      mode: "proposal-only",
      dryRun: false,
      totals: {
        total: 2,
        passed: 1,
        failed: 1
      },
      cardResults: [
        {
          cardId: "windows.pass",
          status: "passed",
          startedAt: "2026-04-09T00:00:00.000Z",
          completedAt: "2026-04-09T00:00:02.000Z",
          execution: null,
          verifier: null,
          gap: null,
          remediation: null,
          sandbox: null,
          artifactDir: "a"
        },
        {
          cardId: "windows.fail",
          status: "failed",
          startedAt: "2026-04-09T00:00:02.000Z",
          completedAt: "2026-04-09T00:00:05.000Z",
          execution: null,
          verifier: null,
          gap: null,
          remediation: null,
          sandbox: null,
          artifactDir: "b"
        }
      ]
    };

    try {
      await writeRunSummaryArtifacts(artifactsRoot, summary);
      const latest = await readLatestFailedCardIds(artifactsRoot);
      expect(latest?.runId).toBe("run-1");
      expect(latest?.cardIds).toEqual(["windows.fail"]);
    } finally {
      await rm(artifactsRoot, { recursive: true, force: true });
    }
  });
});

