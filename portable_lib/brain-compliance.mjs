import { sha256Text } from "./brain-build-utils.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

export const LICENSE_MAP = {
  "public-domain": { risk: "green", retrievalSafe: true, trainingSafe: true },
  cc0: { risk: "green", retrievalSafe: true, trainingSafe: true },
  "cc-by-4.0": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "us-government": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "odc-by-1.0": { risk: "green", retrievalSafe: true, trainingSafe: true },
  "rss-link-only": { risk: "yellow", retrievalSafe: true, trainingSafe: false },
  unknown: { risk: "red", retrievalSafe: false, trainingSafe: false },
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;

function normalizeLicense(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function resolveLicensePolicy(license) {
  const normalized = normalizeLicense(license) || "unknown";
  return {
    license: normalized,
    ...(LICENSE_MAP[normalized] || LICENSE_MAP.unknown),
  };
}

export function scanForPii(text) {
  const value = String(text ?? "");
  const matches = [];
  if (EMAIL_RE.test(value)) matches.push("email");
  if (PHONE_RE.test(value)) matches.push("phone");
  if (SSN_RE.test(value)) matches.push("ssn");
  return {
    status: matches.length ? "flagged" : "clean",
    matches,
  };
}

export function exactContentHash(text) {
  return sha256Text(String(text ?? ""));
}

export function nearDuplicateSimilarity(left, right) {
  const a = new Set(tokenizeForRetrieval(left));
  const b = new Set(tokenizeForRetrieval(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / new Set([...a, ...b]).size;
}

export function isNearDuplicate(left, right, threshold = 0.92) {
  return nearDuplicateSimilarity(left, right) >= threshold;
}

export async function fetchRobotsAllowance(origin, targetPath = "/") {
  const base = String(origin ?? "").trim().replace(/\/+$/, "");
  if (!base) return { allowed: false, reason: "missing_origin" };
  try {
    const response = await fetch(`${base}/robots.txt`, {
      headers: { "User-Agent": "HorizonsAI-Ingestion/1.0" },
    });
    if (!response.ok) {
      return { allowed: false, reason: `robots_http_${response.status}` };
    }
    const robots = await response.text();
    const rules = robots.split(/\r?\n/);
    const disallows = [];
    let applies = false;
    for (const line of rules) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [keyRaw, ...rest] = trimmed.split(":");
      const key = String(keyRaw || "").trim().toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*" || value.toLowerCase() === "horizonsai-ingestion";
      } else if (applies && key === "disallow" && value) {
        disallows.push(value);
      }
    }
    const cleanPath = String(targetPath || "/");
    const blocked = disallows.some((rule) => cleanPath.startsWith(rule));
    return { allowed: !blocked, reason: blocked ? "robots_disallow" : "allowed" };
  } catch (error) {
    return { allowed: false, reason: error?.message || "robots_fetch_failed" };
  }
}
