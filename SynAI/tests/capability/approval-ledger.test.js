import { describe, expect, it } from "vitest";
import { createApprovalLedger } from "@governance-execution";
describe("approval ledger", () => {
    it("issues and validates signed approval tokens", () => {
        const fixedNow = new Date("2026-04-09T00:00:00.000Z");
        const ledger = createApprovalLedger({
            signingSecret: "test-secret",
            now: () => fixedNow
        });
        const token = ledger.issueApprovalToken("hash-1", "qa-operator", 60_000);
        const validation = ledger.validateApprovalToken(token, "hash-1", new Date("2026-04-09T00:00:30.000Z"));
        expect(validation.valid).toBe(true);
    });
    it("rejects revoked, mismatched, expired, and tampered tokens", () => {
        const ledger = createApprovalLedger({
            signingSecret: "test-secret",
            now: () => new Date("2026-04-09T00:00:00.000Z")
        });
        const token = ledger.issueApprovalToken("hash-2", "qa-operator", 1_000);
        expect(ledger.validateApprovalToken(token, "different-hash").valid).toBe(false);
        const tampered = {
            ...token,
            signature: token.signature.slice(0, -2) + "aa"
        };
        expect(ledger.validateApprovalToken(tampered, "hash-2").valid).toBe(false);
        const expired = ledger.validateApprovalToken(token, "hash-2", new Date("2026-04-09T00:00:05.000Z"));
        expect(expired.valid).toBe(false);
        expect(ledger.revokeApprovalToken(token.tokenId)).toBe(true);
        expect(ledger.validateApprovalToken(token, "hash-2").valid).toBe(false);
    });
});
