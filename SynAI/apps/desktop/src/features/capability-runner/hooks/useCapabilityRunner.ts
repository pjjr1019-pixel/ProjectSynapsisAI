import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CapabilityCatalogStatus,
  CapabilityEventRecord,
  CapabilityRunRecord,
  CapabilityRunSnapshot,
  CapabilityRunnerCatalogSummary,
  CapabilityRunnerDomain
} from "@contracts";

const bridge = () => window.synai;

const allStatuses: CapabilityCatalogStatus[] = ["implemented", "partial", "stubbed", "planned"];

const allDomainsFromCatalog = (catalog: CapabilityRunnerCatalogSummary | null): CapabilityRunnerDomain[] =>
  catalog?.domains.map((entry) => entry.domain) ?? [];

export const useCapabilityRunner = (defaultModel: string | null) => {
  const [catalog, setCatalog] = useState<CapabilityRunnerCatalogSummary | null>(null);
  const [runs, setRuns] = useState<CapabilityRunRecord[]>([]);
  const [snapshot, setSnapshot] = useState<CapabilityRunSnapshot | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<CapabilityRunnerDomain[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<CapabilityCatalogStatus[]>(allStatuses);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveStreamPreview, setLiveStreamPreview] = useState("");
  const [tickMs, setTickMs] = useState(Date.now());

  const refreshRuns = useCallback(async (): Promise<CapabilityRunRecord[]> => {
    const nextRuns = await bridge().listCapabilityRuns();
    setRuns(nextRuns);
    return nextRuns;
  }, []);

  const refreshSnapshot = useCallback(async (runId?: string | null): Promise<CapabilityRunSnapshot | null> => {
    const nextSnapshot = await bridge().getCapabilityRunSnapshot(runId ?? undefined);
    setSnapshot(nextSnapshot);
    setSelectedRunId(nextSnapshot?.run.id ?? null);
    if (!nextSnapshot?.run.current_case_id) {
      setLiveStreamPreview("");
    }
    return nextSnapshot;
  }, []);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      setLoading(true);
      try {
        const [nextCatalog, nextRuns, nextSnapshot] = await Promise.all([
          bridge().getCapabilityRunnerCatalogSummary(),
          bridge().listCapabilityRuns(),
          bridge().getCapabilityRunSnapshot()
        ]);
        if (!mounted) {
          return;
        }
        setCatalog(nextCatalog);
        setRuns(nextRuns);
        setSnapshot(nextSnapshot);
        setSelectedRunId(nextSnapshot?.run.id ?? null);
        setSelectedDomains(nextCatalog.domains.map((entry) => entry.domain));
        setError(null);
      } catch (cause) {
        if (!mounted) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Failed to load Capability Runner.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void start();

    const unsubscribe = bridge().subscribeCapabilityRunnerEvents((event) => {
      if (!mounted) {
        return;
      }

      setRuns((current) => {
        const existing = current.find((entry) => entry.id === event.run_id);
        if (!existing) {
          void refreshRuns();
          return current;
        }
        return current;
      });

      if (!selectedRunId || selectedRunId !== event.run_id) {
        void refreshRuns();
        return;
      }

      setSnapshot((current) => {
        if (!current || current.run.id !== event.run_id) {
          return current;
        }

        const nextEvents = [...current.events, event].slice(-500);
        if (event.event_type !== "capability_case_stream_delta") {
          return {
            ...current,
            events: nextEvents
          };
        }

        const nextCases = current.cases.map((entry) =>
          entry.id === event.case_id
            ? {
                ...entry,
                response_preview:
                  typeof event.payload_json.content === "string"
                    ? event.payload_json.content.slice(0, 280)
                    : entry.response_preview
              }
            : entry
        );

        const nextPreview =
          typeof event.payload_json.content === "string" ? event.payload_json.content : liveStreamPreview;
        setLiveStreamPreview(nextPreview);

        return {
          ...current,
          cases: nextCases,
          events: nextEvents
        };
      });

      if (event.event_type !== "capability_case_stream_delta") {
        void refreshSnapshot(event.run_id);
        void refreshRuns();
      }
    });

    const interval = window.setInterval(() => {
      setTickMs(Date.now());
    }, 1000);

    return () => {
      mounted = false;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [refreshRuns, refreshSnapshot, selectedRunId, liveStreamPreview]);

  const availableCategories = useMemo(() => {
    if (!catalog) {
      return [];
    }
    const selected = new Set(selectedDomains);
    return catalog.domains
      .filter((entry) => selected.size === 0 || selected.has(entry.domain))
      .flatMap((entry) => entry.categories.map((category) => category.category))
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort((left, right) => left.localeCompare(right));
  }, [catalog, selectedDomains]);

  const currentRun = snapshot?.run ?? null;
  const currentCase = useMemo(() => {
    if (!snapshot?.run.current_case_id) {
      return null;
    }
    return snapshot.cases.find((entry) => entry.id === snapshot.run.current_case_id) ?? null;
  }, [snapshot]);

  const startRun = useCallback(async (): Promise<void> => {
    setActionBusy("start");
    try {
      const started = await bridge().startCapabilityRun({
        selected_domains: selectedDomains.length > 0 ? selectedDomains : undefined,
        selected_categories: selectedCategory !== "all" ? [selectedCategory] : undefined,
        status_filter: statusFilter,
        model_override: defaultModel && defaultModel.trim().length > 0 ? defaultModel : undefined
      });
      setSnapshot(started);
      setSelectedRunId(started.run.id);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to start capability run.");
    } finally {
      setActionBusy(null);
    }
  }, [defaultModel, refreshRuns, selectedCategory, selectedDomains, statusFilter]);

  const pauseRun = useCallback(async (): Promise<void> => {
    if (!selectedRunId) {
      return;
    }
    setActionBusy("pause");
    try {
      await bridge().pauseCapabilityRun(selectedRunId);
      await refreshSnapshot(selectedRunId);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to pause capability run.");
    } finally {
      setActionBusy(null);
    }
  }, [refreshRuns, refreshSnapshot, selectedRunId]);

  const resumeRun = useCallback(async (): Promise<void> => {
    if (!selectedRunId) {
      return;
    }
    setActionBusy("resume");
    try {
      const nextSnapshot = await bridge().resumeCapabilityRun(selectedRunId);
      setSnapshot(nextSnapshot);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to resume capability run.");
    } finally {
      setActionBusy(null);
    }
  }, [refreshRuns, selectedRunId]);

  const stopRun = useCallback(async (): Promise<void> => {
    if (!selectedRunId) {
      return;
    }
    setActionBusy("stop");
    try {
      await bridge().stopCapabilityRun(selectedRunId);
      await refreshSnapshot(selectedRunId);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to stop capability run.");
    } finally {
      setActionBusy(null);
    }
  }, [refreshRuns, refreshSnapshot, selectedRunId]);

  const rerunFailed = useCallback(async (): Promise<void> => {
    if (!selectedRunId) {
      return;
    }
    setActionBusy("rerun");
    try {
      const nextSnapshot = await bridge().rerunFailedCapabilityRun(selectedRunId);
      setSnapshot(nextSnapshot);
      setSelectedRunId(nextSnapshot?.run.id ?? null);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to rerun failed capability cases.");
    } finally {
      setActionBusy(null);
    }
  }, [refreshRuns, selectedRunId]);

  const exportMarkdown = useCallback(async (): Promise<void> => {
    if (!selectedRunId) {
      return;
    }
    setActionBusy("export");
    try {
      await bridge().exportCapabilityRunMarkdown(selectedRunId);
      await refreshSnapshot(selectedRunId);
      await refreshRuns();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to export capability markdown.");
    } finally {
      setActionBusy(null);
    }
  }, [refreshRuns, refreshSnapshot, selectedRunId]);

  const selectRun = useCallback(async (runId: string): Promise<void> => {
    setSelectedRunId(runId);
    await refreshSnapshot(runId);
    setError(null);
  }, [refreshSnapshot]);

  const toggleDomain = useCallback((domain: CapabilityRunnerDomain): void => {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((entry) => entry !== domain) : [...current, domain]
    );
  }, []);

  const toggleStatus = useCallback((status: CapabilityCatalogStatus): void => {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]
    );
  }, []);

  return {
    catalog,
    runs,
    snapshot,
    currentRun,
    currentCase,
    selectedRunId,
    selectedDomains,
    selectedCategory,
    statusFilter,
    availableCategories,
    loading,
    actionBusy,
    error,
    liveStreamPreview,
    tickMs,
    allDomains: allDomainsFromCatalog(catalog),
    setSelectedCategory,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    rerunFailed,
    exportMarkdown,
    selectRun,
    toggleDomain,
    toggleStatus
  };
};
