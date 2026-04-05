import { resolveLicensePolicy, scanForPii } from "./brain-compliance.mjs";

export function buildExternalProvenance(input = {}) {
  const licensePolicy = resolveLicensePolicy(input.license);
  const pii = input.piiText ? scanForPii(input.piiText) : { status: "clean", matches: [] };
  return {
    sourceType: "import",
    importLayer: String(input.importLayer || "live").trim(),
    sourceUrl: String(input.sourceUrl || "").trim(),
    sourceDomain: String(input.sourceDomain || "").trim(),
    fetchedAt: String(input.fetchedAt || new Date().toISOString()).trim(),
    contentHash: String(input.contentHash || "").trim(),
    hash: String(input.hash || input.contentHash || "").trim(),
    license: licensePolicy.license,
    licenseRisk: String(input.licenseRisk || licensePolicy.risk).trim(),
    retrievalSafe:
      input.retrievalSafe === undefined ? licensePolicy.retrievalSafe : input.retrievalSafe === true,
    trainingSafe:
      input.trainingSafe === undefined ? licensePolicy.trainingSafe : input.trainingSafe === true,
    piiScan: String(input.piiScan || pii.status || "clean").trim(),
    freshness: input.freshness ?? String(input.fetchedAt || "").trim(),
    ttlHours: Number(input.ttlHours || 0) || undefined,
    tool: String(input.tool || "horizons-ingestion").trim(),
    script: String(input.script || "").trim(),
    version: String(input.version || "1.0.0").trim(),
  };
}
