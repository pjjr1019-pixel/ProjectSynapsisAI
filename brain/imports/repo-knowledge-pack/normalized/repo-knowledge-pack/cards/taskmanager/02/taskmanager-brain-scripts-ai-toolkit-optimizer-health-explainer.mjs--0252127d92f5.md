---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/optimizer-health-explainer.mjs"
source_name: "optimizer-health-explainer.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 108
selected_rank: 468
content_hash: "bf4f311eb830037a694a0584e294864017d7c0fcc5a1c691fade46738cb21913"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "explainOptimizerHealth"
---

# taskmanager/brain/scripts/ai-toolkit/optimizer-health-explainer.mjs

> Script surface; exports explainOptimizerHealth

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/optimizer-health-explainer.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: explainOptimizerHealth

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/optimizer-health-explainer.mjs

## Excerpt

~~~javascript
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
~~~