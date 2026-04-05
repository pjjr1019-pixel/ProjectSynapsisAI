# Windows Skill Pack Integration Notes

## App Discovery
- Discover pack through scripts/windows/INDEX.json and compact registries.
- Preserve provenance from imports/windows-js-skill-pack/manifests.

## Chat Routing
- Resolve via aliases first, then ranked search.
- If confidence is low, return top 3 candidates for user choice.

## Safe Execution
- Validate parameters before execution.
- Use dry-run when available.
- Require explicit confirmation for risky/admin actions.

## Logging
- Log query, resolved skill id, executor, confidence, and result.

## Coverage Boundary
- This pack covers many Windows Settings, Control Panel items, tools, folders, and launch targets.
- It does not guarantee perfect interaction with every possible Windows UI window.
- Deeper arbitrary UI control should use a future UI Automation layer.

## Next Step
- Add a dedicated UI Automation executor bridge with strict safety policy.
