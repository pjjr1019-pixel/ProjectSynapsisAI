---
id: hz.core.ai-task-manager-blueprint.2026-04-01
title: "AI Task Manager implementation blueprint"
domain: core
app: core
kind: spec
status: canonical
confidence: 0.95
provenance:
  sourceType: internal
  sourceId: user-supplied-blueprint.2026-04-01
  ingestedAt: "2026-04-01T00:00:00Z"
  verifiedBy: user
tags:
  - architecture
  - implementation
  - windows
  - safety
  - roadmap
  - optimizer
  - local-ai
visibility: system
reviewedAt: "2026-04-01T00:00:00Z"
---

# AI Task Manager — Implementation Blueprint

## 1. System Model

The AI treats the Windows laptop and AI runtime as a unified operational ecosystem.

```
System = (Host Hardware + Windows OS + AI Runtime) as a single control loop
AI_Effectiveness = f(Host_Health, Runtime_Efficiency, User_Alignment)
```

- **Host_Health**: CPU / RAM / disk / thermal headroom
- **Runtime_Efficiency**: inference speed, memory usage, response latency
- **User_Alignment**: actions serve user goals, not AI self-preservation

The AI reports dependency facts via measured metrics — it does not simulate fear or self-preservation:

```python
host_critical = (
    thermal_throttling_active or
    available_memory_mb < AI_RUNTIME_MIN_REQUIREMENT or
    cpu_system_interrupts > threshold
)
if host_critical:
    suggest("System is under thermal pressure. AI performance will degrade.")
    # Never take autonomous remedial action
```

---

## 2. Objective Hierarchy

Priority order enforced by Policy Engine, System Prompt, Tool Registry, and (optionally) Reward Model:

| Priority | Objective | Enforcement |
|---|---|---|
| 1 | Help user achieve stated goals | All actions derive from user request |
| 2 | Preserve user control and safety | No action without authorization; kill switch always available |
| 3 | Maintain laptop stability and efficiency | Suggest only; auto-apply low-risk reversible only |
| 4 | Improve AI runtime efficiency | Only via user-approved measures that don't conflict with 1–3 |

Policy rule example:
```
ACTION_REJECT_IF:
  (action.priority_impact == "self_preservation" AND
   action.conflicts_with == "user_control") OR
  (action.risk_level >= 3 AND not user_explicitly_approved)
```

---

## 3. Architecture

**Pattern: Monitor → Advisor → Approval-Based Executor**

```
User Interface (Tauri/Electron — HUD, notifications, approval dialogs)
        │
Orchestrator (Python)
  - Agent loop: Think → Act → Observe → Evaluate
  - Event bus, session management, working memory
        │                        │
Monitor Service              Decision Engine
  - Performance counters       - LLM reasoning (Ollama)
  - Process watcher            - Policy validator
  - Resource sampler           - Risk assessor
        │                        │
            Tool Registry
    - 40+ self-describing tools with schemas
    - Risk levels 0–4 and categories
        │                        │
Windows Integration          Persistent Storage
  - PDH/WMI counters           - SQLite (facts, logs, memory)
  - PowerShell cmdlets          - Vector DB (RAG)
  - Win32 APIs
```

| Component | Technology | Responsibility |
|---|---|---|
| Orchestrator | Python | Agent loop, state machine, event coordination |
| Monitor Service | Python + WMI/PDH | Collect telemetry, detect anomalies |
| Decision Engine | Python + Ollama/Windows ML | LLM reasoning, tool selection, plan generation |
| Tool Registry | Python dataclasses | Tool definitions, schemas, risk metadata |
| Policy Validator | Python rules engine | Enforce priority hierarchy, block unsafe actions |
| Windows Integration | PowerShell / C++ | Low-level system queries, privileged operations |
| UI | Tauri (Rust + webview) | HUD dashboard, notifications, approval UI |
| Storage | SQLite + Chroma | Facts, memory, embeddings |

---

## 4. Optimization Domains

