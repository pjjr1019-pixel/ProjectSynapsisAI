import { describe, expect, it } from "vitest";
import { evaluateGovernancePolicy, inferRiskClassFromCommand, isDestructiveCommand } from "@governance-execution";
describe("governance policy engine", () => {
    it("allows non-destructive low-risk commands", () => {
        const decision = evaluateGovernancePolicy({
            commandName: "capability.sandbox.apply",
            command: "write-json packages/Capability-Catalog/cards/windows/test.json",
            riskClass: "low"
        });
        expect(decision.outcome).toBe("allow");
        expect(decision.approvalRequired).toBe(false);
    });
    it("requires approval for destructive commands", () => {
        const decision = evaluateGovernancePolicy({
            commandName: "windows.action.close",
            command: "Stop-Process -Name chrome",
            riskClass: "high"
        });
        expect(decision.outcome).toBe("require-approval");
        expect(decision.destructive).toBe(true);
    });
    it("denies critical destructive commands", () => {
        const decision = evaluateGovernancePolicy({
            commandName: "dangerous",
            command: "format c:",
            riskClass: "critical"
        });
        expect(decision.outcome).toBe("deny");
    });
    it("classifies command destructiveness and risk deterministically", () => {
        expect(isDestructiveCommand("Remove-Item -Recurse C:\\tmp")).toBe(true);
        expect(inferRiskClassFromCommand("Stop-Process -Name chrome")).toBe("high");
    });
});
