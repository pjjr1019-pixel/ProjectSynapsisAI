import { useEffect, useState } from "react";
import type { PromptEvaluationRequest, PromptEvaluationResponse } from "@contracts";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Input } from "../../../shared/components/Input";
import { Textarea } from "../../../shared/components/Textarea";
import type { ChatSettingsState } from "../types/localChat.types";
import {
  PROMPT_EVAL_STORAGE_KEY,
  buildPromptEvaluationRequest,
  buildPromptEvaluationCases,
  clonePromptEvaluationDraft,
  defaultPromptEvaluationDraft,
  getPromptEvaluationSuiteConfig,
  hydratePromptEvaluationDraft,
  promptEvaluationPresets,
  promptEvaluationFields,
  type PromptEvaluationDraft
} from "../utils/promptEvaluation";

interface PromptEvaluationCardProps {
  settings: ChatSettingsState;
  running: boolean;
  result: PromptEvaluationResponse | null;
  error: string | null;
  onRun: (request: PromptEvaluationRequest) => Promise<void>;
}

const loadDraft = (): PromptEvaluationDraft => {
  if (typeof window === "undefined") {
    return defaultPromptEvaluationDraft;
  }

  try {
    const raw = window.localStorage.getItem(PROMPT_EVAL_STORAGE_KEY);
    if (!raw) {
      return defaultPromptEvaluationDraft;
    }

    return hydratePromptEvaluationDraft(JSON.parse(raw) as Partial<PromptEvaluationDraft>);
  } catch {
    return defaultPromptEvaluationDraft;
  }
};

export function PromptEvaluationCard(props: PromptEvaluationCardProps) {
  const [draft, setDraft] = useState<PromptEvaluationDraft>(loadDraft);
  const cases = buildPromptEvaluationCases(draft);
  const suiteConfig = getPromptEvaluationSuiteConfig(draft.suiteMode);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PROMPT_EVAL_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const updateField = (field: keyof PromptEvaluationDraft, value: string): void => {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleRun = async (): Promise<void> => {
    if (cases.length === 0) {
      return;
    }

    await props.onRun(buildPromptEvaluationRequest(draft, props.settings.selectedModel || undefined));
  };

  return (
    <Card className="space-y-2 p-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-100">Prompt Eval</h3>
          <p className="text-[9px] text-slate-400">
            Run a repeatable suite and save every reply to Markdown.
          </p>
        </div>
      </div>

      <p className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[9px] text-slate-400">
        Choose a preset for the current build. Chat Suite asks grounded product questions from the repo. Windows Suite
        uses Windows and machine-awareness questions the app already routes more cleanly.
      </p>

      <p className="rounded-md border border-cyan-950 bg-cyan-950/30 px-2 py-1.5 text-[9px] text-cyan-100">
        {suiteConfig.note}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {promptEvaluationPresets.map((preset) => (
          <Button
            key={preset.id}
            className="py-1 text-[10px]"
            variant="ghost"
            disabled={props.running}
            onClick={() => setDraft(clonePromptEvaluationDraft(preset.draft))}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-[9px] text-slate-400">Suite name</span>
          <Input
            value={draft.suiteName}
            placeholder="SynAI grounded product eval"
            className="py-1 text-[10px]"
            onChange={(event) => updateField("suiteName", event.target.value)}
          />
        </label>

        {promptEvaluationFields.map((field) => (
          <label key={field.key} className="grid gap-1">
            <span className="text-[9px] text-slate-400">
              {field.label} prompt
              {" | "}
              {field.description}
            </span>
            <Textarea
              rows={3}
              value={draft[field.key]}
              className="min-h-[72px] py-1.5 text-[10px]"
              onChange={(event) => updateField(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="text-[9px] text-slate-400">
        Using model {props.settings.selectedModel || "default"} | suite {draft.suiteMode} | mode{" "}
        {suiteConfig.responseMode} | awareness {suiteConfig.awarenessAnswerMode} | web{" "}
        {suiteConfig.useWebSearch ? "on" : "off"} | workspace{" "}
        {suiteConfig.ragOptions.workspaceIndexingEnabled ? "on" : "off"}
      </p>

      <Button
        className="w-full py-1 text-[10px]"
        variant="ghost"
        disabled={props.running || cases.length === 0}
        onClick={() => void handleRun()}
      >
        {props.running ? "Running Prompt Eval..." : `Run ${cases.length}-Prompt Eval`}
      </Button>

      {props.error ? <p className="text-[9px] text-rose-300">{props.error}</p> : null}

      {props.result ? (
        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2 text-[9px] text-slate-300">
          <p>
            Last run: {props.result.summary.successCount}/{props.result.summary.total} prompts succeeded.
          </p>
          <p className="mt-1">
            Quality: {props.result.summary.qualityPassCount} passed |{" "}
            {props.result.summary.qualityNeedsReviewCount} need review.
          </p>
          <p className="mt-1 break-all font-mono text-[8px] text-cyan-200">{props.result.reportPath}</p>
        </div>
      ) : (
        <p className="text-[9px] text-slate-500">
          Reports are written to <span className="font-mono">.runtime/prompt-evals</span>.
        </p>
      )}
    </Card>
  );
}
