export const PRIVACY_SCOPES = [
    "public metadata",
    "user-visible local content",
    "sensitive local content",
    "protected/system-sensitive surfaces"
];
export const PERMISSION_TIERS = [
    "Observe",
    "Open/Navigate",
    "SoftAction",
    "HighRiskAction"
];
export const AWARENESS_MODES = ["observe", "contextual", "debug"];
export const AWARENESS_EVENT_TYPES = [
    "session_started",
    "baseline_created",
    "baseline_restored",
    "digest_generated",
    "privacy_scope_blocked",
    "fallback_mode_enabled",
    "report_marked_delivered",
    "assist_started",
    "assist_stopped",
    "active_window_changed",
    "ui_tree_refreshed",
    "screen_frame_captured",
    "click_observed",
    "hover_target_changed",
    "protected_input_blocked"
];
export const AWARENESS_AREAS = [
    "repo",
    "session",
    "machine",
    "files",
    "media",
    "official-knowledge",
    "journal",
    "context",
    "api",
    "privacy",
    "screen",
    "assist",
    "ui",
    "interaction"
];
export const EVIDENCE_REF_KINDS = ["file", "git", "session", "digest", "event", "api", "window", "ui-tree", "screen", "display", "official"];
export const AWARENESS_CONTEXT_REASONS = ["relevant", "debug", "not_relevant", "fallback"];
export const REPO_STATES = ["clean", "dirty", "unknown"];
export const ASSIST_MODE_SCOPES = ["current-window", "selected-app", "chosen-display"];
export const SCREEN_CAPTURE_MODES = ["on-demand", "session"];
export const OFFICIAL_KNOWLEDGE_POLICIES = ["off", "mirror-first", "live-fallback"];
export const RESOURCE_HOTSPOT_RESOURCES = ["ram", "cpu", "gpu", "disk"];
export const RESOURCE_HOTSPOT_GROUPINGS = ["process", "program"];
export const MACHINE_EVENT_LOG_LEVELS = [
    "critical",
    "error",
    "warning",
    "information",
    "verbose",
    "unknown"
];
export const FILE_ENTRY_KINDS = ["file", "folder"];
export const FILE_MEDIA_KINDS = ["photo", "video", "audio", "document"];
export const FILE_CHANGE_TYPES = ["created", "modified", "deleted", "renamed"];
export const FILE_ROOT_SOURCES = ["default", "workspace", "user", "volume"];
export const FILE_MONITOR_HEALTH_STATES = ["idle", "healthy", "degraded", "unsupported"];
export const FILE_MONITOR_CURSOR_SOURCES = ["usn-journal", "watcher", "snapshot-diff"];
export const VOLUME_AWARENESS_TYPES = ["fixed", "removable", "network", "unknown"];
export const AWARENESS_INTENT_FAMILIES = [
    "repo-change",
    "file-folder-media",
    "process-service-startup",
    "settings-control-panel",
    "registry",
    "live-usage",
    "hardware",
    "resource-hotspot",
    "performance-diagnostic",
    "on-screen"
];
export const AWARENESS_SUMMARY_SCOPES = [
    "session",
    "previous-session",
    "last-report",
    "current-machine"
];
export const AWARENESS_QUERY_SCOPES = [...AWARENESS_SUMMARY_SCOPES, "current-ui"];
export const AWARENESS_SUMMARY_MODES = ["short", "medium", "detailed"];
export const AWARENESS_ANSWER_MODES = ["evidence-first", "llm-primary"];
export const AWARENESS_CONFIDENCE_LEVELS = ["low", "medium", "high"];
export const AWARENESS_GROUNDING_STATUSES = ["grounded", "partial", "weak"];
export const MACHINE_ANOMALY_SEVERITIES = ["low", "medium", "high"];
