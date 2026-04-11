import { randomUUID } from "node:crypto";
import * as path from "node:path";
import type {
  CapabilityCaseRecord,
  CapabilityEventRecord,
  CapabilityExpandedCase,
  CapabilityRunExportResult,
  CapabilityRunRecord,
  CapabilityRunSnapshot,
  CapabilityRunStartRequest,
  CapabilityRunStatus,
  CapabilityRunnerCatalogSummary,
  CapabilityRunnerEventType,
  CapabilityValidationResult,
  SendChatResponse
} from "@contracts";
import {
  appendCapabilityEvent,
  getCapabilityRun,
  getCapabilityRunSnapshot,
  getLatestNonTerminalCapabilityRun,
  listCapabilityCases,
  listCapabilityRuns,
  recoverCapabilityRuns,
  replaceCapabilityCases,
  upsertCapabilityCase,
  upsertCapabilityRun,
  loadCapabilityRunnerCatalogBundle,
  validateCapabilityCaseResponse,
  writeCapabilityRunReports,
  type CapabilityRunnerCatalogBundle
} from "@awareness/capability-runner";

const ACTIVE_RUN_STATUSES = new Set<CapabilityRunStatus>(["created", "running", "pausing", "stopping"]);

interface CapabilityCaseExecutionResult {
  response: SendChatResponse;
  providerName: string | null;
  modelName: string | null;
}

interface CapabilityRunnerServiceOptions {
  workspaceRoot: string;
  runtimeRoot: string;
  executeCase: (input: {
    promptText: string;
    modelOverride?: string | null;
    onStreamDelta?: (content: string) => void;
  }) => Promise<CapabilityCaseExecutionResult>;
  emitEvent: (event: CapabilityEventRecord) => void;
}

const nowIso = (): string => new Date().toISOString();

const buildRunId = (): string => {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
};

const isCaseTerminal = (status: CapabilityCaseRecord["status"]): boolean =>
  status === "passed" ||
  status === "failed" ||
  status === "completed_unscored" ||
  status === "skipped";

const buildOutputPath = (runtimeRoot: string, runId: string): string =>
  path.join(runtimeRoot, "capability-runner", "runs", runId, "capability-run-results.md");

const computeRunCounters = (cases: CapabilityCaseRecord[]) => ({
  total_cases: cases.length,
  completed_cases: cases.filter((entry) => isCaseTerminal(entry.status)).length,
  failed_cases: cases.filter((entry) => entry.status === "failed").length,
  skipped_cases: cases.filter((entry) => entry.status === "skipped").length,
  passed_cases: cases.filter((entry) => entry.status === "passed").length
});

const buildRunRecord = (
  runId: string,
  request: CapabilityRunStartRequest,
  bundle: CapabilityRunnerCatalogBundle,
  cases: CapabilityExpandedCase[],
  outputPath: string
): CapabilityRunRecord => {
  const createdAt = nowIso();
  return {
    id: runId,
    selected_domains:
      request.selected_domains && request.selected_domains.length > 0
        ? [...request.selected_domains]
        : [...bundle.summary.domains.map((entry) => entry.domain)],
    selected_categories: [...(request.selected_categories ?? [])],
    status_filter: [...(request.status_filter ?? ["implemented", "partial", "stubbed", "planned"])],
    source_catalog_paths: [...bundle.paths.sourceCatalogPaths],
    source_variant_path: bundle.paths.sourceVariantPath,
    expanded_case_source_path: bundle.paths.expandedCaseSourcePath,
    output_path: outputPath,
    model_name: request.model_override?.trim() || null,
    provider_name: "ollama",
    status: "created",
    total_cases: cases.length,
    completed_cases: 0,
    failed_cases: 0,
    skipped_cases: 0,
    passed_cases: 0,
    current_case_id: null,
    current_case_index: null,
    latest_saved_report_path: null,
    last_report_write_at: null,
    started_at: null,
    ended_at: null,
    created_at: createdAt,
    updated_at: createdAt
  };
};