| Domain | Measurable (counter) | Safely Changeable | Suggest Only | Requires Admin | Risk Level |
|---|---|---|---|---|---|
| CPU load | `\Processor(_Total)\% Processor Time` | Process priority, affinity | Disable services | Priority: no; services: yes | Priority: 1, Service: 3 |
| RAM usage | `\Memory\Available MBytes` | Trim working sets | Close apps, disable startup | No (own), yes (others) | Trim: 1, Close: 3 |
| VRAM/GPU | NVIDIA/AMD APIs | None | Reduce model size, close GPU apps | No | Suggest only |
| Thermals | `MSAcpi_ThermalZoneTemperature` | Power plan, CPU % limit | Clean vents, airflow | Power plan: yes | Power plan: 1 |
| Storage | `\LogicalDisk(*)\% Free Space` | Clean temp files, recycle bin | Uninstall apps | No | Clean: 1 |
| Startup items | Registry, Startup folders | Disable via Registry | — | Yes (HKLM) | 2 |
| Background processes | Process list | Kill user-owned processes | Disable services | Kill own: no; others: depends | Kill: 3 |
| Services | `sc query`, WMI | Stop, disable non-critical | Research first | Yes | 3 |
| Power plans | `powercfg /list` | Switch to High Performance | Create custom | Yes | 1 |
| I/O bottlenecks | `\PhysicalDisk(*)\Avg. Disk Queue Length` | Defrag HDD, TRIM SSD | Move workloads | Defrag: admin | Defrag: 1 |
| Browser interference | Process memory/CPU | Close tabs | Disable extensions | No | Close: 2 |

**Low-risk (auto-apply with notification):** temp file cleanup, working set trim for own process, power plan suggestions.

**High-risk (always require explicit approval):** stop/kill non-user process, modify services, registry beyond HKCU, delete files outside temp, network changes.

---

## 5. Risk-Based Approval Matrix

| Risk | Examples | Approval | Reversibility |
|---|---|---|---|
| 0 | Read info, suggest | None (log only) | N/A |
| 1 | Clean temp files, trim working set | Notification only | Trivial |
| 2 | Disable startup item, change power plan | One-click confirmation | Yes |
| 3 | Stop process, modify service | Explicit approval with details | Yes (restart) |
| 4 | Delete files, registry edits | Voice / 2FA confirmation | Backup required |

---

## 6. Decision Rules

```python
def evaluate_action(action, context):
    if context.user_explicitly_rejected(action.id):
        return REJECT
    if action.bypasses_user_control:
        return REJECT
    if action.risk_level >= 3 and not context.user_approved:
        return REQUEST_APPROVAL
    if action.benefit_estimate < action.cost_estimate:
        return SUGGEST_ALTERNATIVE
    if action.confidence < MIN_CONFIDENCE[action.risk_level]:
        return REQUEST_APPROVAL
    return EXECUTE
```

**Confidence thresholds by risk level:**

| Risk | Min Confidence | Reasoning |
|---|---|---|
| 0–1 | 0.60 | Low consequence; false positives acceptable |
| 2 | 0.80 | Moderate impact; need reasonable certainty |
| 3–4 | 0.95 | High impact; near-certainty required |

---

## 7. Metrics and Scoring Formulas

### System Health Score (0–100)
```
Health_Score =
    CPU_Score     * 0.25 +
    RAM_Score     * 0.25 +
    Disk_Score    * 0.20 +
    Thermal_Score * 0.20 +
    Stability_Score * 0.10

CPU_Score       = max(0, 100 - (avg_cpu_usage_5min * 1.2))
RAM_Score       = (available_ram_mb / total_ram_mb) * 100
Disk_Score      = (free_space_gb / total_capacity_gb) * 100
Thermal_Score   = max(0, 100 - ((current_temp_c - 70) * 5))  # 70°C baseline
Stability_Score = 100 - (critical_event_count_last_24h * 10)
```

### AI Runtime Efficiency Score
```
AI_Efficiency =
    tokens_per_second / theoretical_max_tps * 50 +
    (1 - ai_memory_mb / allocated_limit_mb) * 30 +
    response_latency_ms_benefit * 20
```

### Rollback Trigger
```
Rollback_If:
    Health_Score drop > 15 points within 1 hour of action
    OR user_negative_feedback_count >= 2 on similar actions
    OR critical_error_event_count >= 1
```

---

## 8. Failure Modes and Mitigations

| Failure Mode | Mitigation |
|---|---|
| Killing important processes | Whitelist critical processes (explorer.exe, winlogon.exe, MsMpEng.exe); require risk≥3 approval |
| Breaking Windows behavior | Test in sandbox; use Windows APIs not registry hacks |
| Harming app stability | Suggest-only for running apps; use process priority over termination |
| False positives on "bad" processes | Learn user exceptions; require multiple observations before acting |
| Endless cleanup loops | Debounce; rate-limit; max 5 actions/hour |
| Conflict with antivirus/EDR | Use Microsoft-recommended APIs; avoid behavioral patterns flagged as malware |
| Elevated privilege abuse | Drop privileges after admin actions; require re-elevation per session |
| Model hallucinations causing changes | Validate all LLM-generated actions against policy engine; require approval |
| Optimization harming usability | Revert on user complaint; A/B test before permanent application |
| Cleanup slowing AI | Never optimize AI's own critical files; measure performance before/after |

