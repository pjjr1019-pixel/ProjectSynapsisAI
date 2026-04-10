import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  createApprovalLedger,
  createGovernanceCommandBus,
  hashGovernanceCommand
} from "@governance-execution";

describe("governance command bus", () => {
  it("processes queued commands and writes audit events", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "governance-bus-"));
    const auditPath = path.join(root, "commands.jsonl");
    const bus = createGovernanceCommandBus({
      auditLogPath: auditPath,
      executeRequest: async () => ({
        simulated: false,
        summary: "executed"
      })
    });
    const queued = bus.enqueueGovernanceCommand({
      commandName: "capability.sandbox.apply",
      command: "write-json capability/cards/windows/test.json",
      riskClass: "low"
    });
    const result = await bus.processNextGovernanceCommand();

    try {
      expect(result?.status).toBe("executed");
      expect(bus.getGovernanceCommandStatus(queued.commandId)?.status).toBe("executed");
      const auditRaw = await readFile(auditPath, "utf8");
      expect(auditRaw).toContain("\"event\":\"enqueue\"");
      expect(auditRaw).toContain("\"event\":\"completed\"");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("blocks destructive commands without token and allows them with valid token", async () => {
    const ledger = createApprovalLedger({
      signingSecret: "bus-secret"
    });
    const bus = createGovernanceCommandBus({
      approvalLedger: ledger,
      executeRequest: async () => ({
        simulated: false
      })
    });

    const blockedRequest = {
      commandName: "capability.promote.windows.test",
      command: "promote capability/cards/windows/test.json",
      riskClass: "high" as const,
      destructive: true
    };
    bus.enqueueGovernanceCommand(blockedRequest);
    const blocked = await bus.processNextGovernanceCommand();
    expect(blocked?.status).toBe("blocked");

    const commandHash = hashGovernanceCommand(blockedRequest);
    const token = ledger.issueApprovalToken(commandHash, "qa-operator", 60_000);
    bus.enqueueGovernanceCommand({
      ...blockedRequest,
      approvalToken: token,
      approvedBy: "qa-operator"
    });
    const allowed = await bus.processNextGovernanceCommand();
    expect(allowed?.status).toBe("executed");
  });
});
