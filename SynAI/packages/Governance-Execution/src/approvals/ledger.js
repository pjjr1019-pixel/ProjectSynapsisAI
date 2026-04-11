import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
const DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SECRET = "synai-local-governance-secret";
const toMs = (value) => value.getTime();
const buildSignaturePayload = (tokenId, commandHash, approver, issuedAt, expiresAt) => `${tokenId}|${commandHash}|${approver}|${issuedAt}|${expiresAt}`;
const signTokenPayload = (secret, payload) => createHmac("sha256", secret).update(payload).digest("hex");
const safeHexEquals = (left, right) => {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
};
const normalizeSecret = (secret) => {
    const candidate = secret?.trim() || process.env.SYNAI_APPROVAL_SECRET?.trim() || DEFAULT_SECRET;
    return candidate.length > 0 ? candidate : DEFAULT_SECRET;
};
export const createApprovalLedger = (options = {}) => {
    const signingSecret = normalizeSecret(options.signingSecret);
    const now = options.now ?? (() => new Date());
    const revokedTokenIds = new Set();
    const issuedTokenIds = new Set();
    const issueApprovalToken = (commandHash, approver, ttlMs = DEFAULT_TOKEN_TTL_MS) => {
        const trimmedApprover = approver.trim();
        if (!trimmedApprover) {
            throw new Error("approver is required when issuing an approval token.");
        }
        const nowValue = now();
        const issuedAt = nowValue.toISOString();
        const expiresAt = new Date(toMs(nowValue) + Math.max(1, Math.floor(ttlMs))).toISOString();
        const tokenId = randomUUID();
        const payload = buildSignaturePayload(tokenId, commandHash, trimmedApprover, issuedAt, expiresAt);
        const signature = signTokenPayload(signingSecret, payload);
        issuedTokenIds.add(tokenId);
        return {
            tokenId,
            commandHash,
            approver: trimmedApprover,
            issuedAt,
            expiresAt,
            signature
        };
    };
    const validateApprovalToken = (token, commandHash, at = now()) => {
        if (!token) {
            return {
                valid: false,
                reason: "Approval token missing."
            };
        }
        if (token.commandHash !== commandHash) {
            return {
                valid: false,
                reason: "Approval token command hash mismatch."
            };
        }
        if (revokedTokenIds.has(token.tokenId)) {
            return {
                valid: false,
                reason: "Approval token has been revoked."
            };
        }
        if (Number.isNaN(Date.parse(token.issuedAt)) || Number.isNaN(Date.parse(token.expiresAt))) {
            return {
                valid: false,
                reason: "Approval token timestamps are invalid."
            };
        }
        if (Date.parse(token.expiresAt) <= at.getTime()) {
            return {
                valid: false,
                reason: "Approval token has expired."
            };
        }
        const payload = buildSignaturePayload(token.tokenId, token.commandHash, token.approver, token.issuedAt, token.expiresAt);
        const expectedSignature = signTokenPayload(signingSecret, payload);
        if (!safeHexEquals(expectedSignature, token.signature)) {
            return {
                valid: false,
                reason: "Approval token signature mismatch."
            };
        }
        if (!issuedTokenIds.has(token.tokenId)) {
            // Signature verification is authoritative, but surfacing unknown-id helps audit drift.
            return {
                valid: true,
                reason: "Token signature is valid but token was not issued in this process."
            };
        }
        return {
            valid: true,
            reason: null
        };
    };
    const revokeApprovalToken = (tokenId) => {
        const trimmed = tokenId.trim();
        if (!trimmed) {
            return false;
        }
        revokedTokenIds.add(trimmed);
        return true;
    };
    return {
        issueApprovalToken,
        validateApprovalToken,
        revokeApprovalToken
    };
};
const defaultApprovalLedger = createApprovalLedger();
export const issueApprovalToken = (commandHash, approver, ttlMs) => defaultApprovalLedger.issueApprovalToken(commandHash, approver, ttlMs);
export const validateApprovalToken = (token, commandHash, now) => defaultApprovalLedger.validateApprovalToken(token, commandHash, now);
export const revokeApprovalToken = (tokenId) => defaultApprovalLedger.revokeApprovalToken(tokenId);
export const parseApprovalTokenInput = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("Approval token value is empty.");
    }
    let rawJson = trimmed;
    if (trimmed.startsWith("base64:")) {
        const encoded = trimmed.slice("base64:".length);
        rawJson = Buffer.from(encoded, "base64").toString("utf8");
    }
    const parsed = JSON.parse(rawJson);
    if (typeof parsed.tokenId !== "string" ||
        typeof parsed.commandHash !== "string" ||
        typeof parsed.approver !== "string" ||
        typeof parsed.issuedAt !== "string" ||
        typeof parsed.expiresAt !== "string" ||
        typeof parsed.signature !== "string") {
        throw new Error("Approval token payload is invalid.");
    }
    return {
        tokenId: parsed.tokenId,
        commandHash: parsed.commandHash,
        approver: parsed.approver,
        issuedAt: parsed.issuedAt,
        expiresAt: parsed.expiresAt,
        signature: parsed.signature
    };
};
