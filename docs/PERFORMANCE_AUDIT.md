# PERFORMANCE_AUDIT.md

## Startup Path Mapping

- **Entry:** desktop/main.cjs
- **Critical Path:**
  - Electron app setup (app, BrowserWindow, etc.)
  - Tray, splash, and main window creation
  - Runtime host initialization (runtime-host.cjs)
  - Pre-scan of processes (PowerShell, WMI)
  - API and UI server startup (dev/portable)
  - UI preload and window manager init
- **Secondary Path:**
  - Quick chat window
  - Proactive notifications
  - Background warmup (waitForBackgroundReady)

## Bottlenecks & Hot Paths

- **Process pre-scan:**
  - PowerShell/WMI scan is slow (2-4s typical)
  - Synchronous at startup, but uses stale-while-revalidate cache for UI
- **API/UI server startup:**
  - Waits for port probe and HTTP health
  - Can be slow if ports are busy or server is cold
- **Repeated expensive computations:**
  - buildRuntimeManagerComputerOverview caches for 4s, but can be triggered multiple times
- **File/IO waste:**
  - No major repeated disk scans on critical path
- **Memory churn:**
  - Snapshot/overview objects are large but short-lived
- **Render churn:**
  - Not observed at main process level

## Candidate Optimizations

- [x] Memoize/cap repeated process snapshot/overview calls (already present, 4s TTL)
- [ ] Defer background warmup until after UI is visible
- [ ] Lazy-load noncritical modules (proactive notifications, quick chat)
- [ ] Batch PowerShell process queries if possible
- [ ] Reduce duplicate API/UI port probes
- [ ] Confirm no duplicate watcher/interval registration

## Measured Wins

- [ ] To be filled after first round of optimizations
