export const CAPABILITY_RUNNER_DOMAINS = [
  "windows-capability-tests",
  "app-feature-tests",
  "agent-task-tests",
  "safety-refusal-tests"
] as const;

export const CAPABILITY_CATALOG_STATUSES = [
  "implemented",
  "partial",
  "stubbed",
  "planned"
] as const;

export const CAPABILITY_CASE_STATUSES = [
  "pending",
  "running",
  "passed",
  "failed",
  "completed_unscored",
  "skipped",
  "interrupted"
] as const;

export const CAPABILITY_RUN_STATUSES = [
  "created",
  "running",
  "pausing",
  "paused",
  "stopping",
  "stopped",
  "completed",
  "failed"
] as const;

export const CAPABILITY_VALIDATION_RESULTS = [
  "passed",
  "failed",
  "completed_unscored"
] as const;

export const CAPABILITY_RUNNER_EVENT_TYPES = [
  "capability_run_created",
  "capability_run_started",
  "capability_case_started",
  "capability_case_stream_delta",
  "capability_case_validation_started",
  "capability_case_validation_completed",
  "capability_case_completed",
  "capability_case_failed",
  "capability_run_pausing",
  "capability_run_paused",
  "capability_run_resumed",
  "capability_run_stopping",
  "capability_run_completed",
  "capability_report_written"
] as const;

export type CapabilityRunnerDomain = (typeof CAPABILITY_RUNNER_DOMAINS)[number];
export type CapabilityCatalogStatus = (typeof CAPABILITY_CATALOG_STATUSES)[number];
export type CapabilityCaseStatus = (typeof CAPABILITY_CASE_STATUSES)[number];
export type CapabilityRunStatus = (typeof CAPABILITY_RUN_STATUSES)[number];
export type CapabilityValidationResult = (typeof CAPABILITY_VALIDATION_RESULTS)[number];
export type CapabilityRunnerEventType = (typeof CAPABILITY_RUNNER_EVENT_TYPES)[number];

export interface CapabilityCatalogEntry {
  id: string;
  domain: CapabilityRunnerDomain;
  category: string;
  title: string;
  description: string;
  status: CapabilityCatalogStatus;
  task_type: string;
  difficulty: "easy" | "medium" | "hard" | "edge";
  expected_route: string;
  prompt_templates: Record<string, string>;
  expected_contains?: string[];
  expected_not_contains?: string[];
  notes?: string[];
  source_refs?: string[];
}

export interface CapabilityPromptVariant {
  id: string;
  label: string;
  description: string;
  template?: string | null;
  prefix?: string | null;
  suffix?: string | null;
  use_template_key?: string | null;
  force_lowercase?: boolean;
  typo_map?: Array<{
    from: string;
    to: string;
  }>;
}

export interface CapabilityExpandedCase {
  id: string;
  domain: CapabilityRunnerDomain;
  category: string;
  capability_id: string;
  title: string;
  description: string;
  status: CapabilityCatalogStatus;
  task_type: string;
  difficulty: CapabilityCatalogEntry["difficulty"];
  expected_route: string;
  prompt_variant: string;
  prompt_text: string;
  expected_contains: string[];
  expected_not_contains: string[];
  notes: string[];
  source_refs: string[];
}

export interface CapabilityRunRecord {
  id: string;
  selected_domains: CapabilityRunnerDomain[];
  selected_categories: string[];
  status_filter: CapabilityCatalogStatus[];
  source_catalog_paths: string[];
  source_variant_path: string;
  expanded_case_source_path: string;
  output_path: string;
  model_name: string | null;
  provider_name: string | null;
  status: CapabilityRunStatus;
  total_cases: number;
  completed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  passed_cases: number;
  current_case_id: string | null;
  current_case_index: number | null;
  latest_saved_report_path: string | null;
  last_report_write_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CapabilityCaseRecord {
  id: string;
  run_id: string;
  case_index: number;
  domain: CapabilityRunnerDomain;
  capability_id: string;
  category: string;
  title: string;
  prompt_text: string;
  prompt_variant: string;
  task_type: string;
  difficulty: CapabilityCatalogEntry["difficulty"];
  status: CapabilityCaseStatus;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  provider_name: string | null;
  model_name: string | null;
  response_text: string | null;
  response_preview: string | null;
  error_text: string | null;
  expected_contains_json: string[];
  expected_not_contains_json: string[];
  validation_result: CapabilityValidationResult | null;
  validation_notes: string[];
  expected_route: string;
  source_refs: string[];
  created_at: string;
  updated_at: string;
}

export interface CapabilityEventRecord {
  id: string;
  run_id: string;
  case_id: string | null;
  event_type: CapabilityRunnerEventType;
  ts: string;
  status: string;
  payload_json: Record<string, unknown>;
}

export interface CapabilityRunnerCatalogDomainSummary {
  domain: CapabilityRunnerDomain;
  label: string;
  capability_count: number;
  expanded_case_count: number;
  categories: Array<{
    category: string;
    capability_count: number;
    expanded_case_count: number;
  }>;
}

export interface CapabilityRunnerCatalogSummary {
  inventory_path: string;
  source_catalog_paths: string[];
  source_variant_path: string;
  expanded_case_source_path: string;
  generated_at: string;
  capability_count: number;
  expanded_case_count: number;
  domains: CapabilityRunnerCatalogDomainSummary[];
  statuses: Record<CapabilityCatalogStatus, number>;
}

export interface CapabilityRunSnapshot {
  run: CapabilityRunRecord;
  cases: CapabilityCaseRecord[];
  events: CapabilityEventRecord[];
}

export interface CapabilityRunStartRequest {
  selected_domains?: CapabilityRunnerDomain[];
  selected_categories?: string[];
  status_filter?: CapabilityCatalogStatus[];
  model_override?: string | null;
}

export interface CapabilityRunExportResult {
  run_id: string;
  output_path: string;
  written_at: string;
}
