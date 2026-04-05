import { normalizeSlashes, sha256Text } from "./brain-build-utils.mjs";

const STATUS_SET = new Set([
  "pending",
  "enriching",
  "resolved_high_confidence",
  "resolved_medium_confidence",
  "low_confidence",
  "unresolved",
  "conflicted",
  "failed",
  "ignored",
]);

const HIGH_TRUST_DOMAINS = [
  /(^|\.)microsoft\.com$/i,
  /(^|\.)learn\.microsoft\.com$/i,
  /(^|\.)support\.microsoft\.com$/i,
  /(^|\.)docs\.python\.org$/i,
  /(^|\.)nodejs\.org$/i,
  /(^|\.)oracle\.com$/i,
  /(^|\.)openjdk\.org$/i,
  /(^|\.)mozilla\.org$/i,
  /(^|\.)google\.com$/i,
  /(^|\.)chromium\.org$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)github\.io$/i,
  // Major software vendors commonly found in Windows process lists
  /(^|\.)adobe\.com$/i,
  /(^|\.)apple\.com$/i,
  /(^|\.)nvidia\.com$/i,
  /(^|\.)amd\.com$/i,
  /(^|\.)intel\.com$/i,
  /(^|\.)qualcomm\.com$/i,
  /(^|\.)vmware\.com$/i,
  /(^|\.)broadcom\.com$/i,
];

const MEDIUM_TRUST_DOMAINS = [
  /(^|\.)mitre\.org$/i,
  /(^|\.)nist\.gov$/i,
  /(^|\.)redhat\.com$/i,
  /(^|\.)ubuntu\.com$/i,
  /(^|\.)kaspersky\.com$/i,
  /(^|\.)trendmicro\.com$/i,
  /(^|\.)crowdstrike\.com$/i,
  /(^|\.)bleepingcomputer\.com$/i,
];

const LOW_TRUST_HINTS = [
  /what-is-this-exe/i,
  /is-it-safe/i,
  /remove( this)? virus/i,
  /fix(ing)? windows errors/i,
  /dll[-_ ]files?/i,
  /file[-_ ]net/i,
  /process[-_ ]library/i,
  /howto/i,
  /forum/i,
  /reddit\.com/i,
  /quora\.com/i,
  /answers\./i,
];

