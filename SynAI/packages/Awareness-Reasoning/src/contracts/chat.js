export const CHAT_GOVERNED_TASK_DECISIONS = [
    "allow",
    "allow_with_verification",
    "require_approval",
    "deny",
    "clarify",
    "plan_only"
];
export const CHAT_GOVERNED_TASK_RISK_TIERS = ["tier-0", "tier-1", "tier-2", "tier-3", "tier-4"];
export const CHAT_GOVERNED_TASK_EXECUTORS = [
    "answer-only",
    "workflow-orchestrator",
    "desktop-actions",
    "browser-session",
    "history-replay",
    "approval-queue",
    "ui-automation",
    "service-control",
    "registry-control",
    "browser-automation",
    "none"
];
export const CHAT_REPLY_SOURCE_SCOPES = [
    "repo-wide",
    "readme-only",
    "docs-only",
    "workspace-only",
    "awareness-only",
    "time-sensitive-live"
];
export const CHAT_REPLY_FORMAT_POLICIES = ["default", "preserve-exact-structure"];
export const CHAT_REPLY_GROUNDING_POLICIES = ["default", "source-boundary", "awareness-direct"];
export const CHAT_REPLY_ROUTING_POLICIES = [
    "default",
    "chat-first-source-scoped",
    "windows-explicit-only"
];
