/**
 * Improvement Governance Adapter
 * 
 * Routes patch proposals and escalated improvements to the governance system.
 * Stores as artifacts, routes to approvals, never auto-applies code.
 * 
 * Usage:
 *   import { routePatchProposalToGovernance } from "@governance-execution/integration/improvement-governance-adapter";
 *   routePatchProposalToGovernance(patchProposal, conversationId);
 */

import type { PatchProposal } from "@contracts/improvement";
import type { GameoveranceEvent, Policy } from "../contracts";

/**
 * Metadata attached to an improvement-driven governance decision.
 */
interface ImprovementGovernanceContext {
  sourceImprovementEventId: string;
  patchProposalId: string;
  category: string;
  estimatedRisk: string;
  requiresApproval: boolean;
}

/**
 * Convert a patch proposal into a governance artifact.
 */
function patchProposalToGovArtifact(
  proposal: PatchProposal,
  conversationId: string
): GameoveranceEvent {
  return {
    eventType: "improvement-patch-proposed",
    timestamp: new Date().toISOString(),
    conversationId,
    metadata: {
      patchProposalId: proposal.id,
      fromEventId: proposal.fromImprovementEventId,
      scope: proposal.scope,
      risk: proposal.risk,
      effort: proposal.estimatedEffort,
      targetFiles: proposal.targetFiles || [],
      testPlan: proposal.testPlan || [],
      requiresApproval: proposal.risk === "high" || proposal.risk === "critical"
    } as ImprovementGovernanceContext
  };
}

/**
 * Route a patch proposal to the governance system.
 * Stores as artifact, queues for review, does NOT auto-apply.
 */
export async function routePatchProposalToGovernance(
  proposal: PatchProposal,
  conversationId: string,
  policy?: Policy
): Promise<{ success: boolean; reason?: string; artifactId?: string }> {
  try {
    const artifact = patchProposalToGovArtifact(proposal, conversationId);

    // TODO: Wire to actual governance command bus when available
    // For now, this is a placeholder that demonstrates the interface
    console.info(
      `[Improvement Governance] Patch proposal ${proposal.id} routed to governance:`,
      {
        scope: proposal.scope,
        risk: proposal.risk,
        effort: proposal.estimatedEffort,
        requiresApproval: artifact.metadata.requiresApproval
      }
    );

    // Mark as awaiting governance decision
    return {
      success: true,
      artifactId: `gov-${proposal.id.slice(0, 12)}`
    };
  } catch (err) {
    console.warn(`[Improvement Governance] Failed to route patch proposal ${proposal.id}:`, err);
    return {
      success: false,
      reason: `Governance routing failed: ${String(err)}`
    };
  }
}

/**
 * Query governance decisions for improvement patches.
 */
export async function getImprovementPatchDecisions(proposalIds: string[]): Promise<
  Map<string, { approved: boolean; reason?: string }>
> {
  // TODO: Wire to actual governance system
  // For now return empty map
  return new Map();
}

/**
 * Mark a patch as reviewed by governance.
 */
export async function markPatchAsReviewed(
  proposalId: string,
  approved: boolean,
  approver?: string
): Promise<void> {
  console.info(`[Improvement Governance] Patch ${proposalId} marked as ${approved ? "approved" : "rejected"} by ${approver || "system"}`);
  // TODO: Update governance ledger when available
}

/**
 * Check if a patch proposal requires approval based on policy.
 */
export function shouldRequireApproval(proposal: PatchProposal, policy?: Policy): boolean {
  // Default: high and critical risk always require approval
  if (proposal.risk === "high" || proposal.risk === "critical") {
    return true;
  }

  // Medium risk requires approval if policy is strict
  if (proposal.risk === "medium" && policy?.strictApprovals) {
    return true;
  }

  return false;
}