function toText(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toLower(value) {
  return toText(value).toLowerCase();
}

function compactPath(value) {
  const normalized = normalizeSlashes(toText(value));
  return normalized ? normalized.toLowerCase() : "";
}

function hostFromUrl(url) {
  const text = toText(url);
  if (!text) return "";
  try {
    return new URL(text).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function rankDomain(host, patterns) {
  return patterns.some((re) => re.test(host));
}

function isLowTrustSource(host, title, url) {
  const haystack = `${toText(host)} ${toText(title)} ${toText(url)}`;
  return LOW_TRUST_HINTS.some((re) => re.test(haystack));
}

export function normalizeEvidenceFieldFlags(evidence = {}) {
  return {
    executable_path: Boolean(toText(evidence.executable_path)),
    signing_status: Boolean(toText(evidence.signing_status)),
    product_or_company: Boolean(toText(evidence.product_name) || toText(evidence.company_name)),
    file_version: Boolean(toText(evidence.file_version)),
    signer_name: Boolean(toText(evidence.signer_name)),
    sha256: Boolean(toText(evidence.sha256)),
  };
}

export function evaluateEvidenceThreshold(evidence = {}) {
  const flags = normalizeEvidenceFieldFlags(evidence);
  const missingRequired = [];
  if (!flags.executable_path) missingRequired.push("executable_path");
  if (!flags.signing_status) missingRequired.push("signing_status");
  if (!flags.product_or_company) missingRequired.push("product_or_company");
  if (!flags.file_version) missingRequired.push("file_version");

  const optionalMissing = [];
  if (!flags.signer_name) optionalMissing.push("signer_name");
  if (!flags.sha256) optionalMissing.push("sha256");

  return {
    flags,
    meetsMinimum: missingRequired.length === 0,
    missingRequired,
    optionalMissing,
  };
}

export function normalizeIdentityFromEvidence(evidence = {}) {
  const sha256 = toLower(evidence.sha256);
  const signer = toLower(evidence.signer_name || evidence.company_name || evidence.publisher);
  const productName = toLower(evidence.product_name);
  const originalFilename = toLower(evidence.original_filename || evidence.image_name);
  const fileVersion = toLower(evidence.file_version || evidence.last_version);
  const executablePath = compactPath(evidence.executable_path || evidence.last_path);

  let strength = "fallback";
  let key = "";
  if (sha256) {
    strength = "sha256";
    key = `sha256:${sha256}`;
  } else {
    const parts = [signer, productName, originalFilename, fileVersion, executablePath].filter(Boolean);
    if (parts.length >= 3) {
      strength = "composite";
      key = `composite:${sha256Text(parts.join("|"))}`;
    }
  }

  if (!key) {
    const fallback = [toLower(evidence.image_name), executablePath].filter(Boolean).join("|") || "unknown";
    key = `fallback:${sha256Text(fallback)}`;
  }

  return { key, strength };
}

function parseRuntimeScriptPath(commandLine = "") {
  const tokens = toText(commandLine).match(/(?:[^"]\S*|".+?")+/g) || [];
  if (!tokens.length) return null;
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i].replace(/^"|"$/g, "");
    if (!token || token.startsWith("-")) continue;
    if (/\.(py|pyw|js|mjs|cjs|ts|tsx|jar|ps1|cmd|bat)$/i.test(token)) {
      return token;
    }
  }
  return null;
}

export function classifySpecialProcess(evidence = {}, processContext = {}) {
  const imageName = toLower(evidence.image_name || processContext.image_name);
  const commandLine = toText(evidence.command_line || processContext.command_line);
  const parentName = toLower(processContext.parent_image_name);
  const pathValue = compactPath(evidence.executable_path || processContext.executable_path);

  if (!imageName) {
    return { className: "standard", notes: [] };
  }

  if (imageName === "svchost.exe" || imageName === "svchost") {
    const services = asArray(evidence.hosted_services).map((service) => toText(service)).filter(Boolean);
    return {
      className: "service_host",
      notes: services.length
        ? [`Hosted services: ${services.join(", ")}`]
        : ["Service host detected; hosted services were not resolved yet."],
    };
  }

  if (["rundll32.exe", "rundll32", "dllhost.exe", "dllhost", "conhost.exe", "conhost", "taskhostw.exe", "taskhostw"].includes(imageName)) {
    return {
      className: "windows_host_process",
      notes: [
        `Windows host/container process detected (${imageName}).`,
        commandLine ? `Command line context: ${commandLine}` : "Command line context unavailable.",
      ],
    };
  }

  if (["chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe"].includes(imageName)) {
    const browserFlag = /(type=|--type=)(gpu-process|renderer|crashpad-handler|utility|zygote|extension)/i.exec(commandLine);
    return {
      className: "browser_subprocess",
      notes: [
        browserFlag ? `Browser subprocess role: ${browserFlag[2]}.` : "Browser process detected.",
        parentName ? `Parent: ${parentName}` : "Parent context unavailable.",
      ],
    };
  }

  if (["python.exe", "pythonw.exe", "node.exe", "java.exe", "javaw.exe"].includes(imageName)) {
    const scriptPath = parseRuntimeScriptPath(commandLine);
    return {
      className: "runtime_host",
      notes: [
        scriptPath ? `Runtime target: ${scriptPath}` : "Runtime target could not be parsed from command line.",
        parentName ? `Parent: ${parentName}` : "Parent context unavailable.",
      ],
    };
  }

  if (/(helper|updater|update|crashpad)/i.test(imageName) || /(helper|updater|update|crashpad)/i.test(pathValue)) {
    return {
      className: "helper_or_updater",
      notes: [parentName ? `Likely helper process for parent ${parentName}.` : "Likely helper/updater subprocess."],
    };
  }

  return { className: "standard", notes: [] };
}

export function scoreSourceConfidence(sources = []) {
  const normalized = asArray(sources).map((source) => {
    const url = toText(source?.url);
    const title = toText(source?.title);
    const host = hostFromUrl(url);
    let trust = "low";
    if (host && rankDomain(host, HIGH_TRUST_DOMAINS)) {
      trust = "high";
    } else if (host && rankDomain(host, MEDIUM_TRUST_DOMAINS)) {
      trust = "medium";
    } else if (isLowTrustSource(host, title, url)) {
      trust = "low";
    }

    return {
      title,
      url,
      host,
      trust,
      score: trust === "high" ? 100 : trust === "medium" ? 65 : 25,
    };
  });

  const high = normalized.filter((entry) => entry.trust === "high").length;
  const medium = normalized.filter((entry) => entry.trust === "medium").length;
  const low = normalized.filter((entry) => entry.trust === "low").length;
  const total = normalized.length;
  const average = total
    ? Math.round(normalized.reduce((acc, entry) => acc + entry.score, 0) / total)
    : 0;

  let level = "none";
  if (high > 0) level = "high";
  else if (medium > 0) level = "medium";
  else if (low > 0) level = "low";

  return {
    total,
    high,
    medium,
    low,
    average,
    level,
    sources: normalized,
  };
}

export function buildEvidenceQuery(evidence = {}) {
  const parts = [
    toText(evidence.sha256),
    toText(evidence.signer_name),
    toText(evidence.product_name),
    toText(evidence.original_filename || evidence.image_name),
    toText(evidence.file_version),
    toText(asArray(evidence.hosted_services).join(" ")),
  ].filter(Boolean);

  const unique = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
  }

  return unique.join(" ").replace(/\s+/g, " ").trim().slice(0, 320);
}

export function detectConflictingFindings({ evidence = {}, sourceScore = {} } = {}) {
  const conflicts = [];
  const product = toLower(evidence.product_name);
  const sourceProductMentions = asArray(sourceScore.sources)
    .map((source) => toLower(source.title))
    .filter(Boolean);

  if (product && sourceProductMentions.length > 1) {
    const mismatches = sourceProductMentions.filter((title) => !title.includes(product));
    if (mismatches.length > 0 && sourceProductMentions.length - mismatches.length > 0) {
      conflicts.push("source_titles_disagree_with_local_product");
    }
  }

  return conflicts;
}

export function decidePipelineVerdict({
  evidence = {},
  sourceScore = scoreSourceConfidence([]),
  conflicts = [],
  specialClassification = { className: "standard", notes: [] },
} = {}) {
  const threshold = evaluateEvidenceThreshold(evidence);
  const identity = normalizeIdentityFromEvidence(evidence);

  let identityConfidence = 25;
  if (identity.strength === "sha256") identityConfidence = 96;
  else if (identity.strength === "composite") identityConfidence = 78;

  if (!threshold.meetsMinimum) {
    return {
      status: "pending",
      unresolvedReason: `missing_required_evidence:${threshold.missingRequired.join(",")}`,
      identityConfidence,
      summaryConfidence: 0,
      sourceConfidence: sourceScore.average || 0,
      identity,
      threshold,
      conflicts,
      specialClassification,
    };
  }

  if (conflicts.length) {
    return {
      status: "conflicted",
      unresolvedReason: conflicts.join(","),
      identityConfidence,
      summaryConfidence: 25,
      sourceConfidence: sourceScore.average || 0,
      identity,
      threshold,
      conflicts,
      specialClassification,
    };
  }

  if (sourceScore.total > 0 && sourceScore.high === 0 && sourceScore.medium === 0) {
    return {
      status: "low_confidence",
      unresolvedReason: "weak_source_only",
      identityConfidence,
      summaryConfidence: 35,
      sourceConfidence: sourceScore.average || 0,
      identity,
      threshold,
      conflicts,
      specialClassification,
    };
  }

  const summaryConfidence = Math.max(
    0,
    Math.min(100, Math.round(identityConfidence * 0.6 + (sourceScore.average || 0) * 0.4))
  );

  const status = summaryConfidence >= 80 ? "resolved_high_confidence" : "resolved_medium_confidence";

  return {
    status,
    unresolvedReason: null,
    identityConfidence,
    summaryConfidence,
    sourceConfidence: sourceScore.average || 0,
    identity,
    threshold,
    conflicts,
    specialClassification,
  };
}

export function shouldPersistFinalKnowledge(verdict) {
  return verdict?.status === "resolved_high_confidence" || verdict?.status === "resolved_medium_confidence";
}

export function normalizeRegistryStatus(status) {
  const value = toLower(status || "pending");
  if (STATUS_SET.has(value)) return value;
  if (value === "known") return "resolved_medium_confidence";
  if (value === "suspicious") return "low_confidence";
  if (value === "queued" || value === "unknown") return "pending";
  return "pending";
}

export function evaluateRepairNeed(entry = {}) {
  const status = normalizeRegistryStatus(entry.status);
  const evidence = {
    executable_path: entry.last_path,
    signing_status: entry.signing_status,
    product_name: entry.product_name,
    company_name: entry.company_name || entry.publisher,
    file_version: entry.file_version || entry.last_version,
    signer_name: entry.signer_name || entry.last_signer,
    sha256: entry.sha256 || entry.last_sha256,
  };

  const threshold = evaluateEvidenceThreshold(evidence);
  const weakSourcesOnly = Number(entry.source_confidence || 0) > 0 && Number(entry.source_confidence || 0) < 45;

  const reasons = [];
  if (!threshold.meetsMinimum) reasons.push("missing_required_evidence");
  if (weakSourcesOnly) reasons.push("weak_source_only");
  if (status === "resolved_medium_confidence" && Number(entry.identity_confidence || 0) < 60) reasons.push("identity_confidence_low");

  return {
    needsRepair: reasons.length > 0,
    reasons,
  };
}
