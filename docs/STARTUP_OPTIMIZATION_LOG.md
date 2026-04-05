# STARTUP_OPTIMIZATION_LOG.md

## What Runs at App Launch
- Electron app setup (desktop/main.cjs)
- Tray and splash window creation
- Runtime host (runtime-host.cjs) initialization
- Pre-scan of processes (PowerShell)
- API server (dev-api.mjs) and UI server (Vite) startup
- Preload of Task Manager UI
- Window manager initialization

## What Can Be Lazy-Loaded
- Proactive notifications (imported after UI is ready)
- Quick chat window (created on demand)
- Background warmup (waitForBackgroundReady)

## What Can Be Cached
- Process snapshot (4s TTL, already implemented)
- Overview computation (4s TTL, already implemented)

## What Can Be Deferred Until First Use
- Background warmup (can be started after UI is visible)
- Proactive notifications (already deferred)

## What Can Be Background-Initialized Safely
- waitForBackgroundReady (already runs in background)
- Additional noncritical modules (future: e.g., analytics, telemetry)

## Next Steps
- Defer background warmup until after UI is visible
- Confirm no duplicate port probes or watcher registration
- Consider batching PowerShell queries if possible
