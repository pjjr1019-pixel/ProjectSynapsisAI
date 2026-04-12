/**
 * Governance-Execution Integration Adapters
 * 
 * Routes improvement events to the governance/approval system.
 */

export {
  routePatchProposalToGovernance,
  getImprovementPatchDecisions,
  markPatchAsReviewed,
  shouldRequireApproval
} from "./improvement-governance-adapter";
