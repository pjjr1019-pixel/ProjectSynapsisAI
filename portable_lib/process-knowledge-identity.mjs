import fs from "node:fs";
import path from "node:path";
import { normalizeSlashes, sha256File, sha256Text } from "./brain-build-utils.mjs";
import { processKnowledgeRoot } from "./process-knowledge-paths.mjs";

const COMMON_PUBLISHER_SUFFIXES = [
  /\s*,?\s+inc\.?$/i,
  /\s*,?\s+llc\.?$/i,
  /\s*,?\s+ltd\.?$/i,
  /\s*,?\s+corp\.?$/i,
  /\s*,?\s+limited$/i,
];

const GENERIC_PATH_SEGMENTS = new Set([
  "cache",
  "downloads",
  "local",
  "low",
  "package cache",
  "package-cache",
  "packagecache",
  "packages",
  "temp",
  "tmp",
]);

function toText(value) {
  return String(value ?? "").trim();
}

function toSlug(value) {
  return toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripCommonPublisherSuffixes(value) {
  let text = toText(value);
  if (!text) return "";
  let previous = "";
  while (text && text !== previous) {
    previous = text;
    text = text
      .replace(/\s*,?\s+(?:inc\.?|llc\.?|ltd\.?|corp\.?|limited)\s*$/i, "")
      .trim();
  }
  return text;
}

function normalizeBasename(value) {
  const normalized = normalizeSlashes(toText(value));
  if (!normalized) return "";
  return normalized.split("/").pop() || "";
}

function looksLikePublisherSegment(value) {
  const slug = toSlug(value);
  if (!slug || slug === "unknown") return false;
  if (GENERIC_PATH_SEGMENTS.has(slug)) return false;
  return /[a-z]/.test(slug);
}

function normalizeOptionalText(value) {
  const text = toText(value);
  return text ? text : null;
}

function normalizeVersionMajorMinor(value) {
  const text = toText(value).replace(/^v(?=\d)/i, "");
  if (!text) return "";
  const parts = text.split(/[^0-9]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  if (parts.length === 1) return parts[0];
  return text.toLowerCase();
}

function parseDateValue(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function isOlderThanDays(value, days, now = new Date()) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return now.getTime() - parsed.getTime() > days * 24 * 60 * 60 * 1000;
}

function normalizePublisherForIdentity(value) {
  const text = toText(value);
  if (!text) return "unknown";
  return toSlug(text) || "unknown";
}

function truncatePublisherSlugForFilename(imageName, publisherSlug) {
  if (imageName.length + publisherSlug.length <= 160) return publisherSlug;
  const next = publisherSlug.slice(0, 60).replace(/-+$/g, "");
  return next || "unknown";
}

export function normalizeImageName(value) {
  const baseName = normalizeBasename(value || "");
  const stripped = baseName.replace(/\.(exe|com|scr)$/i, "");
  const slug = toSlug(stripped);
  return slug || "unknown";
}

export function slugifyPublisher(value) {
  const stripped = stripCommonPublisherSuffixes(value);
  const slug = toSlug(stripped);
  return slug || "unknown";
}

export function slugifyPublisherForIdentity(value) {
  const slug = normalizePublisherForIdentity(value);
  return slug || "unknown";
}

export function derivePublisherSlugFromPath(fullPath) {
  const normalized = normalizeSlashes(toText(fullPath));
  if (!normalized) return "unknown";
  const lower = normalized.toLowerCase();
  if (lower.includes("/windows/system32/") || lower.includes("/windows/syswow64/")) {
    return "microsoft-corporation";
  }

  const programFilesMatch = normalized.match(/\/Program Files(?: \(x86\))?\/([^/]+)/i);
  if (programFilesMatch?.[1]) {
    const slug = slugifyPublisherForIdentity(programFilesMatch[1]);
    if (slug !== "unknown") return slug;
  }

  const localProgramsMatch = normalized.match(/\/Users\/[^/]+\/AppData\/Local\/Programs\/([^/]+)/i);
  if (localProgramsMatch?.[1]) {
    const slug = slugifyPublisherForIdentity(localProgramsMatch[1]);
    if (looksLikePublisherSegment(slug)) return slug;
  }

  const localMatch = normalized.match(/\/Users\/[^/]+\/AppData\/Local\/([^/]+)/i);
  if (localMatch?.[1]) {
    const slug = slugifyPublisherForIdentity(localMatch[1]);
    if (looksLikePublisherSegment(slug)) return slug;
  }

  return "unknown";
}

export function derivePublisherSlugFromProcessRow(processRow = {}) {
  const signer = toText(processRow.signer ?? processRow.signaturePublisher ?? "");
  if (signer) return slugifyPublisherForIdentity(signer);

  const publisher = toText(processRow.publisher ?? processRow.publisherName ?? "");
  if (publisher) return slugifyPublisherForIdentity(publisher);

  return derivePublisherSlugFromPath(
    processRow.path ?? processRow.filePath ?? processRow.executablePath ?? ""
  );
}

export function computeSha256PrefixForPath(filePath, fallbackSeed = "") {
  const candidate = toText(filePath);
  if (candidate) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return {
          sha256_prefix: sha256File(candidate).slice(0, 12),
          hash_type: "real",
        };
      }
    } catch {
      // Fall through to a derived fingerprint when the binary cannot be read.
    }
  }
  return {
    sha256_prefix: sha256Text(fallbackSeed).slice(0, 12),
    hash_type: "derived",
  };
}

