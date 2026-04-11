import { createHash } from "node:crypto";
import { stableStringify } from "../utils/stable-json";
const normalizeMetadata = (metadata) => metadata ?? {};
export const buildGovernanceCommandHashPayload = (request) => ({
    commandName: request.commandName,
    command: request.command,
    args: request.args ?? [],
    riskClass: request.riskClass,
    destructive: Boolean(request.destructive),
    metadata: normalizeMetadata(request.metadata)
});
export const hashGovernanceCommand = (request) => {
    const payload = buildGovernanceCommandHashPayload(request);
    const canonical = stableStringify(payload);
    return createHash("sha256").update(canonical).digest("hex");
};