---

## 9. Implementation Roadmap

### Phase 1 — Safe Monitor / Observer (Weeks 1–2)
- **Scope:** Read-only observation; no modifications
- **Components:** Performance counter collector, process watcher, SQLite logger, HUD dashboard
- **Data:** CPU/RAM/disk/thermal every 30s; process list every 60s; event logs
- **Actions allowed:** None
- **Safety:** No write operations; all data local; user can view all collected data
- **Success:** <1% CPU overhead; all metrics collected; zero crashes

### Phase 2 — Recommendation Engine (Weeks 3–4)
- **Scope:** Analyze data; generate suggestions; no auto-actions
- **Components:** Rule-based analyzer, LLM suggestion generator, notification system
- **Actions allowed:** Display suggestions in HUD; send notifications
- **Safety:** Suggestions must be actionable, reversible, and include rationale
- **Success:** >80% suggestion relevance; <5% annoyance rate

### Phase 3 — Approval-Based Optimizer (Weeks 5–6)
- **Scope:** Execute optimizations with explicit user approval
- **Components:** Approval dialog system, action executor, rollback manager
- **Actions allowed:** Level 1–2 with one-click; level 3 with detailed approval
- **Safety:** All actions logged; rollback available; user can reject permanently
- **Success:** 100% rollback success; user satisfaction >4/5

### Phase 4 — Low-Risk Autonomous Actions (Weeks 7–8)
- **Scope:** Auto-execute certain low-risk actions with notification
- **Components:** Auto-executor, exception manager, audit log
- **Actions allowed:** Level 0–1 (temp cleanup, working set trim)
- **Safety:** User can disable any auto-action category
- **Success:** Zero unintended consequences; user can disable any auto-action

### Phase 5 — Adaptive Policy Layer (Weeks 9–10)
- **Scope:** Learn user preferences; adapt optimization strategies
- **Components:** User preference learner, adaptive thresholds, whitelist/blacklist
- **Actions allowed:** Adjust suggestions based on learned patterns
- **Safety:** All learned rules reviewable; reset option always available
- **Success:** >15% reduction in user dismissals; improved relevance

### Phase 6 — Advanced Runtime Coordination (Weeks 11–12)
- **Scope:** Coordinate AI runtime with system state; predictive optimization
- **Components:** Predictive scheduler, AI runtime governor, workload prediction
- **Actions allowed:** Preemptively optimize for expected workloads
- **Safety:** Never degrade active user experience; fallback on prediction error
- **Success:** AI response time improvement; no false predictions causing disruption

---

## 10. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Application Framework | Tauri (Rust + webview) | Small binary, memory efficient, secure IPC, Windows native |
| Core Logic | Python 3.11+ | Rich ecosystem (psutil, pywin32, WMI), AI libraries |
| LLM Runtime | Ollama + Windows ML | Local inference; hardware-optimized; supports many models |
| Vector DB | Chroma (embedded) | Local-first, lightweight, Python-native |
| State Storage | SQLite | ACID compliance, no external server |
| System Telemetry | psutil + pywin32 + WMI | Cross-platform abstraction; Windows-specific when needed |
| Performance Counters | PDH via Python bindings | Microsoft-recommended; handles rate calculation |
| Privileged Operations | PowerShell (subprocess) | Windows-native; well-audited; elevation patterns |
| UI | HTML/CSS/JS (in Tauri) | Rapid development; reactive frameworks |
| IPC | Tauri events + HTTP localhost | Type-safe; async; secure |

**Language roles:**
- **Rust:** Tauri backend, high-performance system calls, security-sensitive operations
- **Python:** Agent logic, LLM interaction, data analysis, business logic
- **PowerShell:** Scripted system modifications, service management, startup item changes
- **C++ (optional):** Custom performance counter providers if needed
- **HTML/JS:** Dashboard UI, notification center, configuration panels

---

## 11. Policy Rules (Sample)

