# Windows Task Manager Backend Notes

This backend does not rely on the Windows Task Manager UI as its primary engine.
It uses built-in Windows interfaces directly so an AI can inspect and act without UI automation.

## Interfaces used

- PowerShell `Get-Process`, `Get-CimInstance`, `Get-Service`, `Get-ScheduledTask`, `Get-NetIPConfiguration`, and `Get-Counter`.
- Command-line tools: `tasklist`, `taskkill`, `sc.exe`, `schtasks`, and `netstat`.
- File-system inspection for startup folders, temp locations, and stale log candidates.
- Policy guards for protected processes and services.

## Fallbacks

- The pack prefers PowerShell and built-in Windows commands.
- `wmic` is intentionally avoided unless a future tool needs a legacy fallback.
- No Task Manager UI automation is used as the main execution path.

## Limitations

- Some command-line and executable-path data can be unavailable without sufficient privileges.
- CPU per-process values are heuristic snapshots, not a live kernel counter feed.
- Startup and scheduled task details vary by Windows build and policy.
- Network and service data may differ slightly depending on local permissions.

## Tool coverage

- cleanup: 6 tools
- network: 5 tools
- policy: 4 tools
- process: 17 tools
- services: 9 tools
- startup: 6 tools
- system: 8 tools
