# Changelog

## 2026-04-08

### Added
- AwarenessEngine foundation for startup baselines, session tracking, digests, and event journaling.
- Machine awareness for Windows identity, hardware, processes, services, startup items, installed apps, settings maps, control panel maps, and registry zone maps.
- File, folder, media, and recent-change awareness with scoped roots, exclusions, and compact summaries.
- Safe on-screen Assist Mode with explicit observation controls, foreground-window awareness, UI tree capture, and protected-input blocking.
- Retrieval-first diagnostics and awareness query routing with compact evidence bundles and freshness metadata.

### Improved
- Chat workspace density, scroll behavior, and auto-follow behavior.
- Live local hardware answers for CPU, RAM, GPU, disk, uptime, and top-process hotspot questions.
- Direct hotspot answers for resource questions such as "what's using all my RAM?" with ranked process and program views.
- Typo-tolerant awareness routing so misspelled queries can still resolve correctly.
- Compact deterministic formatting for awareness answers when strong local evidence exists.

### Tests
- Added and expanded behavior-focused tests for awareness routing, file/machine/screen awareness, diagnostics, live usage answers, and hotspot ranking.
- Verified the current build and test suite remain green.

## Phase History

### Phase 5 - Retrieval-First Reasoning, Diagnostics, and Chat Integration
- Added the awareness intent router for repo, file, machine, settings, registry, hardware, performance, and on-screen queries.
- Built compact evidence bundles with freshness metadata, confidence notes, and targeted narrow scans.
- Integrated awareness retrieval into chat so answers stay grounded and budget-aware.
- Added diagnostics summaries for performance, startup, storage, and current UI state.

### Phase 4 - Safe On-Screen Awareness and Assist Mode
- Added explicit Assist Mode with visible state and user-controlled capture scope.
- Captured foreground window snapshots and safe UI semantic trees.
- Added protected-input blocking and a journal for visible on-screen events.
- Kept screen awareness explicit, local, and non-covert.

### Phase 3 - File, Folder, Media, and Machine Change Awareness
- Added metadata-first file catalogs, scoped roots, exclusions, and freshness tracking.
- Built folder intelligence for size, growth, hot-folder, and recent-change summaries.
- Added media metadata for photos, videos, audio, and documents.
- Added targeted content retrieval without broad disk ingestion.

### Phase 2 - Windows Machine Inventory, Process/Service Graphs, and OS Surface Maps
- Added system identity, hardware, process, service, startup, and installed app snapshots.
- Added settings, control panel, and registry zone maps for Windows surfaces.
- Added read-only machine inventory APIs and compact summaries.
- Added freshness-aware machine state capture for live awareness answers.

### Phase 1 - AwarenessEngine Foundation, Safety Model, and Canonical Data Contracts
- Defined the AwarenessEngine module skeleton and canonical data contracts.
- Added baseline startup snapshots, session artifacts, digest storage, and journal scaffolding.
- Established privacy scopes, permission tiers, and evidence references.
- Added the initial compact awareness context integration and safety boundaries.
