---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/optimizer-hotspot-detector.mjs"
source_name: "optimizer-hotspot-detector.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 108
selected_rank: 469
content_hash: "27e2772d1c66256370b023f48bc19e6259690f9092d757c3d1cb0b1e42d5f475"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "detectHotspots"
  - "hotspotPriority"
  - "summarizeHotspot"
---

# taskmanager/brain/scripts/ai-toolkit/optimizer-hotspot-detector.mjs

> Script surface; exports detectHotspots, hotspotPriority, summarizeHotspot

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/optimizer-hotspot-detector.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: detectHotspots, hotspotPriority, summarizeHotspot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/optimizer-hotspot-detector.mjs

## Excerpt

~~~javascript
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
~~~