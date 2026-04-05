import { spawn } from "node:child_process";
import path from "node:path";
import {
  EXECUTION_MODES,
  SCRIPT_POLICY_CLASS,
} from "./contracts.mjs";
import { appendJsonLine } from "./paths.mjs";

function sanitizeValue(value) {
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = String(value || "").trim();
  if (!text) return "";
  if (/[;&|><`]/.test(text)) {
    throw new Error("Unsafe argument detected.");
  }
  return text;
}

function validateArgs(inputs, args) {
  const out = {};
  const schema = inputs && typeof inputs === "object" ? inputs : {};
  for (const [name, definition] of Object.entries(schema)) {
    const input = args?.[name];
    if (input === undefined || input === null || input === "") {
      if (definition?.default !== undefined) out[name] = definition.default;
      continue;
    }
    if (definition?.type === "number") {
      const n = Number(input);
      if (!Number.isFinite(n)) throw new Error(`Invalid numeric arg: ${name}`);
      out[name] = n;
      continue;
    }
    if (definition?.type === "boolean") {
      out[name] = input === true || String(input).toLowerCase() === "true";
      continue;
    }
    out[name] = sanitizeValue(input);
  }
  for (const [name, value] of Object.entries(args || {})) {
    if (out[name] !== undefined) continue;
    out[name] = sanitizeValue(value);
  }
  return out;
}

function canAutorun(policyClass) {
  return policyClass === SCRIPT_POLICY_CLASS.READ_ONLY_SAFE || policyClass === SCRIPT_POLICY_CLASS.LOCAL_SAFE;
}

function runCommand({ cwd, command, args, timeoutMs }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ ok: false, exitCode: null, stdout, stderr: `${stderr}\nTimed out.`, durationMs: Date.now() - startedAt });
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, exitCode: code, stdout, stderr, durationMs: Date.now() - startedAt });
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, exitCode: null, stdout, stderr: `${stderr}\n${String(error?.message || error)}`, durationMs: Date.now() - startedAt });
    });
  });
}

export class ScriptExecutionService {
  constructor({ paths }) {
    this.paths = paths;
  }

  async execute({ decision, selected, executionPolicy }) {
    const mode = decision.execution_mode;
    const safeArgs = validateArgs(selected?.inputs || {}, decision.argument_map || {});

    if (mode === EXECUTION_MODES.NONE || mode === EXECUTION_MODES.SUGGEST_ONLY) {
      return {
        ok: true,
        skipped: true,
        reason: "Execution skipped by mode.",
        sanitized_args: safeArgs,
      };
    }

    if (mode === EXECUTION_MODES.ASK_FIRST) {
      return {
        ok: true,
        skipped: true,
        requires_confirmation: true,
        reason: "Confirmation required by policy.",
        sanitized_args: safeArgs,
      };
    }

    if (mode === EXECUTION_MODES.AUTORUN && !canAutorun(selected?.policy_class)) {
      return {
        ok: false,
        skipped: true,
        requires_confirmation: true,
        reason: "Script safety class cannot be autorun.",
        sanitized_args: safeArgs,
      };
    }

    const runToolPath = path.join(this.paths.scriptsRoot, "run-tool.js");
    const commandArgs = [runToolPath, selected.id];
    for (const [name, value] of Object.entries(safeArgs)) {
      commandArgs.push(`--${name}`);
      commandArgs.push(String(value));
    }

    if (mode === EXECUTION_MODES.DRY_RUN) {
      commandArgs.push("--dry_run");
      commandArgs.push("true");
    }

    const commandResult = await runCommand({
      cwd: this.paths.taskmanagerRoot,
      command: process.execPath,
      args: commandArgs,
      timeoutMs: Math.max(1_000, Number(selected?.timeout_seconds || 30) * 1_000),
    });

    const payload = {
      ts: new Date().toISOString(),
      policy: executionPolicy,
      script_id: selected.id,
      script_path: selected.path,
      mode,
      args: safeArgs,
      result: commandResult,
    };
    appendJsonLine(this.paths.specialistExecutionLogFile, payload);

    return {
      ok: commandResult.ok,
      skipped: false,
      command_result: commandResult,
      sanitized_args: safeArgs,
    };
  }
}
