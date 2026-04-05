import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildChatReply } from "../../portable_lib/brain-chat-reply.mjs";
import { getTaskmanagerPaths } from "../../portable_lib/taskmanager-paths.mjs";
import { compactText, toInteger } from "../../shared/utils.mjs";

const SCHEDULER_FILE = path.join(getTaskmanagerPaths().appRuntimeStateRoot, "ai-task-scheduler.json");
const SCHEDULER_TICK_MS = 15_000;
const DEFAULT_TIME = "09:00";
const DEFAULT_WEEKLY_DAY = 1;
const MAX_NAME_CHARS = 120;
const MAX_PROMPT_CHARS = 6_000;

const EMPTY_STATE = Object.freeze({
  schemaVersion: 1,
  tasks: [],
});

const schedulerState = {
  loaded: false,
  tasks: [],
  timer: null,
  ticking: false,
  runningTaskIds: new Set(),
};

function ensureRuntimeDirectory() {
  fs.mkdirSync(path.dirname(SCHEDULER_FILE), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeIsoTimestamp(value, fallback = new Date().toISOString()) {
  const text = toText(value);
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizeTime(value, fallback = DEFAULT_TIME) {
  const text = toText(value);
  if (/^\d{2}:\d{2}$/.test(text)) {
    const [hours, minutes] = text.split(":").map((part) => Number(part));
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }
  return fallback;
}

function normalizeDate(value, fallback = new Date().toISOString().slice(0, 10)) {
  const text = toText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return fallback;
}

function normalizeScheduleType(value) {
  switch (toText(value).toLowerCase()) {
    case "once":
    case "hourly":
    case "daily":
    case "weekly":
      return toText(value).toLowerCase();
    default:
      return "daily";
  }
}

function normalizeScheduleConfig(scheduleType, input = {}) {
  switch (scheduleType) {
    case "once":
      return {
        date: normalizeDate(input?.date),
        time: normalizeTime(input?.time),
      };
    case "hourly":
      return {
        minuteOffset: Math.max(0, Math.min(59, toInteger(input?.minuteOffset, 0))),
      };
    case "weekly":
      return {
        dayOfWeek: Math.max(0, Math.min(6, toInteger(input?.dayOfWeek, DEFAULT_WEEKLY_DAY))),
        time: normalizeTime(input?.time),
      };
    case "daily":
    default:
      return {
        time: normalizeTime(input?.time),
      };
  }
}

function dateFromLocalParts(dateText, timeText) {
  const [year, month, day] = normalizeDate(dateText).split("-").map((value) => Number(value));
  const [hours, minutes] = normalizeTime(timeText).split(":").map((value) => Number(value));
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function setLocalTime(date, timeText) {
  const [hours, minutes] = normalizeTime(timeText).split(":").map((value) => Number(value));
  const next = new Date(date.getTime());
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function computeNextRunAt(scheduleType, scheduleConfig, referenceTime = new Date()) {
  const reference = referenceTime instanceof Date ? new Date(referenceTime.getTime()) : new Date(referenceTime);
  if (Number.isNaN(reference.getTime())) return null;

  switch (scheduleType) {
    case "once": {
      const target = dateFromLocalParts(scheduleConfig?.date, scheduleConfig?.time);
      return target.getTime() > reference.getTime() ? target.toISOString() : null;
    }
    case "hourly": {
      const minuteOffset = Math.max(0, Math.min(59, toInteger(scheduleConfig?.minuteOffset, 0)));
      const target = new Date(reference.getTime());
      target.setSeconds(0, 0);
      target.setMinutes(minuteOffset);
      if (target.getTime() <= reference.getTime()) {
        target.setHours(target.getHours() + 1);
      }
      return target.toISOString();
    }
    case "weekly": {
      const dayOfWeek = Math.max(0, Math.min(6, toInteger(scheduleConfig?.dayOfWeek, DEFAULT_WEEKLY_DAY)));
      const target = setLocalTime(reference, scheduleConfig?.time);
      const currentDay = target.getDay();
      let dayOffset = dayOfWeek - currentDay;
      if (dayOffset < 0 || (dayOffset === 0 && target.getTime() <= reference.getTime())) {
        dayOffset += 7;
      }
      target.setDate(target.getDate() + dayOffset);
      return target.toISOString();
    }
    case "daily":
    default: {
      const target = setLocalTime(reference, scheduleConfig?.time);
      if (target.getTime() <= reference.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.toISOString();
    }
  }
}

function normalizeTask(input = {}, nowIso = new Date().toISOString()) {
  const createdAt = normalizeIsoTimestamp(input?.createdAt, nowIso);
  const updatedAt = normalizeIsoTimestamp(input?.updatedAt, createdAt);
  const scheduleType = normalizeScheduleType(input?.scheduleType);
  const scheduleConfig = normalizeScheduleConfig(scheduleType, input?.scheduleConfig);
  const enabled = normalizeBoolean(input?.enabled, true);
  const nextRunAt =
    enabled && toText(input?.nextRunAt)
      ? normalizeIsoTimestamp(input.nextRunAt, nowIso)
      : enabled
        ? computeNextRunAt(scheduleType, scheduleConfig, updatedAt)
        : null;

  return {
    id: toText(input?.id) || crypto.randomUUID(),
    name: compactText(toText(input?.name) || "Untitled task", MAX_NAME_CHARS) || "Untitled task",
    prompt: String(input?.prompt || "").trim().slice(0, MAX_PROMPT_CHARS),
    scheduleType,
    scheduleConfig,
    enabled,
    nextRunAt,
    lastRunAt: toText(input?.lastRunAt) ? normalizeIsoTimestamp(input.lastRunAt, createdAt) : null,
    lastStatus: toText(input?.lastStatus || (enabled ? "scheduled" : "paused")).toLowerCase(),
    lastResultPreview: compactText(input?.lastResultPreview || "", 220) || null,
    lastError: compactText(input?.lastError || "", 220) || null,
    createdAt,
    updatedAt,
  };
}

function loadSchedulerState() {
  if (schedulerState.loaded) return schedulerState.tasks;
  try {
    ensureRuntimeDirectory();
    if (!fs.existsSync(SCHEDULER_FILE)) {
      schedulerState.tasks = [];
      schedulerState.loaded = true;
      return schedulerState.tasks;
    }
    const raw = fs.readFileSync(SCHEDULER_FILE, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : EMPTY_STATE;
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    schedulerState.tasks = tasks.map((task) => normalizeTask(task));
  } catch {
    schedulerState.tasks = [];
  }
  schedulerState.loaded = true;
  return schedulerState.tasks;
}

function persistSchedulerState() {
  ensureRuntimeDirectory();
  fs.writeFileSync(
    SCHEDULER_FILE,
    `${JSON.stringify({ schemaVersion: 1, tasks: schedulerState.tasks }, null, 2)}\n`,
    "utf8"
  );
}

function getStatusTone(task) {
  if (!task.enabled) return "warning";
  if (task.lastStatus === "running") return "active";
  if (task.lastStatus === "error") return "error";
  if (task.lastStatus === "success") return "active";
  return "neutral";
}

function getStatusLabel(task) {
  if (!task.enabled) return "Paused";
  switch (task.lastStatus) {
    case "running":
      return "Running";
    case "error":
      return "Error";
    case "success":
      return "Ready";
    case "paused":
      return "Paused";
    case "scheduled":
      return "Scheduled";
    default:
      return "Idle";
  }
}

function formatDateTime(value) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(value) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const delta = parsed.getTime() - Date.now();
  const absDelta = Math.abs(delta);
  if (absDelta < 60_000) return delta >= 0 ? "In under a minute" : "Just now";
  const minutes = Math.round(absDelta / 60_000);
  if (minutes < 60) return delta >= 0 ? `In ${minutes} min` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return delta >= 0 ? `In ${hours} hr` : `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return delta >= 0 ? `In ${days} d` : `${days} d ago`;
}

function dayName(dayOfWeek) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Math.max(0, Math.min(6, toInteger(dayOfWeek, 0)))] || "Mon";
}

function formatScheduleLabel(task) {
  switch (task.scheduleType) {
    case "once":
      return `Once • ${formatDateTime(dateFromLocalParts(task.scheduleConfig?.date, task.scheduleConfig?.time).toISOString())}`;
    case "hourly":
      return `Hourly • :${String(toInteger(task.scheduleConfig?.minuteOffset, 0)).padStart(2, "0")}`;
    case "weekly":
      return `Weekly • ${dayName(task.scheduleConfig?.dayOfWeek)} ${normalizeTime(task.scheduleConfig?.time)}`;
    case "daily":
    default:
      return `Daily • ${normalizeTime(task.scheduleConfig?.time)}`;
  }
}

function taskToRow(task) {
  return {
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    promptPreview: compactText(task.prompt, 140) || "No prompt configured.",
    scheduleType: task.scheduleType,
    scheduleConfig: clone(task.scheduleConfig),
    scheduleLabel: formatScheduleLabel(task),
    nextRunAt: task.nextRunAt,
    nextRunLabel: task.enabled ? formatDateTime(task.nextRunAt) : "Paused",
    nextRunRelativeLabel: task.enabled ? formatRelativeTime(task.nextRunAt) : "Paused",
    lastRunAt: task.lastRunAt,
    lastRunLabel: formatRelativeTime(task.lastRunAt),
    lastResultPreview: task.lastResultPreview,
    lastError: task.lastError,
    enabled: task.enabled,
    lastStatus: task.lastStatus,
    statusLabel: getStatusLabel(task),
    statusTone: getStatusTone(task),
    stateLabel: task.enabled ? "Enabled" : "Paused",
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function getAiTaskRows() {
  loadSchedulerState();
  return schedulerState.tasks.map((task) => taskToRow(task));
}

export function getAiTaskPayload() {
  const rows = getAiTaskRows().sort(
    (left, right) =>
      (left.nextRunAt ? new Date(left.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER) -
        (right.nextRunAt ? new Date(right.nextRunAt).getTime() : Number.MAX_SAFE_INTEGER) ||
      String(left.name || "").localeCompare(String(right.name || ""))
  );

  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    totalCount: rows.length,
    enabledCount: rows.filter((row) => row.enabled).length,
    pausedCount: rows.filter((row) => !row.enabled).length,
    rows,
    error: null,
  };
}

function replaceTask(taskId, updater) {
  loadSchedulerState();
  const index = schedulerState.tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return null;
  const current = schedulerState.tasks[index];
  const next = normalizeTask(updater(current), new Date().toISOString());
  schedulerState.tasks[index] = next;
  persistSchedulerState();
  return next;
}

function requireTask(taskId) {
  loadSchedulerState();
  const task = schedulerState.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    const error = new Error(`AI task not found: ${taskId}`);
    error.statusCode = 404;
    throw error;
  }
  return task;
}

function validateDraft(input) {
  const name = compactText(toText(input?.name), MAX_NAME_CHARS);
  const prompt = String(input?.prompt || "").trim().slice(0, MAX_PROMPT_CHARS);
  if (!name) {
    const error = new Error("Task name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!prompt) {
    const error = new Error("Task prompt is required.");
    error.statusCode = 400;
    throw error;
  }
  const scheduleType = normalizeScheduleType(input?.scheduleType);
  const scheduleConfig = normalizeScheduleConfig(scheduleType, input?.scheduleConfig);
  return {
    name,
    prompt,
    scheduleType,
    scheduleConfig,
    enabled: normalizeBoolean(input?.enabled, true),
  };
}

export function createAiTask(input) {
  loadSchedulerState();
  const nowIso = new Date().toISOString();
  const draft = validateDraft(input);
  const task = normalizeTask({
    id: crypto.randomUUID(),
    ...draft,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastStatus: draft.enabled ? "scheduled" : "paused",
    nextRunAt: draft.enabled ? computeNextRunAt(draft.scheduleType, draft.scheduleConfig, nowIso) : null,
  });
  schedulerState.tasks = [...schedulerState.tasks, task];
  persistSchedulerState();
  return task;
}

export function updateAiTask(taskId, input) {
  const existing = requireTask(taskId);
  const draft = validateDraft({ ...existing, ...input });
  return replaceTask(taskId, () => ({
    ...existing,
    ...draft,
    updatedAt: new Date().toISOString(),
    lastStatus: draft.enabled ? existing.lastStatus === "paused" ? "scheduled" : existing.lastStatus : "paused",
    nextRunAt: draft.enabled ? computeNextRunAt(draft.scheduleType, draft.scheduleConfig, new Date()) : null,
    lastError: draft.enabled ? existing.lastError : null,
  }));
}

export function deleteAiTask(taskId) {
  loadSchedulerState();
  const nextTasks = schedulerState.tasks.filter((task) => task.id !== taskId);
  if (nextTasks.length === schedulerState.tasks.length) {
    const error = new Error(`AI task not found: ${taskId}`);
    error.statusCode = 404;
    throw error;
  }
  schedulerState.tasks = nextTasks;
  persistSchedulerState();
}

async function executeAiTask(taskId, reason = "scheduled") {
  const existing = requireTask(taskId);
  if (schedulerState.runningTaskIds.has(taskId)) return requireTask(taskId);

  schedulerState.runningTaskIds.add(taskId);
  replaceTask(taskId, (task) => ({
    ...task,
    lastStatus: "running",
    lastError: null,
    updatedAt: new Date().toISOString(),
  }));

  try {
    const reply = await buildChatReply(existing.prompt, "repo-knowledge-pack", {
      sessionId: `ai-task-${taskId}`,
      localLlm: true,
      internet: false,
      fullBrainContext: false,
    });

    const completedAt = new Date();
    return replaceTask(taskId, (task) => ({
      ...task,
      lastRunAt: completedAt.toISOString(),
      lastStatus: "success",
      lastResultPreview: compactText(reply?.reply || "Task completed.", 220) || "Task completed.",
      lastError: null,
      nextRunAt:
        task.scheduleType === "once"
          ? null
          : task.enabled
            ? computeNextRunAt(task.scheduleType, task.scheduleConfig, completedAt)
            : null,
      enabled: task.scheduleType === "once" ? false : task.enabled,
      updatedAt: completedAt.toISOString(),
    }));
  } catch (error) {
    const completedAt = new Date();
    return replaceTask(taskId, (task) => ({
      ...task,
      lastRunAt: completedAt.toISOString(),
      lastStatus: "error",
      lastError: compactText(error instanceof Error ? error.message : String(error), 220) || "Task failed.",
      nextRunAt:
        task.scheduleType === "once"
          ? null
          : task.enabled
            ? computeNextRunAt(task.scheduleType, task.scheduleConfig, completedAt)
            : null,
      enabled: task.scheduleType === "once" ? false : task.enabled,
      updatedAt: completedAt.toISOString(),
    }));
  } finally {
    schedulerState.runningTaskIds.delete(taskId);
  }
}

export async function runAiTaskNow(taskId) {
  return executeAiTask(taskId, "manual");
}

async function tickAiTaskScheduler() {
  if (schedulerState.ticking) return;
  schedulerState.ticking = true;
  try {
    loadSchedulerState();
    const now = Date.now();
    const dueTasks = schedulerState.tasks
      .filter(
        (task) =>
          task.enabled &&
          task.nextRunAt &&
          new Date(task.nextRunAt).getTime() <= now &&
          !schedulerState.runningTaskIds.has(task.id)
      )
      .sort((left, right) => new Date(left.nextRunAt).getTime() - new Date(right.nextRunAt).getTime());

    for (const task of dueTasks) {
      await executeAiTask(task.id, "scheduled");
    }
  } finally {
    schedulerState.ticking = false;
  }
}

export function ensureAiTaskSchedulerStarted() {
  loadSchedulerState();
  if (schedulerState.timer) return;
  schedulerState.timer = setInterval(() => {
    void tickAiTaskScheduler();
  }, SCHEDULER_TICK_MS);
  if (typeof schedulerState.timer.unref === "function") {
    schedulerState.timer.unref();
  }
}

export function stopAiTaskScheduler() {
  if (schedulerState.timer) {
    clearInterval(schedulerState.timer);
    schedulerState.timer = null;
  }
}