const buildCaseRecords = (runId: string, entries: CapabilityExpandedCase[]): CapabilityCaseRecord[] => {
  const createdAt = nowIso();
  return entries.map((entry, caseIndex) => ({
    id: `${runId}-${String(caseIndex + 1).padStart(4, "0")}`,
    run_id: runId,
    case_index: caseIndex,
    domain: entry.domain,
    capability_id: entry.capability_id,
    category: entry.category,
    title: entry.title,
    prompt_text: entry.prompt_text,
    prompt_variant: entry.prompt_variant,
    task_type: entry.task_type,
    difficulty: entry.difficulty,
    status: "pending",
    started_at: null,
    ended_at: null,
    duration_ms: null,
    provider_name: null,
    model_name: null,
    response_text: null,
    response_preview: null,
    error_text: null,
    expected_contains_json: [...entry.expected_contains],
    expected_not_contains_json: [...entry.expected_not_contains],
    validation_result: null,
    validation_notes: [],
    expected_route: entry.expected_route,
    source_refs: [...entry.source_refs],
    created_at: createdAt,
    updated_at: createdAt
  }));
};

const cloneFailedCasesAsPending = (
  runId: string,
  sourceCases: CapabilityCaseRecord[]
): CapabilityCaseRecord[] => {
  const createdAt = nowIso();
  return sourceCases.map((entry, index) => ({
    ...entry,
    id: `${runId}-${String(index + 1).padStart(4, "0")}`,
    run_id: runId,
    case_index: index,
    status: "pending",
    started_at: null,
    ended_at: null,
    duration_ms: null,
    provider_name: null,
    model_name: null,
    response_text: null,
    response_preview: null,
    error_text: null,
    validation_result: null,
    validation_notes: [],
    created_at: createdAt,
    updated_at: createdAt
  }));
};

