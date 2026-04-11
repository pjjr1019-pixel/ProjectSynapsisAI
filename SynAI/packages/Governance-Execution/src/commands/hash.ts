import { createHash } from "node:crypto";
import type { ExecutionRequest } from "../contracts";
import { stableStringify } from "../utils/stable-json";

const normalizeMetadata = (metadata: Record<string, unknown> | undefined): Record<string, unknown> =>
  metadata ?? {};

export const buildGovernanceCommandHashPayload = (
  request: ExecutionRequest
): Record<string, unknown> => ({
  commandName: request.commandName,
  command: request.command,
  args: request.args ?? [],
  riskClass: request.riskClass,
  destructive: Boolean(request.destructive),
  metadata: normalizeMetadata(request.metadata)
});

export const hashGovernanceCommand = (request: ExecutionRequest): string => {
  const payload = buildGovernanceCommandHashPayload(request);
  const canonical = stableStringify(payload);
  return createHash("sha256").update(canonical).digest("hex");
};
