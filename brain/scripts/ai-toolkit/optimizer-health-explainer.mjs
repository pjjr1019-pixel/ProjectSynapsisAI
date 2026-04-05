/**
 * Optimizer Health Explainer
 *
 * Deterministic, template-driven summary of current optimizer health.
 */

function chooseSeverity(telemetry, hotspots, anomalies) {
  if ((hotspots || []).some((hotspot) => hotspot?.severity === "critical")) return "critical";
  if ((anomalies || []).some((anomaly) => anomaly?.severity === "critical")) return "critical";
  if (telemetry?.pressure?.overall === "critical") return "critical";
  if ((hotspots || []).length > 0) return "warn";
  if (["high", "moderate"].includes(telemetry?.pressure?.overall)) return "warn";
  return "ok";
}

function headlineForSeverity(severity, hotspotCount) {
  if (severity === "critical") {
    return hotspotCount > 0
      ? `Critical resource pressure across ${hotspotCount} hotspot${hotspotCount === 1 ? "" : "s"}`
      : "Critical optimizer pressure detected";
  }
  if (severity === "warn") {
    return hotspotCount > 0
      ? `Resource hotspots detected in ${hotspotCount} module${hotspotCount === 1 ? "" : "s"}`
      : "Optimizer health needs attention";
  }
  return "Optimizer health is stable";
}

function buildHotspotBullet(hotspot) {
  return `${hotspot.name}: ${Math.round(hotspot.pct)}% ${hotspot.resourceLabel} (${hotspot.severity})`;
}

export function explainOptimizerHealth(telemetry = {}, hotspots = [], anomalies = []) {
  const hotspotList = Array.isArray(hotspots) ? hotspots : [];
  const anomalyList = Array.isArray(anomalies) ? anomalies : [];
  const severity = chooseSeverity(telemetry, hotspotList, anomalyList);
  const headline = headlineForSeverity(severity, hotspotList.length);
  const bullets = [];

  if (telemetry?.pressure?.overall) {
    bullets.push(`Overall pressure is ${telemetry.pressure.overall}.`);
  }

  if (hotspotList.length > 0) {
    bullets.push(`Top hotspot: ${buildHotspotBullet(hotspotList[0])}.`);
    if (hotspotList.length > 1) {
      bullets.push(`Additional hotspots: ${hotspotList.slice(1, 3).map(buildHotspotBullet).join("; ")}.`);
    }
  } else {
    bullets.push("No resource hotspots exceeded the configured thresholds.");
  }

  if (anomalyList.length > 0) {
    bullets.push(`Anomalies observed: ${anomalyList.map((anomaly) => String(anomaly.summary ?? anomaly.name ?? "anomaly")).join("; ")}.`);
  }

  if (severity === "critical") {
    bullets.push("Pause non-essential activity and inspect the hottest module first.");
  } else if (severity === "warn") {
    bullets.push("Review the hotspot summary before starting another optimizer tick.");
  } else {
    bullets.push("No immediate intervention is required.");
  }

  return {
    headline,
    bullets,
    severity,
    details: {
      hotspotCount: hotspotList.length,
      anomalyCount: anomalyList.length,
      topHotspot: hotspotList[0] ?? null,
      pressure: telemetry?.pressure ?? null,
      checkedAt: telemetry?.capturedAt ?? new Date().toISOString(),
    },
  };
}