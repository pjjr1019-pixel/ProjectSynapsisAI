# PERF_CHANGELOG.md

## 2026-04-04

- Mapped startup and runtime critical path (see PERFORMANCE_AUDIT.md)
- Identified process pre-scan and API/UI server startup as main bottlenecks
- Confirmed snapshot/overview caching (4s TTL) is present
- Planned to defer background warmup until after UI is visible
- No code changes yet; baseline established
- Next: implement deferred background warmup and validate with regression tests
