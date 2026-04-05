/**
 * Optimizer Hotspot Detector
 *
 * Scans registry modules and telemetry hints to find deterministic resource
 * hotspots that should be surfaced to the user before the control loop acts.
 */

const RESOURCE_RULES = Object.freeze({
  cpu: { threshold: 80, label: "CPU" },
  ram: { threshold: 70, label: "RAM" },
  gpu: { threshold: 85, label: "GPU" },
});

function toPercent(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function getModuleMetricPercent(module, resource, telemetry) {
  const hints = module?.resourceHints ?? {};

  if (resource === "cpu") {
    return toPercent(hints.cpuPercent ?? hints.cpuRatio ?? telemetry?.cpu?.percentHint ?? null);
  }

  if (resource === "ram") {
    if (hints.memoryPercent !== undefined || hints.memoryRatio !== undefined) {
      return toPercent(hints.memoryPercent ?? hints.memoryRatio);
    }
    if (hints.memoryMB !== undefined && telemetry?.ram?.totalMB) {
      return (Number(hints.memoryMB) / Number(telemetry.ram.totalMB)) * 100;
    }
    return null;
  }

  if (resource === "gpu") {
    if (hints.gpuPercent !== undefined || hints.gpuRatio !== undefined) {
      return toPercent(hints.gpuPercent ?? hints.gpuRatio);
    }
    if (hints.vramPercent !== undefined || hints.vramRatio !== undefined) {
      return toPercent(hints.vramPercent ?? hints.vramRatio);
    }
    if (hints.vramMB !== undefined && telemetry?.vram?.totalMB) {
      return (Number(hints.vramMB) / Number(telemetry.vram.totalMB)) * 100;
    }
    return null;
  }

  return null;
}

function buildHotspot(module, resource, pct, checkedAt) {
  const rule = RESOURCE_RULES[resource];
  const moduleId = String(module?.id ?? module?.name ?? module?.displayName ?? resource);
  const displayName = String(module?.displayName ?? module?.name ?? moduleId);
  const severity = pct >= 95 ? "critical" : "high";
  const severityScore = Math.max(1, Math.min(100, Math.round(pct)));

  return {
    name: displayName,
    moduleId,
    pid: module?.pid ?? null,
    resource,
    resourceLabel: rule?.label ?? resource,
    pct: Math.round(pct * 10) / 10,
    severity,
    severityScore,
    checkedAt,
    summary: `${displayName} is using ${Math.round(pct)}% ${rule?.label ?? resource}`,
  };
}

export function detectHotspots(telemetry = {}, modules = []) {
  const checkedAt = new Date().toISOString();
  if (!Array.isArray(modules) || modules.length === 0) {
    return { hotspots: [], checkedAt };
  }

  const hotspots = [];
  for (const module of modules) {
    for (const [resource, rule] of Object.entries(RESOURCE_RULES)) {
      const pct = getModuleMetricPercent(module, resource, telemetry);
      if (!Number.isFinite(pct) || pct < rule.threshold) continue;
      hotspots.push(buildHotspot(module, resource, pct, checkedAt));
    }
  }

  hotspots.sort((left, right) => {
    if (right.severityScore !== left.severityScore) {
      return right.severityScore - left.severityScore;
    }
    if (right.pct !== left.pct) {
      return right.pct - left.pct;
    }
    return String(left.moduleId).localeCompare(String(right.moduleId));
  });

  return { hotspots, checkedAt };
}

export function summarizeHotspot(hotspot) {
  if (!hotspot) return "";
  return hotspot.summary || `${hotspot.name} is a ${hotspot.resource} hotspot`;
}

export function hotspotPriority(hotspot) {
  if (!hotspot) return 0;
  const severityBoost = hotspot.severity === "critical" ? 100 : 0;
  return severityBoost + Math.round(Number(hotspot.severityScore) || 0);
}