export const createCapabilityRunService = (options: CapabilityRunnerServiceOptions) => {
  let activeRunId: string | null = null;
  let activePromise: Promise<void> | null = null;
  let catalogBundlePromise: Promise<CapabilityRunnerCatalogBundle> | null = null;

  const loadCatalogBundle = async (): Promise<CapabilityRunnerCatalogBundle> => {
    if (!catalogBundlePromise) {
      catalogBundlePromise = loadCapabilityRunnerCatalogBundle(options.workspaceRoot);
    }
    return await catalogBundlePromise;
  };

  const emitAndPersistEvent = async (
    runId: string,
    caseId: string | null,
    eventType: CapabilityRunnerEventType,
    status: string,
    payload: Record<string, unknown>
  ): Promise<CapabilityEventRecord> => {
    const event = await appendCapabilityEvent({
      id: randomUUID(),
      run_id: runId,
      case_id: caseId,
      event_type: eventType,
      ts: nowIso(),
      status,
      payload_json: payload
    });
    options.emitEvent(event);
    return event;
  };

  const writeRunReports = async (runId: string): Promise<CapabilityRunExportResult | null> => {
    const snapshot = await getCapabilityRunSnapshot(runId);
    if (!snapshot) {
      return null;
    }

    const exportResult = await writeCapabilityRunReports(snapshot, snapshot.run.output_path);
    await upsertCapabilityRun({
      ...snapshot.run,
      latest_saved_report_path: exportResult.output_path,
      last_report_write_at: exportResult.written_at,
      updated_at: exportResult.written_at
    });
    await emitAndPersistEvent(runId, null, "capability_report_written", snapshot.run.status, {
      runId,
      latestSavedReportPath: exportResult.output_path,
      writtenAt: exportResult.written_at
    });
    return exportResult;
  };

  const refreshRunCounters = async (runId: string, patch: Partial<CapabilityRunRecord> = {}) => {
    const run = await getCapabilityRun(runId);
    if (!run) {
      return null;
    }

    const cases = await listCapabilityCases(runId);
    return await upsertCapabilityRun({
      ...run,
      ...computeRunCounters(cases),
      ...patch,
      updated_at: patch.updated_at ?? nowIso()
    });
  };

  const finalizeRun = async (runId: string, status: CapabilityRunStatus): Promise<CapabilityRunRecord | null> => {
    const completedAt = nowIso();
    const updated = await refreshRunCounters(runId, {
      status,
      current_case_id: null,
      current_case_index: null,
      ended_at: completedAt,
      updated_at: completedAt
    });

    if (!updated) {
      return null;
    }

    await emitAndPersistEvent(runId, null, "capability_run_completed", status, {
      runId,
      status,
      completedAt,
      completedCases: updated.completed_cases,
      failedCases: updated.failed_cases,
      skippedCases: updated.skipped_cases,
      passedCases: updated.passed_cases,
      totalCases: updated.total_cases
    });
    return updated;
  };

  const executeSingleCase = async (
    run: CapabilityRunRecord,
    caseRecord: CapabilityCaseRecord
  ): Promise<void> => {
    const startedAt = nowIso();
    const runningCase: CapabilityCaseRecord = {
      ...caseRecord,
      status: "running",
      started_at: startedAt,
      ended_at: null,
      duration_ms: null,
      error_text: null,
      validation_result: null,
      validation_notes: [],
      updated_at: startedAt
    };
    await upsertCapabilityCase(runningCase);
    await upsertCapabilityRun({
      ...run,
      status: run.status === "created" ? "running" : run.status,
      started_at: run.started_at ?? startedAt,
      current_case_id: caseRecord.id,
      current_case_index: caseRecord.case_index,
      updated_at: startedAt
    });

    await emitAndPersistEvent(run.id, caseRecord.id, "capability_case_started", "running", {
      runId: run.id,
      caseId: caseRecord.id,
      caseIndex: caseRecord.case_index,
      totalCases: run.total_cases,
      domain: caseRecord.domain,
      category: caseRecord.category,
      capabilityId: caseRecord.capability_id,
      prompt: caseRecord.prompt_text,
      providerName: run.provider_name,
      modelName: run.model_name,
      memoryEnabled: true,
      toolsEnabled: true
    });

    let streamDeltaCount = 0;

    try {
      const execution = await options.executeCase({
        promptText: caseRecord.prompt_text,
        modelOverride: run.model_name,
        onStreamDelta: async (content) => {
          streamDeltaCount += 1;
          await emitAndPersistEvent(run.id, caseRecord.id, "capability_case_stream_delta", "running", {
            runId: run.id,
            caseId: caseRecord.id,
            content,
            streamDeltaCount,
            contentLength: content.length,
            providerName: run.provider_name,
            modelName: run.model_name
          });
        }
      });

      await emitAndPersistEvent(run.id, caseRecord.id, "capability_case_validation_started", "running", {
        runId: run.id,
        caseId: caseRecord.id,
        expectedContains: caseRecord.expected_contains_json,
        expectedNotContains: caseRecord.expected_not_contains_json
      });

      const validation = validateCapabilityCaseResponse(
        {
          domain: caseRecord.domain,
          task_type: caseRecord.task_type,
          expected_contains: caseRecord.expected_contains_json,
          expected_not_contains: caseRecord.expected_not_contains_json
        },
        execution.response.assistantMessage.content
      );

      await emitAndPersistEvent(run.id, caseRecord.id, "capability_case_validation_completed", "running", {
        runId: run.id,
        caseId: caseRecord.id,
        validationResult: validation.result,
        validationNotes: validation.notes
      });

      const completedAt = nowIso();
      const modelName = execution.modelName ?? execution.response.modelStatus.model ?? run.model_name;
      const providerName = execution.providerName ?? run.provider_name;
      const caseStatus =
        execution.response.modelStatus.status === "error"
          ? "failed"
          : validation.result === "passed"
            ? "passed"
            : validation.result === "completed_unscored"
              ? "completed_unscored"
              : "failed";
      const persistedCase = await upsertCapabilityCase({
        ...runningCase,
        status: caseStatus,
        ended_at: completedAt,
        duration_ms: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        provider_name: providerName,
        model_name: modelName,
        response_text: execution.response.assistantMessage.content,
        response_preview: execution.response.assistantMessage.content.slice(0, 280),
        error_text:
          execution.response.modelStatus.status === "error"
            ? execution.response.modelStatus.detail ?? execution.response.assistantMessage.content
            : null,
        validation_result: validation.result,
        validation_notes: validation.notes,
        updated_at: completedAt
      });

      const refreshedRun = await refreshRunCounters(run.id, {
        provider_name: providerName,
        model_name: modelName,
        current_case_id: null,
        current_case_index: null,
        updated_at: completedAt
      });

      await emitAndPersistEvent(
        run.id,
        caseRecord.id,
        caseStatus === "failed" ? "capability_case_failed" : "capability_case_completed",
        caseStatus,
        {
          runId: run.id,
          caseId: caseRecord.id,
          durationMs: persistedCase.duration_ms,
          providerName,
          modelName,
          validationResult: persistedCase.validation_result,
          validationNotes: persistedCase.validation_notes,
          routeFamily: execution.response.diagnostics?.routeFamily ?? null,
          awarenessUsed: execution.response.diagnostics?.awarenessUsed ?? false,
          taskState: execution.response.taskState ?? execution.response.diagnostics?.taskState ?? null
        }
      );

      if (refreshedRun) {
        await writeRunReports(refreshedRun.id);
      }
    } catch (error) {
      const completedAt = nowIso();
      const detail = error instanceof Error ? error.message : String(error);
      const failedCase = await upsertCapabilityCase({
        ...runningCase,
        status: "failed",
        ended_at: completedAt,
        duration_ms: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        error_text: detail,
        validation_result: "failed",
        validation_notes: [detail],
        updated_at: completedAt
      });

      const refreshedRun = await refreshRunCounters(run.id, {
        current_case_id: null,
        current_case_index: null,
        updated_at: completedAt
      });

      await emitAndPersistEvent(run.id, caseRecord.id, "capability_case_failed", "failed", {
        runId: run.id,
        caseId: caseRecord.id,
        durationMs: failedCase.duration_ms,
        error: detail
      });

      if (refreshedRun) {
        await writeRunReports(refreshedRun.id);
      }
    }
  };

  const runLoop = async (runId: string): Promise<void> => {
    while (true) {
      const snapshot = await getCapabilityRunSnapshot(runId);
      if (!snapshot) {
        break;
      }

      const { run, cases } = snapshot;

      if (run.status === "pausing") {
        const pausedAt = nowIso();
        await upsertCapabilityRun({
          ...run,
          status: "paused",
          current_case_id: null,
          current_case_index: null,
          updated_at: pausedAt
        });
        await emitAndPersistEvent(run.id, null, "capability_run_paused", "paused", {
          runId: run.id,
          pausedAt
        });
        break;
      }

      if (run.status === "stopping") {
        await finalizeRun(run.id, "stopped");
        break;
      }

      const nextCase = cases.find((entry) => entry.status === "pending" || entry.status === "interrupted");
      if (!nextCase) {
        const failedCases = cases.filter((entry) => entry.status === "failed").length;
        await finalizeRun(run.id, failedCases > 0 ? "completed" : "completed");
        break;
      }

      await executeSingleCase(run, nextCase);
    }
  };

  const ensureRunLoop = (runId: string): void => {
    if (activeRunId === runId && activePromise) {
      return;
    }
    if (activeRunId && activeRunId !== runId && activePromise) {
      throw new Error("Another capability run is already active.");
    }

    activeRunId = runId;
    activePromise = runLoop(runId).finally(() => {
      activeRunId = null;
      activePromise = null;
    });
  };

  const createRunFromCases = async (
    request: CapabilityRunStartRequest,
    caseEntries: CapabilityExpandedCase[] | CapabilityCaseRecord[]
  ): Promise<CapabilityRunSnapshot> => {
    const bundle = await loadCatalogBundle();
    const runId = buildRunId();
    const outputPath = buildOutputPath(options.runtimeRoot, runId);
    const expandedCases = caseEntries.map((entry) =>
      "prompt_text" in entry
        ? {
            id: entry.id,
            domain: entry.domain,
            category: entry.category,
            capability_id: entry.capability_id,
            title: entry.title,
            description: entry.title,
            status: "implemented",
            task_type: entry.task_type,
            difficulty: entry.difficulty,
            expected_route: entry.expected_route,
            prompt_variant: entry.prompt_variant,
            prompt_text: entry.prompt_text,
            expected_contains: [...entry.expected_contains_json],
            expected_not_contains: [...entry.expected_not_contains_json],
            notes: [],
            source_refs: [...entry.source_refs]
          }
        : entry
    );
    const run = buildRunRecord(runId, request, bundle, expandedCases, outputPath);
    const cases = "expected_contains_json" in caseEntries[0]!
      ? cloneFailedCasesAsPending(runId, caseEntries as CapabilityCaseRecord[])
      : buildCaseRecords(runId, expandedCases as CapabilityExpandedCase[]);

    await upsertCapabilityRun(run);
    await replaceCapabilityCases(runId, cases);
    await emitAndPersistEvent(run.id, null, "capability_run_created", run.status, {
      runId: run.id,
      totalCases: run.total_cases,
      selectedDomains: run.selected_domains,
      selectedCategories: run.selected_categories,
      statusFilter: run.status_filter,
      outputPath: run.output_path
    });

    const startedAt = nowIso();
    await upsertCapabilityRun({
      ...run,
      status: "running",
      started_at: startedAt,
      updated_at: startedAt
    });
    await emitAndPersistEvent(run.id, null, "capability_run_started", "running", {
      runId: run.id,
      startedAt,
      totalCases: run.total_cases,
      providerName: run.provider_name,
      modelName: run.model_name
    });
    ensureRunLoop(run.id);

    return (await getCapabilityRunSnapshot(run.id)) as CapabilityRunSnapshot;
  };

  return {
    async initialize(): Promise<void> {
      const recovered = await recoverCapabilityRuns();
      for (const run of recovered) {
        await emitAndPersistEvent(run.id, null, "capability_run_paused", "paused", {
          runId: run.id,
          reason: "recovered_after_restart"
        });
      }
      await loadCatalogBundle();
    },

    async getCatalogSummary(): Promise<CapabilityRunnerCatalogSummary> {
      return (await loadCatalogBundle()).summary;
    },

    async listRuns(): Promise<CapabilityRunRecord[]> {
      return await listCapabilityRuns();
    },

    async getSnapshot(runId?: string): Promise<CapabilityRunSnapshot | null> {
      if (runId) {
        return await getCapabilityRunSnapshot(runId);
      }

      const current = await getLatestNonTerminalCapabilityRun();
      return await getCapabilityRunSnapshot(current?.id ?? undefined);
    },

    async startRun(request: CapabilityRunStartRequest): Promise<CapabilityRunSnapshot> {
      const activeRuns = (await listCapabilityRuns()).filter((entry) => ACTIVE_RUN_STATUSES.has(entry.status));
      if (activeRuns.length > 0) {
        throw new Error("Finish, pause, or stop the current capability run before starting another one.");
      }

      const bundle = await loadCatalogBundle();
      const selectedDomains =
        request.selected_domains && request.selected_domains.length > 0
          ? new Set(request.selected_domains)
          : null;
      const selectedCategories =
        request.selected_categories && request.selected_categories.length > 0
          ? new Set(request.selected_categories)
          : null;
      const statusFilter =
        request.status_filter && request.status_filter.length > 0
          ? new Set(request.status_filter)
          : null;
      const selectedCases = bundle.expandedCases.filter((entry) => {
        if (selectedDomains && !selectedDomains.has(entry.domain)) {
          return false;
        }
        if (selectedCategories && !selectedCategories.has(entry.category)) {
          return false;
        }
        if (statusFilter && !statusFilter.has(entry.status)) {
          return false;
        }
        return true;
      });

      if (selectedCases.length === 0) {
        throw new Error("No capability cases matched the current filters.");
      }

      return await createRunFromCases(request, selectedCases);
    },

    async pauseAfterCurrent(runId: string): Promise<CapabilityRunRecord | null> {
      const run = await getCapabilityRun(runId);
      if (!run) {
        return null;
      }

      const updated = await upsertCapabilityRun({
        ...run,
        status: "pausing",
        updated_at: nowIso()
      });
      await emitAndPersistEvent(runId, null, "capability_run_pausing", "pausing", {
        runId,
        status: "pausing"
      });
      return updated;
    },

    async resumeRun(runId: string): Promise<CapabilityRunSnapshot | null> {
      const run = await getCapabilityRun(runId);
      if (!run) {
        return null;
      }

      const resumedAt = nowIso();
      await upsertCapabilityRun({
        ...run,
        status: "running",
        started_at: run.started_at ?? resumedAt,
        ended_at: null,
        updated_at: resumedAt
      });
      await emitAndPersistEvent(runId, null, "capability_run_resumed", "running", {
        runId,
        resumedAt
      });
      ensureRunLoop(runId);
      return await getCapabilityRunSnapshot(runId);
    },

    async stopAfterCurrent(runId: string): Promise<CapabilityRunRecord | null> {
      const run = await getCapabilityRun(runId);
      if (!run) {
        return null;
      }

      const updated = await upsertCapabilityRun({
        ...run,
        status: "stopping",
        updated_at: nowIso()
      });
      await emitAndPersistEvent(runId, null, "capability_run_stopping", "stopping", {
        runId,
        status: "stopping"
      });
      return updated;
    },

    async rerunFailed(runId: string): Promise<CapabilityRunSnapshot | null> {
      const snapshot = await getCapabilityRunSnapshot(runId);
      if (!snapshot) {
        return null;
      }

      const failedCases = snapshot.cases.filter(
        (entry) => entry.status === "failed" || entry.status === "interrupted"
      );
      if (failedCases.length === 0) {
        return null;
      }

      return await createRunFromCases(
        {
          selected_domains: snapshot.run.selected_domains,
          selected_categories: snapshot.run.selected_categories,
          status_filter: snapshot.run.status_filter,
          model_override: snapshot.run.model_name
        },
        failedCases
      );
    },

    async exportMarkdown(runId: string): Promise<CapabilityRunExportResult | null> {
      return await writeRunReports(runId);
    }
  };
};

export type CapabilityRunService = ReturnType<typeof createCapabilityRunService>;