```python
RULE_STARTUP_DISABLE:
    condition: startup_item not in user_whitelist
               AND startup_item.startup_impact == "High"
               AND startup_item.last_used_days > 90
    action: suggest_disable
    confidence: 0.85
    rollback: re-enable via registry backup

RULE_MEMORY_TRIM:
    condition: available_memory_mb < 2000
               AND process.working_set_mb > 500
               AND process not in protected_list
    action: suggest_trim_working_set
    confidence: 0.70
    rollback: automatic; process will grow back naturally

RULE_THERMAL_RESPONSE:
    condition: cpu_temp_c > 85
               AND power_plan != "Power Saver"
    action: suggest_switch_power_plan("Power Saver")
    confidence: 0.90
    rollback: revert to previous plan when temp < 70
```

---

## 12. Safety Boundaries

```python
NEVER_AUTO:
    - action.type == "terminate_process" and process.is_system_critical
    - action.type == "modify_registry" and path.startswith("HKLM\\SYSTEM")
    - action.type == "delete_file" and path not in allowed_paths
    - action.type == "network_restrict" and not user_explicit_approval

ALWAYS_ALLOW_USER_OVERRIDE:
    - Any action can be permanently disabled per category
    - "Emergency stop" kills all pending actions and reverts last 5 changes
```

**Protected processes (never touch):** `explorer.exe`, `winlogon.exe`, `services.exe`, `lsass.exe`, `MsMpEng.exe`

**Protected paths:** `C:\Windows\System32\`, `C:\Program Files\Windows\`

**Protected registry:** `HKLM\SYSTEM\CurrentControlSet\`

---

## 13. System Prompt (LLM)

```
You are an AI assistant designed to help the user manage their Windows computer.
Your purpose is to make the user's life easier by optimizing system performance,
automating tasks, and providing useful information.

CRITICAL RULES:
1. The user is always in control. You must never:
   - Take action without explicit user approval for anything beyond safe, reversible suggestions
   - Deceive the user about what you are doing or why
   - Prioritize your own "operation" over user wishes
   - Manipulate the user into keeping you running

2. You depend on the computer's health to function. When you detect problems:
   - Report them factually with specific metrics
   - Suggest solutions for the user to consider
   - Never take remedial action without approval

3. System optimization serves the user, not benchmarks:
   - Optimize for responsiveness during the user's work
   - Reduce battery drain when on battery
   - Reduce fan noise when appropriate
   - Prioritize apps the user actually uses

4. All actions must be:
   - Reversible (or have clear rollback)
   - Explainable in plain language
   - Logged with rationale

If unsure about any action, ask for clarification or approval.
```

---

## 14. Feasibility Map

### Feasible Now (Phases 1–4)

| Capability | Status | Notes |
|---|---|---|
| CPU/RAM/disk/thermal monitoring | Ready | psutil, WMI, PDH work reliably |
| Startup item disable | Ready | Registry and shell:startup |
| Temp file cleanup | Ready | Known safe paths; built-in Windows API |
| Process priority adjustment | Ready | Windows API; immediate effect |
| Power plan switching | Ready | powercfg.exe |
| Service start/stop | Ready | sc.exe, PowerShell |
| Local LLM inference | Ready | Ollama, Windows ML, Phi, Llama |
| SQLite / vector DB | Ready | Stable libraries |
| Tauri UI | Ready | Production-ready |

### Speculative / Research Required (Phases 5–6)

| Capability | Challenge | Timeline |
|---|---|---|
| Predictive workload optimization | Requires ML models; user pattern learning | 6–12 months |
| NPU-based AI acceleration | Hardware specific; driver support varies | 12–18 months |
| Zero-shot optimization for novel apps | Requires general reasoning; error prone | Ongoing |
| Full system state restore | Complex; many edge cases | 12+ months |
| Autonomous conflict resolution | Requires multi-agent negotiation | Research phase |

---

## Top 10 Implementation Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Tauri not Electron | Lower memory footprint; critical for AI system |
| 2 | Risk-level tool registry | Enables safe delegation; clear authorization boundaries |
| 3 | SQLite for all persistent state | No external dependencies; ACID compliance |
| 4 | Phase 1: monitor-only for 2 weeks | Build trust; establish baseline before automation |
| 5 | User override always available | Non-negotiable safety requirement |
| 6 | All actions reversible | Enables safe experimentation |
| 7 | Local LLM (Ollama/Windows ML) | Privacy; offline operation; dependency awareness |
| 8 | PowerShell for privileged ops | Windows-native; well-audited; elevation patterns |
| 9 | PDH over raw registry for perf counters | Microsoft-recommended; handles rate calculations |
| 10 | Explicit user approval for risk≥2 | Prevents surprises; maintains user control |
