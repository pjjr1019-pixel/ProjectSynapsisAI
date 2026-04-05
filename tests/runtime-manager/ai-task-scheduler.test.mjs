import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const taskmanagerRoot = path.resolve(__dirname, "..", "..");
const schedulerModulePath = path.resolve(taskmanagerRoot, "server", "runtime-manager", "ai-task-scheduler.mjs");
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "horizons-ai-task-"));
let schedulerModulePromise = null;

async function loadSchedulerModule() {
  process.env.HORIZONS_TASKMANAGER_ROOT = taskmanagerRoot;
  process.env.HORIZONS_RUNTIME_STATE_ROOT = runtimeRoot;
  schedulerModulePromise ||= import(
    `${pathToFileURL(schedulerModulePath).href}?test=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  const mod = await schedulerModulePromise;
  return { runtimeRoot, mod };
}

test("computeNextRunAt handles once, hourly, daily, and weekly schedules", async () => {
  const { mod } = await loadSchedulerModule();
  const reference = new Date("2026-04-04T10:15:00");

  assert.equal(
    mod.computeNextRunAt("once", { date: "2026-04-05", time: "09:30" }, reference),
    new Date(2026, 3, 5, 9, 30, 0, 0).toISOString()
  );
  assert.equal(mod.computeNextRunAt("hourly", { minuteOffset: 45 }, reference), new Date("2026-04-04T10:45:00.000").toISOString());
  assert.equal(mod.computeNextRunAt("daily", { time: "09:30" }, reference), new Date(2026, 3, 5, 9, 30, 0, 0).toISOString());
  assert.equal(mod.computeNextRunAt("weekly", { dayOfWeek: 1, time: "08:00" }, reference), new Date(2026, 3, 6, 8, 0, 0, 0).toISOString());
});

test("AI task CRUD persists scheduler state and payload metadata", async () => {
  const { runtimeRoot, mod } = await loadSchedulerModule();
  const created = mod.createAiTask({
    name: "Morning AI summary",
    prompt: "Summarize the AI runtime and tell me what needs attention.",
    scheduleType: "daily",
    scheduleConfig: { time: "08:15" },
    enabled: true,
  });

  let payload = mod.getAiTaskPayload();
  assert.equal(payload.ok, true);
  assert.equal(payload.totalCount, 1);
  assert.equal(payload.rows[0].name, "Morning AI summary");
  assert.equal(payload.rows[0].statusLabel, "Scheduled");
  assert.equal(payload.rows[0].stateLabel, "Enabled");

  mod.updateAiTask(created.id, {
    enabled: false,
    scheduleType: "weekly",
    scheduleConfig: { dayOfWeek: 5, time: "13:45" },
  });

  payload = mod.getAiTaskPayload();
  assert.equal(payload.pausedCount, 1);
  assert.equal(payload.rows[0].enabled, false);
  assert.equal(payload.rows[0].scheduleType, "weekly");
  assert.equal(payload.rows[0].scheduleConfig.dayOfWeek, 5);
  assert.equal(payload.rows[0].stateLabel, "Paused");

  const persistedFile = path.join(runtimeRoot, "ai-task-scheduler.json");
  assert.equal(fs.existsSync(persistedFile), true);
  const persisted = JSON.parse(fs.readFileSync(persistedFile, "utf8"));
  assert.equal(Array.isArray(persisted.tasks), true);
  assert.equal(persisted.tasks.length, 1);

  mod.deleteAiTask(created.id);
  payload = mod.getAiTaskPayload();
  assert.equal(payload.totalCount, 0);
});