export function sanitizePath(value) {
  const normalized = normalizeSlashes(toText(value));
  if (!normalized) return "";
  return normalized
    .replace(/^([a-z]:\/Users\/)([^/]+)(?=\/|$)/i, "$1<redacted>")
    .replace(/^([a-z]:\/Documents and Settings\/)([^/]+)(?=\/|$)/i, "$1<redacted>");
}

export function buildProcessKnowledgeFileName(identity = {}) {
  const imageName = normalizeImageName(identity.image_name ?? identity.name ?? "");
  const publisherSlug = truncatePublisherSlugForFilename(
    imageName,
    slugifyPublisherForIdentity(identity.publisher_slug ?? identity.publisher ?? "")
  );
  const prefixSource = identity.sha256_prefix ?? identity.last_sha256_prefix ?? identity.lastSha256Prefix ?? "";
  const prefix = toSlug(prefixSource).slice(0, 12) || "unknown";
  let fileName = `${imageName}--${publisherSlug}--sha256_${prefix}.md`;
  if (fileName.length > 200) {
    const shorterImage = imageName.slice(0, Math.max(8, imageName.length - (fileName.length - 200)));
    fileName = `${shorterImage}--${publisherSlug}--sha256_${prefix}.md`;
  }
  return fileName;
}

export function getProcessKnowledgeMarkdownPath(identity = {}) {
  return path.join(processKnowledgeRoot, buildProcessKnowledgeFileName(identity));
}

export function buildProcessKnowledgeIdentity(processRow = {}) {
  const rawPath = toText(processRow.path ?? processRow.filePath ?? processRow.executablePath ?? "");
  const rawName = toText(processRow.name ?? processRow.imageName ?? processRow.processName ?? "");
  const image_name = normalizeImageName(rawName || rawPath);
  const publisher_slug = derivePublisherSlugFromProcessRow(processRow);
  const { sha256_prefix, hash_type } = computeSha256PrefixForPath(
    rawPath,
    `${image_name}|${publisher_slug}`
  );
  const identity_key = `${image_name}--${publisher_slug}--sha256_${sha256_prefix}`;
  return {
    identity_key,
    image_name,
    publisher_slug,
    sha256_prefix,
    hash_type,
    file_name: buildProcessKnowledgeFileName({ image_name, publisher_slug, sha256_prefix }),
    last_path: sanitizePath(rawPath) || null,
    last_signer: normalizeOptionalText(processRow.signer ?? processRow.signaturePublisher ?? processRow.publisher ?? null),
    last_version: normalizeOptionalText(processRow.version ?? processRow.fileVersion ?? processRow.file_version ?? null),
    product_name: normalizeOptionalText(processRow.productName ?? processRow.product_name ?? null),
    publisher: normalizeOptionalText(processRow.signer ?? processRow.signaturePublisher ?? processRow.publisher ?? null),
    display_name: normalizeOptionalText(processRow.displayName ?? processRow.productName ?? processRow.name ?? null),
  };
}

export const extractIdentityFields = buildProcessKnowledgeIdentity;

function comparableText(value) {
  return toText(value).toLowerCase();
}

export function fingerprintChangeReasons(previousEntry = {}, observed = {}, now = new Date()) {
  const reasons = [];
  const nextSigner = comparableText(observed.last_signer ?? previousEntry.last_signer);
  if (comparableText(previousEntry.last_signer) !== nextSigner) reasons.push("last_signer");

  const nextVersion = normalizeVersionMajorMinor(observed.last_version ?? previousEntry.last_version);
  if (normalizeVersionMajorMinor(previousEntry.last_version) !== nextVersion) {
    reasons.push("last_version");
  }

  const nextHash = comparableText(observed.last_sha256_prefix ?? previousEntry.last_sha256_prefix);
  if (comparableText(previousEntry.last_sha256_prefix) !== nextHash) {
    reasons.push("last_sha256_prefix");
  }

  const previousPath = comparableText(previousEntry.last_path);
  const nextPath = comparableText(observed.last_path ?? previousEntry.last_path);
  if (previousPath !== nextPath) {
    reasons.push("last_path");
  }

  const previousSigning = comparableText(previousEntry.signing_status);
  const nextSigning = comparableText(observed.signing_status ?? previousEntry.signing_status);
  if (previousSigning !== nextSigning) {
    reasons.push("signing_status");
  }

  if (isOlderThanDays(previousEntry.last_enriched, 30, now)) {
    reasons.push("last_enriched");
  }

  return reasons;
}

export function fingerprintHasChanged(previousEntry = {}, observed = {}, now = new Date()) {
  return fingerprintChangeReasons(previousEntry, observed, now).length > 0;
}

export function normalizeVersionText(value) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  return normalizeVersionMajorMinor(text) || text.toLowerCase();
}

export { normalizeVersionMajorMinor, normalizeVersionMajorMinor as majorMinorVersion };
