/**
 * Append-only JSONL logs under brain/runtime/logs/chat-turns/ for human review (not auto-promoted to scenarios).
 *
 * Env: REVIEW_LOG_ENABLED — default 1; set to 0, false, off to disable writes.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { ensureBrainRuntimeHub, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function enabled() {
  const v = String(process.env.REVIEW_LOG_ENABLED ?? "1").toLowerCase();
  return !["0", "false", "off", "no"].includes(v);
}

/**
 * @param {{
 *   sessionId?: string,
 *   userMessage: string,
 *   draftSource: string,
 *   draftPreview: string,
 *   finalReply: string,
 *   localLlm: boolean,
 *   llmMode: string | null,
 *   model: string | null,
 *   turnSeq: number,
 *   error?: string,
 * }} entry
 */
export function appendReviewLog(entry) {
  if (!enabled()) return;
  try {
    migrateLegacyBrainRuntimeData();
    const root = ensureBrainRuntimeHub().chatTurnsRoot;
    const day = new Date().toISOString().slice(0, 10);
    const file = path.join(root, `${day}.jsonl`);
    const sessionHash = entry.sessionId
      ? crypto.createHash("sha256").update(entry.sessionId).digest("hex").slice(0, 16)
      : "";
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      sessionHash,
      userMessage: String(entry.userMessage ?? "").slice(0, 8000),
      draftSource: entry.draftSource,
      draftPreview: String(entry.draftPreview ?? "").slice(0, 2000),
      finalReply: String(entry.finalReply ?? "").slice(0, 8000),
      localLlm: entry.localLlm,
      llmMode: entry.llmMode,
      model: entry.model,
      turnSeq: entry.turnSeq,
      ...(entry.error ? { error: entry.error } : {}),
    });
    fs.appendFileSync(file, line + "\n", "utf8");
  } catch (e) {
    console.error("[brain-review-log]", e?.message || e);
  }
}
