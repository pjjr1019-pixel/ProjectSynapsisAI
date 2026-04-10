import { describe, expect, it } from "vitest";
import {
  parseCapabilityCliArgs
} from "../../packages/Awareness-Reasoning/src/capability-eval/cli";

describe("capability cli parser", () => {
  it("parses run command with card id and mode", () => {
    const parsed = parseCapabilityCliArgs(
      ["run", "--card-id", "windows.highest-ram-process", "--mode", "sandbox-apply", "--auto-remediate"],
      "C:/repo/SynAI"
    );

    expect(parsed.command).toBe("run");
    expect(parsed.cardIds).toEqual(["windows.highest-ram-process"]);
    expect(parsed.mode).toBe("sandbox-apply");
    expect(parsed.autoRemediate).toBe(true);
  });

  it("parses rerun-failed command", () => {
    const parsed = parseCapabilityCliArgs(["rerun-failed", "--dry-run"], "C:/repo/SynAI");
    expect(parsed.command).toBe("rerun-failed");
    expect(parsed.dryRun).toBe(true);
  });

  it("parses json/token flags and issue-token command", () => {
    const parsedRun = parseCapabilityCliArgs(
      ["run", "--card-id", "windows.highest-ram-process", "--approval-token", "{\"tokenId\":\"1\",\"commandHash\":\"x\",\"approver\":\"a\",\"issuedAt\":\"i\",\"expiresAt\":\"e\",\"signature\":\"s\"}", "--json"],
      "C:/repo/SynAI"
    );
    expect(parsedRun.json).toBe(true);
    expect(parsedRun.approvalToken).toContain("\"tokenId\"");

    const parsedIssue = parseCapabilityCliArgs(
      ["issue-token", "--command-hash", "abc123", "--approved-by", "qa"],
      "C:/repo/SynAI"
    );
    expect(parsedIssue.command).toBe("issue-token");
    expect(parsedIssue.commandHash).toBe("abc123");
    expect(parsedIssue.approvedBy).toBe("qa");

    const parsedHash = parseCapabilityCliArgs(
      ["promotion-hash", "--card-id", "windows.test", "--target-path", "packages/Capability-Catalog/cards/windows/test.json"],
      "C:/repo/SynAI"
    );
    expect(parsedHash.command).toBe("promotion-hash");
    expect(parsedHash.cardIds).toEqual(["windows.test"]);
    expect(parsedHash.targetPath).toBe("packages/Capability-Catalog/cards/windows/test.json");

    const parsedHistory = parseCapabilityCliArgs(
      ["mine-history", "--max-findings", "3", "--json"],
      "C:/repo/SynAI"
    );
    expect(parsedHistory.command).toBe("mine-history");
    expect(parsedHistory.maxFindings).toBe(3);
    expect(parsedHistory.json).toBe(true);
  });

  it("throws for unknown flags", () => {
    expect(() => parseCapabilityCliArgs(["run", "--bogus"], "C:/repo/SynAI")).toThrow(/Unknown flag/i);
  });
});
