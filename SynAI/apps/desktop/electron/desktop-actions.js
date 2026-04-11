import { spawn } from "node:child_process";
import { cp, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { createApprovalLedger, createGovernanceCommandBus, hashGovernanceCommand } from "@governance-execution";
import { buildWindowsActionPreview, findWindowsActionDefinitionById, listWindowsActionDefinitions, suggestWindowsActionFromPrompt } from "@governance-execution/execution/windows-action-catalog";
const isWindows = process.platform === "win32";
const normalizePath = (value) => path.normalize(value);
const isWithinRoot = (candidate, root) => {
    const relative = path.relative(root, candidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};
const escapePowerShellSingleQuoted = (value) => value.replace(/'/g, "''");
const spawnDetached = async (command, args, options = {}) => {
    const child = spawn(command, args, {
        cwd: options.cwd ?? undefined,
        detached: true,
        stdio: "ignore",
        windowsHide: true
    });
    child.unref();
    return {
        pid: typeof child.pid === "number" ? child.pid : null
    };
};
const execFileAsync = async (command, args) => {
    return await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            detached: false,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.setEncoding("utf8");
        child.stderr?.setEncoding("utf8");
        child.stdout?.on("data", (chunk) => {
            stdout += String(chunk);
        });
        child.stderr?.on("data", (chunk) => {
            stderr += String(chunk);
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code && code !== 0) {
                reject(new Error(stderr.trim() || `${command} exited with code ${code}.`));
                return;
            }
            resolve({ stdout, stderr });
        });
    });
};
const execPowerShellScript = async (script) => execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
const resolveTargetPath = (target, workspaceRoot, fallbackRoot) => {
    const trimmed = target.trim();
    if (!trimmed) {
        throw new Error("target is required");
    }
    if (path.isAbsolute(trimmed)) {
        return normalizePath(trimmed);
    }
    return normalizePath(path.resolve(workspaceRoot || fallbackRoot, trimmed));
};
const resolveProgramTarget = (target, workspaceRoot) => {
    const trimmed = target.trim();
    if (!trimmed) {
        throw new Error("target is required");
    }
    if (path.isAbsolute(trimmed) || /[\\/]/.test(trimmed)) {
        return resolveTargetPath(trimmed, workspaceRoot, workspaceRoot);
    }
    return trimmed;
};
const normalizeLabel = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const scoreInstalledApp = (app, target) => {
    const normalizedTarget = normalizeLabel(target);
    const candidates = [
        app.name,
        app.publisher,
        app.installLocation,
        app.uninstallCommand,
        app.quietUninstallCommand,
        app.displayIcon,
        ...app.associatedProcessNames
    ]
        .filter((value) => Boolean(value))
        .map((value) => normalizeLabel(value));
    return candidates.reduce((score, candidate) => {
        if (!candidate) {
            return score;
        }
        if (candidate === normalizedTarget) {
            return score + 4;
        }
        if (candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate)) {
            return score + 2;
        }
        return score;
    }, 0);
};
const resolveInstalledApp = (snapshot, target) => {
    if (!snapshot) {
        return null;
    }
    const normalizedTarget = normalizeLabel(target);
    const exactMatches = snapshot.apps.filter((app) => normalizeLabel(app.name) === normalizedTarget);
    if (exactMatches.length === 1) {
        return exactMatches[0];
    }
    if (exactMatches.length > 1) {
        throw new Error(`Multiple installed apps match "${target}". Please use the exact app name.`);
    }
    const scored = snapshot.apps
        .map((app) => ({ app, score: scoreInstalledApp(app, target) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score);
    if (scored.length === 0) {
        return null;
    }
    if (scored.length > 1 && scored[0].score === scored[1].score) {
        throw new Error(`Multiple installed apps match "${target}". Please use the exact app name.`);
    }
    return scored[0].app;
};
const renderPreview = (definition, request) => {
    const target = request.target.trim() || definition.defaultTarget || definition.targetPlaceholder;
    return buildWindowsActionPreview(definition, {
        target,
        destinationTarget: request.destinationTarget ?? null,
        args: request.args
    });
};
const buildRequestMetadata = (request, normalizedTarget, normalizedDestinationTarget) => ({
    ...request.metadata,
    proposalId: request.proposalId,
    kind: request.kind,
    scope: request.scope,
    targetKind: request.targetKind,
    target: normalizedTarget,
    destinationTarget: normalizedDestinationTarget,
    args: request.args ?? [],
    workingDirectory: request.workingDirectory ?? null,
    workspaceRoot: request.workspaceRoot ?? null,
    allowedRoots: request.allowedRoots ?? request.metadata?.allowedRoots ?? []
});
const normalizeDesktopActionRequest = (request, workspaceRoot) => {
    const proposal = findWindowsActionDefinitionById(request.proposalId);
    const root = request.workspaceRoot?.trim() ? request.workspaceRoot : workspaceRoot;
    const explicitTarget = request.target.trim();
    const normalizedTargetSource = explicitTarget || proposal?.defaultTarget || "";
    if (!normalizedTargetSource) {
        throw new Error(`A target is required for ${request.kind}.`);
    }
    const normalizedTarget = request.kind === "launch-program"
        ? resolveProgramTarget(normalizedTargetSource, root)
        : request.kind === "open-file" || request.kind === "open-folder"
            ? resolveTargetPath(normalizedTargetSource, root, workspaceRoot)
            : request.kind === "create-file" ||
                request.kind === "create-folder" ||
                request.kind === "rename-item" ||
                request.kind === "move-item" ||
                request.kind === "delete-file" ||
                request.kind === "delete-folder"
                ? resolveTargetPath(normalizedTargetSource, root, workspaceRoot)
                : normalizedTargetSource;
    const normalizedDestinationTarget = request.destinationTarget && request.destinationTarget.trim().length > 0
        ? resolveTargetPath(request.destinationTarget.trim(), root, workspaceRoot)
        : null;
    return {
        proposal,
        normalizedTarget,
        normalizedDestinationTarget
    };
};
const resolveApprovedRoots = (request, workspaceRoot) => {
    const baseRoot = path.resolve(request.workspaceRoot?.trim() ? request.workspaceRoot : workspaceRoot);
    const metadataRoots = Array.isArray(request.allowedRoots)
        ? request.allowedRoots.filter((value) => typeof value === "string" && value.trim().length > 0)
        : Array.isArray(request.metadata?.allowedRoots)
            ? request.metadata.allowedRoots.filter((value) => typeof value === "string" && value.trim().length > 0)
            : [];
    const approvedRoots = new Set([normalizePath(baseRoot)]);
    for (const candidate of metadataRoots) {
        const trimmed = candidate.trim();
        if (!path.isAbsolute(trimmed)) {
            continue;
        }
        approvedRoots.add(normalizePath(path.resolve(trimmed)));
    }
    return [...approvedRoots];
};
const assertPathWithinApprovedRoots = (target, approvedRoots) => {
    const normalizedTarget = normalizePath(target);
    if (!approvedRoots.some((root) => isWithinRoot(normalizedTarget, root))) {
        throw new Error("Workspace-scoped file operations must stay within the configured workspace root or an approved root.");
    }
};
const copyPath = async (source, destination) => {
    const sourceStat = await stat(source);
    if (sourceStat.isDirectory()) {
        await cp(source, destination, { recursive: true, force: true });
        return;
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: true });
};
const sanitizePathSegment = (value) => value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_");
const buildRollbackBackupPath = (runtimeRoot, commandId, target) => path.join(runtimeRoot, "rollback", commandId, sanitizePathSegment(target));
const toPlainText = (value) => {
    if (typeof value === "string") {
        return value;
    }
    if (value == null) {
        return "";
    }
    return JSON.stringify(value);
};
const asRecord = (value) => {
    if (value && typeof value === "object") {
        return value;
    }
    return { value };
};
const extractRollbackRecord = (value) => {
    if (!value || typeof value !== "object") {
        return null;
    }
    const rollback = value.rollback;
    if (!rollback || typeof rollback !== "object") {
        return null;
    }
    const record = rollback;
    if (typeof record.kind !== "string" || typeof record.target !== "string" || typeof record.summary !== "string") {
        return null;
    }
    return createRollbackRecord(record);
};
const normalizeServiceState = (value) => value?.trim().toLowerCase() ?? "";
const resolveServiceRollbackAction = (beforeState, afterState) => {
    const normalizedBefore = normalizeServiceState(beforeState);
    const normalizedAfter = normalizeServiceState(afterState);
    if (!normalizedAfter || normalizedBefore === normalizedAfter) {
        return null;
    }
    return normalizedAfter.includes("running") || normalizedAfter.includes("start") ? "stop" : "start";
};
export const createWindowsDesktopActionHost = () => ({
    async launchProgram(target, args, workingDirectory) {
        return spawnDetached(target, args, { cwd: workingDirectory ?? undefined });
    },
    async openTarget(target) {
        if (isWindows) {
            return spawnDetached("cmd.exe", ["/c", "start", "", target]);
        }
        if (process.platform === "darwin") {
            return spawnDetached("open", [target]);
        }
        return spawnDetached("xdg-open", [target]);
    },
    async focusWindow(target, targetKind) {
        if (isWindows) {
            const escapedTarget = escapePowerShellSingleQuoted(target);
            const script = `
$target = '${escapedTarget}'
Add-Type -Language CSharp @"
using System;
using System.Runtime.InteropServices;
public static class SynAIWindowFocus {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$match = $null
if ('${targetKind}' -eq 'process-id') {
  $match = Get-Process -Id ([int]$target) -ErrorAction SilentlyContinue
} else {
  $match = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and (
      $_.MainWindowTitle -like "*$target*" -or
      $_.ProcessName -like "*$target*"
    )
  } | Select-Object -First 1
}
if ($null -eq $match) {
  throw "No matching window or process was found for '$target'."
}
if ($match.MainWindowHandle -eq 0) {
  throw "The matching process has no visible window."
}
[SynAIWindowFocus]::ShowWindowAsync($match.MainWindowHandle, 9) | Out-Null
[SynAIWindowFocus]::SetForegroundWindow($match.MainWindowHandle) | Out-Null
[pscustomobject]@{
  processName = $match.ProcessName
  pid = $match.Id
  windowTitle = $match.MainWindowTitle
  targetKind = '${targetKind}'
}
`;
            return execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
        }
        return { target, targetKind, focused: true };
    },
    async closeWindowGracefully(target, targetKind) {
        if (isWindows) {
            const escapedTarget = escapePowerShellSingleQuoted(target);
            const script = `
$ErrorActionPreference = 'Stop'
$target = '${escapedTarget}'
$match = $null
if ('${targetKind}' -eq 'process-id') {
  $match = Get-Process -Id ([int]$target) -ErrorAction SilentlyContinue | Select-Object -First 1
} elseif ('${targetKind}' -eq 'process-name') {
  $match = Get-Process | Where-Object {
    $_.ProcessName -like "*$target*" -or $_.MainWindowTitle -like "*$target*"
  } | Select-Object -First 1
} else {
  $match = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and (
      $_.MainWindowTitle -like "*$target*" -or
      $_.ProcessName -like "*$target*"
    )
  } | Select-Object -First 1
}
if ($null -eq $match) {
  throw "No matching process or window was found for '$target'."
}
$before = [pscustomobject]@{
  processName = $match.ProcessName
  pid = $match.Id
  windowTitle = $match.MainWindowTitle
  hasWindow = $match.MainWindowHandle -ne 0
}
$closedBy = $null
$fallbackUsed = $false
if ($match.MainWindowHandle -ne 0) {
  try {
    [void]$match.CloseMainWindow()
    Start-Sleep -Milliseconds 800
    $stillRunning = Get-Process -Id $match.Id -ErrorAction SilentlyContinue
    if ($null -eq $stillRunning) {
      $closedBy = 'window-close'
    }
  } catch {}
}
if (-not $closedBy) {
  $fallbackUsed = $true
  Stop-Process -Id $match.Id -Force -ErrorAction Stop
  $closedBy = 'force-terminate'
}
$after = Get-Process -Id $match.Id -ErrorAction SilentlyContinue
[pscustomobject]@{
  processName = $match.ProcessName
  pid = $match.Id
  windowTitle = $match.MainWindowTitle
  closedBy = $closedBy
  fallbackUsed = $fallbackUsed
  before = $before
  stillRunning = $null -ne $after
}
`;
            const { stdout } = await execPowerShellScript(script);
            return stdout.trim().length > 0 ? JSON.parse(stdout) : { target, targetKind, closedBy: "force-terminate", fallbackUsed: true };
        }
        return { target, targetKind, closedBy: "simulated", fallbackUsed: false };
    },
    async createFile(target, content) {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content, "utf8");
        return { target, bytesWritten: Buffer.byteLength(content, "utf8") };
    },
    async createFolder(target) {
        await mkdir(target, { recursive: true });
        return { target };
    },
    async deletePath(target, recursive) {
        await rm(target, { recursive, force: true });
        return { target, recursive };
    },
    async renamePath(target, destination) {
        await mkdir(path.dirname(destination), { recursive: true });
        await rename(target, destination);
        return { source: target, destination };
    },
    async movePath(target, destination) {
        await mkdir(path.dirname(destination), { recursive: true });
        try {
            await rename(target, destination);
        }
        catch (error) {
            const code = error instanceof Error && "code" in error ? String(error.code) : null;
            if (code !== "EXDEV" && code !== "EPERM") {
                throw error;
            }
            await copyPath(target, destination);
            await rm(target, { recursive: true, force: true });
        }
        return { source: target, destination };
    },
    async inspectProcess(target, targetKind) {
        if (isWindows) {
            if (targetKind === "process-name") {
                return execFileAsync("tasklist", ["/FI", `IMAGENAME eq ${target}`, "/FO", "CSV", "/NH"]);
            }
            return execFileAsync("tasklist", ["/FI", `PID eq ${target}`, "/FO", "CSV", "/NH"]);
        }
        if (targetKind === "process-name") {
            return execFileAsync("pgrep", ["-fl", target]);
        }
        return execFileAsync("ps", ["-p", target, "-o", "pid=,comm=,args="]);
    },
    async terminateProcess(target, targetKind, force) {
        if (isWindows) {
            if (targetKind === "process-name") {
                return spawnDetached("taskkill", ["/IM", target, "/T", ...(force ? ["/F"] : [])]);
            }
            return spawnDetached("taskkill", ["/PID", target, "/T", ...(force ? ["/F"] : [])]);
        }
        if (targetKind === "process-name") {
            return execFileAsync("pkill", [force ? "-9" : "-TERM", "-x", target]);
        }
        const pid = Number(target);
        if (!Number.isFinite(pid)) {
            throw new Error("Process termination on this platform requires an exact PID.");
        }
        process.kill(pid, force ? "SIGKILL" : "SIGTERM");
        return { pid, force };
    },
    async controlService(target, action) {
        if (!isWindows) {
            throw new Error("Service control is only available on Windows.");
        }
        const escapedTarget = escapePowerShellSingleQuoted(target);
        const escapedAction = escapePowerShellSingleQuoted(action);
        const script = `
$ErrorActionPreference = 'Stop'
$serviceName = '${escapedTarget}'
$service = Get-CimInstance Win32_Service | Where-Object {
  $_.Name -eq $serviceName -or
  $_.DisplayName -eq $serviceName -or
  $_.Name -like "*$serviceName*" -or
  $_.DisplayName -like "*$serviceName*"
} | Select-Object -First 1
if ($null -eq $service) {
  throw "No matching service was found for '$serviceName'."
}
$before = [pscustomobject]@{
  serviceName = $service.Name
  displayName = $service.DisplayName
  state = $service.State
  startMode = $service.StartMode
  pathName = $service.PathName
}
switch ('${escapedAction}') {
  'start' { Start-Service -Name $service.Name -ErrorAction Stop }
  'stop' { Stop-Service -Name $service.Name -Force -ErrorAction Stop }
  'restart' { Restart-Service -Name $service.Name -Force -ErrorAction Stop }
  default { throw "Unsupported service action '${escapedAction}'." }
}
Start-Sleep -Milliseconds 250
$afterService = Get-CimInstance Win32_Service -Filter "Name='$($service.Name.Replace(\"'\", \"''\"))'"
$after = [pscustomobject]@{
  serviceName = $afterService.Name
  displayName = $afterService.DisplayName
  state = $afterService.State
  startMode = $afterService.StartMode
  pathName = $afterService.PathName
}
[pscustomobject]@{
  action = '${escapedAction}'
  serviceName = $service.Name
  displayName = $service.DisplayName
  before = $before
  after = $after
} | ConvertTo-Json -Depth 6
`;
        const { stdout } = await execPowerShellScript(script);
        return stdout.trim().length > 0 ? JSON.parse(stdout) : { target, action };
    },
    async setRegistryValue(target, valueName, value, valueKind) {
        if (!isWindows) {
            throw new Error("Registry mutation is only available on Windows.");
        }
        const escapedTarget = escapePowerShellSingleQuoted(target);
        const escapedValueName = escapePowerShellSingleQuoted(valueName);
        const escapedValue = escapePowerShellSingleQuoted(value);
        const escapedValueKind = escapePowerShellSingleQuoted(valueKind ?? "String");
        const script = `
$ErrorActionPreference = 'Stop'
$targetPath = '${escapedTarget}'
$valueName = '${escapedValueName}'
$valueData = '${escapedValue}'
$valueKind = '${escapedValueKind}'
if (-not (Test-Path $targetPath)) {
  New-Item -Path $targetPath -Force | Out-Null
}
$previousValue = $null
try {
  $previousItem = Get-ItemProperty -Path $targetPath -Name $valueName -ErrorAction Stop
  $previousValue = $previousItem.$valueName
} catch {}
if ($valueKind -and $valueKind -ne 'String') {
  New-ItemProperty -Path $targetPath -Name $valueName -Value $valueData -PropertyType $valueKind -Force | Out-Null
} else {
  New-ItemProperty -Path $targetPath -Name $valueName -Value $valueData -PropertyType String -Force | Out-Null
}
$currentItem = Get-ItemProperty -Path $targetPath -Name $valueName -ErrorAction SilentlyContinue
[pscustomobject]@{
  targetPath = $targetPath
  valueName = $valueName
  valueKind = $valueKind
  previousValue = $previousValue
  currentValue = $currentItem.$valueName
} | ConvertTo-Json -Depth 6
`;
        const { stdout } = await execPowerShellScript(script);
        return stdout.trim().length > 0 ? JSON.parse(stdout) : { target, valueName, value };
    },
    async deleteRegistryValue(target, valueName) {
        if (!isWindows) {
            throw new Error("Registry mutation is only available on Windows.");
        }
        const escapedTarget = escapePowerShellSingleQuoted(target);
        const escapedValueName = escapePowerShellSingleQuoted(valueName);
        const script = `
$ErrorActionPreference = 'Stop'
$targetPath = '${escapedTarget}'
$valueName = '${escapedValueName}'
$previousValue = $null
try {
  $previousItem = Get-ItemProperty -Path $targetPath -Name $valueName -ErrorAction Stop
  $previousValue = $previousItem.$valueName
} catch {}
Remove-ItemProperty -Path $targetPath -Name $valueName -ErrorAction Stop
[pscustomobject]@{
  targetPath = $targetPath
  valueName = $valueName
  previousValue = $previousValue
  deleted = $true
} | ConvertTo-Json -Depth 6
`;
        const { stdout } = await execPowerShellScript(script);
        return stdout.trim().length > 0 ? JSON.parse(stdout) : { target, valueName };
    },
    async invokeUiAction(target, action, options) {
        if (!isWindows) {
            throw new Error("UI automation is only available on Windows.");
        }
        const escapedTarget = escapePowerShellSingleQuoted(target);
        const escapedAction = escapePowerShellSingleQuoted(action);
        const escapedWindowTitle = escapePowerShellSingleQuoted(options?.windowTitle ?? "");
        const escapedValue = escapePowerShellSingleQuoted(options?.value ?? "");
        const escapedKeys = (options?.keys ?? []).map((key) => escapePowerShellSingleQuoted(key)).join("','");
        const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
function Find-Element([System.Windows.Automation.AutomationElement]$root, [string]$query, [int]$depth = 0) {
  if ($null -eq $root -or $depth -gt 5) {
    return $null
  }

  $current = $root.Current
  $haystacks = @(
    $current.Name,
    $current.AutomationId,
    $current.LocalizedControlType,
    $current.HelpText,
    $current.ClassName
  ) | Where-Object { $_ }

  foreach ($entry in $haystacks) {
    if ([string]$entry -like "*$query*") {
      return $root
    }
  }

  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $child = $walker.GetFirstChild($root)
  while ($null -ne $child) {
    $found = Find-Element -root $child -query $query -depth ($depth + 1)
    if ($null -ne $found) {
      return $found
    }
    $child = $walker.GetNextSibling($child)
  }

  return $null
}

function Escape-SendKeysText([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return ""
  }

  return (
    $value
      -replace '\\\\', '{\\\\}'
      -replace '\\+', '{+}'
      -replace '\\^', '{^}'
      -replace '%', '{%}'
      -replace '~', '{~}'
      -replace '\\(', '{(}'
      -replace '\\)', '{)}'
      -replace '\\[', '{[}'
      -replace '\\]', '{]}'
      -replace '\\{', '{{}'
      -replace '\\}', '{}}'
  )
}

function Keys-ToSendKeys([string[]]$keys) {
  $modifiers = ""
  $segments = @()
  foreach ($key in $keys) {
    switch -Regex ($key.ToLowerInvariant()) {
      '^(ctrl|control)$' { $modifiers += '^'; continue }
      '^alt$' { $modifiers += '%'; continue }
      '^shift$' { $modifiers += '+'; continue }
      '^(meta|cmd|command|win|super)$' { $modifiers += '#'; continue }
      '^(enter|return)$' { $segments += '~'; continue }
      '^tab$' { $segments += '{TAB}'; continue }
      '^escape$|^esc$' { $segments += '{ESC}'; continue }
      '^backspace$' { $segments += '{BACKSPACE}'; continue }
      '^delete$' { $segments += '{DELETE}'; continue }
      '^space$' { $segments += ' '; continue }
      '^f\\d+$' { $segments += ('{' + $key.ToUpperInvariant() + '}'); continue }
      default { $segments += (Escape-SendKeysText $key) }
    }
  }
  return "$modifiers$($segments -join '')"
}

$selector = '${escapedTarget}'
$windowTitle = '${escapedWindowTitle}'
$rootProcess = $null
if ($windowTitle) {
  $rootProcess = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and (
      $_.MainWindowTitle -like "*$windowTitle*" -or
      $_.ProcessName -like "*$windowTitle*"
    )
  } | Select-Object -First 1
} else {
  $rootProcess = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}
if ($null -eq $rootProcess) {
  throw "No matching foreground window was found."
}
$root = [System.Windows.Automation.AutomationElement]::FromHandle($rootProcess.MainWindowHandle)
if ($null -eq $root) {
  throw "Unable to inspect the target window."
}
$element = Find-Element -root $root -query $selector
if ($null -eq $element) {
  throw "Unable to locate UI element '$selector'."
}
switch ('${escapedAction}') {
  'click' {
    $invokePattern = $null
    $selectionPattern = $null
    $expandPattern = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePattern)) {
      $invokePattern.Invoke()
    } elseif ($element.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selectionPattern)) {
      $selectionPattern.Select()
    } elseif ($element.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$expandPattern)) {
      $expandPattern.Expand()
    } else {
      $element.SetFocus()
      [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    }
  }
  'type' {
    $value = '${escapedValue}'
    $valuePattern = $null
    if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
      $valuePattern.SetValue($value)
    } else {
      $element.SetFocus()
      [System.Windows.Forms.SendKeys]::SendWait((Escape-SendKeysText $value))
    }
    if (${options?.submit ? "$true" : "$false"}) {
      [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    }
  }
  'hotkey' {
    $keys = @('${escapedKeys}')
    $sendKeys = Keys-ToSendKeys $keys
    [System.Windows.Forms.SendKeys]::SendWait($sendKeys)
  }
  default {
    throw "Unsupported UI action '${escapedAction}'."
  }
}

[pscustomobject]@{
  action = '${escapedAction}'
  target = $selector
  windowTitle = $rootProcess.MainWindowTitle
  processName = $rootProcess.ProcessName
  status = 'executed'
} | ConvertTo-Json -Depth 6
`;
        const { stdout } = await execPowerShellScript(script);
        return stdout.trim().length > 0 ? JSON.parse(stdout) : { target, action };
    },
    async openTaskManager() {
        if (isWindows) {
            return spawnDetached("taskmgr.exe", []);
        }
        throw new Error("Task Manager is only available on Windows.");
    }
});
const toExecutionRequest = (request, preview, riskClass, workspaceRoot) => ({
    commandName: `desktop.action.${request.proposalId}`,
    command: preview,
    args: request.args ?? [],
    riskClass,
    destructive: Boolean(request.destructive),
    actionKind: request.kind,
    targetKind: request.targetKind,
    scope: request.scope,
    sandboxed: Boolean(request.metadata?.sandboxed) ||
        ["create-file", "create-folder", "rename-item", "move-item", "delete-file", "delete-folder"].includes(request.kind),
    approvedRoots: resolveApprovedRoots(request, workspaceRoot),
    targetState: typeof request.metadata?.targetState === "string" ? request.metadata.targetState : null,
    machineState: typeof request.metadata?.machineState === "object" && request.metadata?.machineState !== null ? request.metadata.machineState : null,
    approvalToken: request.approvalToken ?? null,
    approvedBy: request.approvedBy ?? null,
    dryRun: Boolean(request.dryRun),
    metadata: {
        ...buildRequestMetadata(request, request.target, request.destinationTarget ?? null)
    }
});
const createRollbackRecord = (record) => ({
    ...record,
    destination: record.destination ?? null,
    backupPath: record.backupPath ?? null,
    reason: record.reason ?? null,
    reversible: record.reversible ?? record.possible,
    compensationSummary: record.compensationSummary ?? null,
    metadata: record.metadata ?? {}
});
const createVerificationRecord = (summary, observedState, passed = true, expectedStateSummary) => ({
    passed,
    summary,
    evidence: observedState == null ? [] : [typeof observedState === "string" ? observedState : JSON.stringify(observedState)],
    observedState,
    expectedStateSummary: expectedStateSummary ?? null
});
const buildApprovalQueueRecord = (request, commandHash, status, summary, commandId, approvedBy, tokenId, approvedRoots) => ({
    id: commandHash,
    source: "desktop-actions",
    commandId,
    commandHash,
    commandName: `desktop.action.${request.proposalId}`,
    actionType: request.kind,
    riskClass: request.riskClass,
    scope: request.scope,
    targetKind: request.targetKind,
    status,
    approvedBy,
    tokenId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: request.approvalToken?.expiresAt ?? null,
    summary,
    metadata: {
        proposalId: request.proposalId,
        target: request.target,
        destinationTarget: request.destinationTarget ?? null,
        workspaceRoot: request.workspaceRoot ?? null,
        allowedRoots: request.allowedRoots ?? [],
        approvedRoots
    }
});
const performDesktopAction = async (request, host, workspaceRoot, runtimeRoot, commandId, getInstalledAppsSnapshot) => {
    const normalized = normalizeDesktopActionRequest(request, workspaceRoot);
    const proposal = normalized.proposal;
    const preview = proposal ? renderPreview(proposal, request) : request.metadata?.preview ? String(request.metadata.preview) : request.target;
    const approvedRoots = resolveApprovedRoots(request, workspaceRoot);
    if (request.dryRun) {
        return {
            simulated: true,
            summary: `Dry-run only: ${preview}`
        };
    }
    switch (request.kind) {
        case "launch-program":
            return {
                simulated: false,
                summary: `Launched ${normalized.normalizedTarget}.`,
                output: await host.launchProgram(normalized.normalizedTarget, request.args ?? [], request.workingDirectory ?? null)
            };
        case "open-file":
        case "open-folder":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: `${request.kind} is Windows-first in this build.`
                };
            }
            return {
                simulated: false,
                summary: `Opened ${normalized.normalizedTarget}.`,
                output: await host.openTarget(normalized.normalizedTarget)
            };
        case "open-settings":
        case "open-control-panel":
        case "open-startup-apps":
        case "open-storage-settings":
        case "open-add-remove-programs":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: `${proposal?.title ?? request.kind} is Windows-only in this build.`
                };
            }
            return {
                simulated: false,
                summary: `Opened ${proposal?.title ?? request.kind}.`,
                output: await host.openTarget(normalized.normalizedTarget)
            };
        case "focus-window":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Window focus is Windows-first in this build."
                };
            }
            return {
                simulated: false,
                summary: `Focused window ${normalized.normalizedTarget}.`,
                output: await host.focusWindow(normalized.normalizedTarget, request.targetKind)
            };
        case "close-app":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Graceful app close is Windows-first in this build."
                };
            }
            return {
                simulated: false,
                summary: `Requested graceful close for ${normalized.normalizedTarget}.`,
                output: await host.closeWindowGracefully(normalized.normalizedTarget, request.targetKind)
            };
        case "open-task-manager":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Task Manager is Windows-only in this build."
                };
            }
            return {
                simulated: false,
                summary: "Opened Task Manager.",
                output: await host.openTaskManager()
            };
        case "ui-click":
        case "ui-type":
        case "ui-hotkey":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "UI automation is Windows-only in this build."
                };
            }
            return {
                simulated: false,
                summary: request.kind === "ui-click"
                    ? `Clicked UI element ${normalized.normalizedTarget}.`
                    : request.kind === "ui-type"
                        ? `Typed into UI element ${normalized.normalizedTarget}.`
                        : `Sent hotkeys to ${normalized.normalizedTarget}.`,
                output: {
                    ...asRecord(await host.invokeUiAction(normalized.normalizedTarget, request.kind === "ui-click" ? "click" : request.kind === "ui-type" ? "type" : "hotkey", {
                        windowTitle: typeof request.metadata?.windowTitle === "string" ? request.metadata.windowTitle : null,
                        value: typeof request.metadata?.value === "string" ? request.metadata.value : null,
                        keys: Array.isArray(request.metadata?.keys)
                            ? request.metadata.keys.filter((entry) => typeof entry === "string")
                            : null,
                        submit: Boolean(request.metadata?.submit)
                    })),
                    rollback: createRollbackRecord({
                        possible: false,
                        kind: "ui-automation",
                        target: normalized.normalizedTarget,
                        reason: "UI automation actions are not deterministically reversible.",
                        summary: `UI automation does not have a safe rollback for ${normalized.normalizedTarget}.`
                    })
                }
            };
        case "start-service":
        case "stop-service":
        case "restart-service":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Service control is Windows-only in this build."
                };
            }
            const serviceOutput = await host.controlService(normalized.normalizedTarget, request.kind === "start-service" ? "start" : request.kind === "stop-service" ? "stop" : "restart");
            const serviceResult = serviceOutput;
            const rollbackAction = resolveServiceRollbackAction(serviceResult.before?.state ?? null, serviceResult.after?.state ?? null);
            const rollbackSummary = rollbackAction === null
                ? `Service ${normalized.normalizedTarget} already matches its previous state.`
                : `Restore service ${normalized.normalizedTarget} to its previous state by issuing a ${rollbackAction} action.`;
            return {
                simulated: false,
                summary: request.kind === "start-service"
                    ? `Started service ${normalized.normalizedTarget}.`
                    : request.kind === "stop-service"
                        ? `Stopped service ${normalized.normalizedTarget}.`
                        : `Restarted service ${normalized.normalizedTarget}.`,
                output: {
                    ...serviceResult,
                    rollback: createRollbackRecord({
                        possible: rollbackAction !== null,
                        kind: "restore-service-state",
                        target: normalized.normalizedTarget,
                        summary: rollbackSummary,
                        metadata: {
                            originalAction: request.kind,
                            rollbackAction,
                            beforeState: serviceResult.before?.state ?? null,
                            afterState: serviceResult.after?.state ?? null,
                            serviceName: serviceResult.serviceName ?? normalized.normalizedTarget,
                            displayName: serviceResult.displayName ?? null
                        }
                    })
                }
            };
        case "set-registry-value": {
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Registry mutation is Windows-only in this build."
                };
            }
            const valueName = typeof request.metadata?.valueName === "string" ? request.metadata.valueName : "Default";
            const valueKind = typeof request.metadata?.valueKind === "string" ? request.metadata.valueKind : "String";
            const requestedValue = toPlainText(request.metadata?.value ?? "");
            const registryResult = (await host.setRegistryValue(normalized.normalizedTarget, valueName, requestedValue, valueKind));
            return {
                simulated: false,
                summary: `Updated registry value ${normalized.normalizedTarget}.`,
                output: {
                    ...registryResult,
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "restore-registry-value",
                        target: normalized.normalizedTarget,
                        summary: `Restore the previous value for ${normalized.normalizedTarget}.`,
                        metadata: {
                            valueName,
                            previousValue: registryResult.previousValue ?? null,
                            valueKind
                        }
                    })
                }
            };
        }
        case "delete-registry-value": {
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Registry mutation is Windows-only in this build."
                };
            }
            const valueName = typeof request.metadata?.valueName === "string" ? request.metadata.valueName : "Default";
            const valueKind = typeof request.metadata?.valueKind === "string" ? request.metadata.valueKind : "String";
            const registryResult = (await host.deleteRegistryValue(normalized.normalizedTarget, valueName));
            return {
                simulated: false,
                summary: `Deleted registry value ${normalized.normalizedTarget}.`,
                output: {
                    ...registryResult,
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "restore-registry-value",
                        target: normalized.normalizedTarget,
                        summary: `Restore the deleted registry value for ${normalized.normalizedTarget}.`,
                        metadata: {
                            valueName,
                            previousValue: registryResult.previousValue ?? null,
                            valueKind
                        }
                    })
                }
            };
        }
        case "create-file": {
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            const restoreBackupPath = typeof request.metadata?.restoreBackupPath === "string" ? request.metadata.restoreBackupPath : null;
            const content = typeof request.metadata?.content === "string" ? request.metadata.content : "";
            const fileOutput = restoreBackupPath
                ? (await copyPath(restoreBackupPath, normalized.normalizedTarget), {
                    target: normalized.normalizedTarget,
                    restoredFrom: restoreBackupPath
                })
                : await host.createFile(normalized.normalizedTarget, content);
            return {
                simulated: false,
                summary: `Created file ${normalized.normalizedTarget}.`,
                output: {
                    ...asRecord(fileOutput),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "delete-file",
                        target: normalized.normalizedTarget,
                        summary: `Delete ${normalized.normalizedTarget} to undo the file creation.`,
                        metadata: {
                            contentLength: Buffer.byteLength(content, "utf8")
                        }
                    })
                }
            };
        }
        case "create-folder": {
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            const restoreBackupPath = typeof request.metadata?.restoreBackupPath === "string" ? request.metadata.restoreBackupPath : null;
            const folderOutput = restoreBackupPath
                ? (await rm(normalized.normalizedTarget, { recursive: true, force: true }).catch(() => undefined),
                    await copyPath(restoreBackupPath, normalized.normalizedTarget),
                    {
                        target: normalized.normalizedTarget,
                        restoredFrom: restoreBackupPath
                    })
                : await host.createFolder(normalized.normalizedTarget);
            return {
                simulated: false,
                summary: `Created folder ${normalized.normalizedTarget}.`,
                output: {
                    ...asRecord(folderOutput),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "delete-folder",
                        target: normalized.normalizedTarget,
                        summary: `Delete ${normalized.normalizedTarget} to undo the folder creation.`
                    })
                }
            };
        }
        case "rename-item":
            if (!normalized.normalizedDestinationTarget) {
                throw new Error("destinationTarget is required for rename-item.");
            }
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            assertPathWithinApprovedRoots(normalized.normalizedDestinationTarget, approvedRoots);
            return {
                simulated: false,
                summary: `Renamed ${normalized.normalizedTarget} to ${normalized.normalizedDestinationTarget}.`,
                output: {
                    ...asRecord(await host.renamePath(normalized.normalizedTarget, normalized.normalizedDestinationTarget)),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "rename-item",
                        target: normalized.normalizedDestinationTarget,
                        destination: normalized.normalizedTarget,
                        summary: `Rename ${normalized.normalizedDestinationTarget} back to ${normalized.normalizedTarget}.`
                    })
                }
            };
        case "move-item":
            if (!normalized.normalizedDestinationTarget) {
                throw new Error("destinationTarget is required for move-item.");
            }
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            assertPathWithinApprovedRoots(normalized.normalizedDestinationTarget, approvedRoots);
            return {
                simulated: false,
                summary: `Moved ${normalized.normalizedTarget} to ${normalized.normalizedDestinationTarget}.`,
                output: {
                    ...asRecord(await host.movePath(normalized.normalizedTarget, normalized.normalizedDestinationTarget)),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "move-item",
                        target: normalized.normalizedDestinationTarget,
                        destination: normalized.normalizedTarget,
                        summary: `Move ${normalized.normalizedDestinationTarget} back to ${normalized.normalizedTarget}.`
                    })
                }
            };
        case "delete-file":
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            await mkdir(path.dirname(buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget)), {
                recursive: true
            });
            await copyPath(normalized.normalizedTarget, buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget));
            return {
                simulated: false,
                summary: `Deleted file ${normalized.normalizedTarget}.`,
                output: {
                    ...asRecord(await host.deletePath(normalized.normalizedTarget, false)),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "restore-file",
                        target: normalized.normalizedTarget,
                        backupPath: buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget),
                        summary: `Restore ${normalized.normalizedTarget} from the rollback backup.`
                    })
                }
            };
        case "delete-folder":
            assertPathWithinApprovedRoots(normalized.normalizedTarget, approvedRoots);
            await mkdir(path.dirname(buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget)), {
                recursive: true
            });
            await copyPath(normalized.normalizedTarget, buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget));
            return {
                simulated: false,
                summary: `Deleted folder ${normalized.normalizedTarget}.`,
                output: {
                    ...asRecord(await host.deletePath(normalized.normalizedTarget, true)),
                    rollback: createRollbackRecord({
                        possible: true,
                        kind: "restore-folder",
                        target: normalized.normalizedTarget,
                        backupPath: buildRollbackBackupPath(runtimeRoot, commandId, normalized.normalizedTarget),
                        summary: `Restore ${normalized.normalizedTarget} from the rollback backup.`
                    })
                }
            };
        case "inspect-process":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Process inspection is Windows-first in this build."
                };
            }
            return {
                simulated: false,
                summary: `Inspected process ${normalized.normalizedTarget}.`,
                output: await host.inspectProcess(normalized.normalizedTarget, request.targetKind)
            };
        case "terminate-process":
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Process termination is Windows-only in this build."
                };
            }
            return {
                simulated: false,
                summary: `Terminated process ${normalized.normalizedTarget}.`,
                output: await host.terminateProcess(normalized.normalizedTarget, request.targetKind, Boolean(request.metadata?.force))
            };
        case "uninstall-app": {
            if (!isWindows) {
                return {
                    simulated: true,
                    summary: "Application uninstall is Windows-only in this build."
                };
            }
            const app = resolveInstalledApp(getInstalledAppsSnapshot(), normalized.normalizedTarget);
            if (!app) {
                throw new Error(`Unable to resolve installed app "${normalized.normalizedTarget}".`);
            }
            const uninstallCommand = app.quietUninstallCommand ?? app.uninstallCommand;
            if (!uninstallCommand) {
                throw new Error(`No uninstall command is registered for ${app.name}.`);
            }
            return {
                simulated: false,
                summary: `Uninstalled ${app.name}.`,
                output: await host.launchProgram("cmd.exe", ["/c", uninstallCommand], app.installLocation ?? null)
            };
        }
        default:
            return {
                simulated: true,
                summary: `No host execution is attached for ${request.proposalId}.`
            };
    }
};
const toDesktopActionResult = (request, response, preview) => ({
    proposalId: request.proposalId,
    kind: request.kind,
    scope: request.scope,
    targetKind: request.targetKind,
    target: request.target,
    status: response.status,
    commandId: response.commandId,
    commandHash: response.commandHash,
    preview,
    summary: response.summary,
    riskClass: request.riskClass,
    approvalRequired: response.decision.approvalRequired,
    approvedBy: request.approvedBy ?? null,
    startedAt: response.startedAt,
    completedAt: response.completedAt,
    output: response.output,
    rollback: extractRollbackRecord(response.output),
    verification: response.verification ??
        createVerificationRecord(response.summary, response.output ?? null, response.status === "executed" || response.status === "simulated"),
    error: response.error
});
export const createDesktopActionService = (options) => {
    const workspaceRoot = path.resolve(options.workspaceRoot);
    const runtimeRoot = path.resolve(options.runtimeRoot);
    const approvalLedger = createApprovalLedger({ signingSecret: options.approvalSecret });
    const commandBus = createGovernanceCommandBus({
        approvalLedger,
        auditLogPath: path.join(runtimeRoot, "desktop-actions.commands.jsonl")
    });
    const host = options.host ?? createWindowsDesktopActionHost();
    const getInstalledAppsSnapshot = options.getInstalledAppsSnapshot ?? (() => null);
    const approvalQueue = options.approvalQueue ?? null;
    const listDesktopActions = () => listWindowsActionDefinitions().map((definition) => ({
        ...definition,
        aliases: [...definition.aliases],
        preconditions: [...definition.preconditions]
    }));
    const suggestDesktopAction = (prompt) => {
        const suggested = suggestWindowsActionFromPrompt(prompt);
        return suggested ? { ...suggested, aliases: [...suggested.aliases], preconditions: [...suggested.preconditions] } : null;
    };
    const issueDesktopActionApproval = (request, approvedBy, ttlMs) => {
        const normalized = normalizeDesktopActionRequest(request, workspaceRoot);
        const preview = normalized.proposal
            ? renderPreview(normalized.proposal, request)
            : request.target;
        const executionRequest = toExecutionRequest({
            ...request,
            approvedBy,
            target: normalized.normalizedTarget,
            destinationTarget: normalized.normalizedDestinationTarget
        }, preview, request.riskClass, workspaceRoot);
        const commandHash = hashGovernanceCommand(executionRequest);
        const token = approvalLedger.issueApprovalToken(commandHash, approvedBy, ttlMs);
        void approvalQueue?.record(buildApprovalQueueRecord({
            ...request,
            approvedBy,
            approvalToken: token
        }, commandHash, "approved", `Approval issued for ${request.proposalId}.`, null, approvedBy, token.tokenId, resolveApprovedRoots(request, workspaceRoot)));
        return token;
    };
    const executeDesktopAction = async (request) => {
        const normalized = normalizeDesktopActionRequest(request, workspaceRoot);
        const proposal = normalized.proposal;
        const preview = proposal ? renderPreview(proposal, { ...request, target: normalized.normalizedTarget, destinationTarget: normalized.normalizedDestinationTarget ?? null }) : request.target;
        const approvedRoots = resolveApprovedRoots(request, workspaceRoot);
        const executionRequest = toExecutionRequest({
            ...request,
            target: normalized.normalizedTarget,
            destinationTarget: normalized.normalizedDestinationTarget
        }, preview, request.riskClass, workspaceRoot);
        executionRequest.handler = async (_request, context) => performDesktopAction({
            ...request,
            target: normalized.normalizedTarget,
            destinationTarget: normalized.normalizedDestinationTarget
        }, host, workspaceRoot, runtimeRoot, context.commandId, getInstalledAppsSnapshot);
        const queued = commandBus.enqueueGovernanceCommand(executionRequest);
        const commandResult = await commandBus.processNextGovernanceCommand();
        if (!commandResult) {
            await approvalQueue?.record(buildApprovalQueueRecord({
                ...request,
                target: normalized.normalizedTarget,
                destinationTarget: normalized.normalizedDestinationTarget
            }, queued.commandHash, "blocked", "No command result returned by governance bus.", queued.commandId, request.approvedBy ?? null, request.approvalToken?.tokenId ?? null, approvedRoots));
            return {
                proposalId: request.proposalId,
                kind: request.kind,
                scope: request.scope,
                targetKind: request.targetKind,
                target: normalized.normalizedTarget,
                status: "failed",
                commandId: queued.commandId,
                commandHash: queued.commandHash,
                preview,
                summary: "No command result returned by governance bus.",
                riskClass: request.riskClass,
                approvalRequired: request.destructive,
                approvedBy: request.approvedBy ?? null,
                startedAt: null,
                completedAt: null
            };
        }
        const result = toDesktopActionResult({
            ...request,
            target: normalized.normalizedTarget,
            destinationTarget: normalized.normalizedDestinationTarget
        }, {
            commandId: commandResult.commandId,
            commandHash: commandResult.commandHash,
            startedAt: commandResult.startedAt,
            completedAt: commandResult.completedAt,
            summary: commandResult.summary,
            status: commandResult.status,
            output: commandResult.output,
            error: commandResult.error,
            decision: commandResult.governance
        }, preview);
        await approvalQueue?.record(buildApprovalQueueRecord({
            ...request,
            target: normalized.normalizedTarget,
            destinationTarget: normalized.normalizedDestinationTarget
        }, commandResult.commandHash, result.status === "executed"
            ? "consumed"
            : result.status === "simulated"
                ? "approved"
                : result.status === "denied"
                    ? "denied"
                    : "blocked", result.summary, commandResult.commandId, result.approvedBy, request.approvalToken?.tokenId ?? null, approvedRoots));
        return result;
    };
    const buildRollbackDesktopRequest = (command) => {
        const result = command.result;
        const rollbackRecord = extractRollbackRecord(result?.output);
        if (!rollbackRecord || !rollbackRecord.possible) {
            return null;
        }
        const metadata = (command.request.metadata ?? {});
        const originalProposalId = command.request.commandName.replace(/^desktop\.action\./, "");
        const originalProposal = findWindowsActionDefinitionById(originalProposalId);
        const originalKind = (typeof metadata.kind === "string" ? metadata.kind : originalProposal?.kind);
        const originalTarget = typeof metadata.target === "string" ? metadata.target : "";
        const originalDestinationTarget = typeof metadata.destinationTarget === "string" ? metadata.destinationTarget : null;
        const originalWorkspaceRoot = typeof metadata.workspaceRoot === "string" ? metadata.workspaceRoot : workspaceRoot;
        const originalTargetKind = (typeof metadata.targetKind === "string" ? metadata.targetKind : originalProposal?.targetKind);
        const originalScope = (typeof metadata.scope === "string" ? metadata.scope : originalProposal?.scope);
        const originalRiskClass = command.request.riskClass;
        if (!originalKind || !originalTarget || !originalTargetKind || !originalScope) {
            return null;
        }
        const invertableRegistryValue = rollbackRecord.metadata?.previousValue;
        const serviceRollbackAction = typeof rollbackRecord.metadata?.rollbackAction === "string"
            ? rollbackRecord.metadata.rollbackAction
            : null;
        switch (originalKind) {
            case "create-file":
                return {
                    proposalId: "delete-file",
                    kind: "delete-file",
                    scope: "workspace",
                    targetKind: "path",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "high",
                    destructive: true,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        content: "",
                        force: false
                    }
                };
            case "create-folder":
                return {
                    proposalId: "delete-folder",
                    kind: "delete-folder",
                    scope: "workspace",
                    targetKind: "directory",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "high",
                    destructive: true,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        force: true
                    }
                };
            case "delete-file":
                return {
                    proposalId: "create-file",
                    kind: "create-file",
                    scope: "workspace",
                    targetKind: "path",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "medium",
                    destructive: false,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        restoreBackupPath: rollbackRecord.backupPath ?? null,
                        content: ""
                    }
                };
            case "delete-folder":
                return {
                    proposalId: "create-folder",
                    kind: "create-folder",
                    scope: "workspace",
                    targetKind: "directory",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "medium",
                    destructive: false,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        restoreBackupPath: rollbackRecord.backupPath ?? null
                    }
                };
            case "rename-item":
            case "move-item":
                if (!originalDestinationTarget) {
                    return null;
                }
                return {
                    proposalId: originalKind,
                    kind: originalKind,
                    scope: originalScope,
                    targetKind: originalTargetKind,
                    target: originalDestinationTarget,
                    destinationTarget: originalTarget,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: originalRiskClass,
                    destructive: false,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind
                    }
                };
            case "start-service":
            case "stop-service":
            case "restart-service": {
                if (!serviceRollbackAction) {
                    return null;
                }
                const inverseKind = serviceRollbackAction === "start" ? "start-service" : "stop-service";
                return {
                    proposalId: inverseKind,
                    kind: inverseKind,
                    scope: "system",
                    targetKind: "service-name",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "high",
                    destructive: true,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        valueName: null
                    }
                };
            }
            case "set-registry-value": {
                const valueName = typeof rollbackRecord.metadata?.valueName === "string" ? rollbackRecord.metadata.valueName : typeof metadata.valueName === "string" ? metadata.valueName : "Default";
                const previousValue = invertableRegistryValue ?? null;
                if (previousValue !== null && previousValue !== undefined) {
                    return {
                        proposalId: "set-registry-value",
                        kind: "set-registry-value",
                        scope: "system",
                        targetKind: "registry-key",
                        target: originalTarget,
                        destinationTarget: null,
                        args: [],
                        workingDirectory: null,
                        workspaceRoot: originalWorkspaceRoot,
                        riskClass: "high",
                        destructive: true,
                        dryRun: false,
                        approvedBy: null,
                        approvalToken: null,
                        metadata: {
                            rollbackOf: command.commandId,
                            rollbackKind: rollbackRecord.kind,
                            valueName,
                            value: toPlainText(previousValue),
                            valueKind: typeof rollbackRecord.metadata?.valueKind === "string" ? rollbackRecord.metadata.valueKind : "String"
                        }
                    };
                }
                return {
                    proposalId: "delete-registry-value",
                    kind: "delete-registry-value",
                    scope: "system",
                    targetKind: "registry-value",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "high",
                    destructive: true,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        valueName,
                        valueKind: typeof rollbackRecord.metadata?.valueKind === "string" ? rollbackRecord.metadata.valueKind : "String"
                    }
                };
            }
            case "delete-registry-value":
                return {
                    proposalId: "set-registry-value",
                    kind: "set-registry-value",
                    scope: "system",
                    targetKind: "registry-key",
                    target: originalTarget,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: originalWorkspaceRoot,
                    riskClass: "high",
                    destructive: true,
                    dryRun: false,
                    approvedBy: null,
                    approvalToken: null,
                    metadata: {
                        rollbackOf: command.commandId,
                        rollbackKind: rollbackRecord.kind,
                        valueName: typeof rollbackRecord.metadata?.valueName === "string" ? rollbackRecord.metadata.valueName : "Default",
                        value: toPlainText(invertableRegistryValue ?? ""),
                        valueKind: typeof rollbackRecord.metadata?.valueKind === "string" ? rollbackRecord.metadata.valueKind : "String"
                    }
                };
            default:
                return null;
        }
    };
    const rollbackDesktopAction = async (commandId, approvedBy, dryRun = false) => {
        const command = commandBus.getGovernanceCommandStatus(commandId);
        if (!command) {
            return {
                proposalId: "rollback",
                kind: "launch-program",
                scope: "system",
                targetKind: "command",
                target: commandId,
                status: "failed",
                commandId: null,
                commandHash: null,
                preview: `Rollback ${commandId}`,
                summary: `No command was found for ${commandId}.`,
                riskClass: "medium",
                approvalRequired: false,
                approvedBy,
                startedAt: null,
                completedAt: null,
                error: `No command was found for ${commandId}.`
            };
        }
        if (!command.result) {
            return {
                proposalId: "rollback",
                kind: "launch-program",
                scope: "system",
                targetKind: "command",
                target: commandId,
                status: "blocked",
                commandId: command.commandId,
                commandHash: command.commandHash,
                preview: `Rollback ${commandId}`,
                summary: `Command ${commandId} has no completed result to roll back.`,
                riskClass: "medium",
                approvalRequired: false,
                approvedBy,
                startedAt: null,
                completedAt: null,
                error: `Command ${commandId} has no completed result to roll back.`
            };
        }
        const rollbackRecord = extractRollbackRecord(command.result.output);
        if (!rollbackRecord || !rollbackRecord.possible) {
            return {
                proposalId: "rollback",
                kind: "launch-program",
                scope: "system",
                targetKind: "command",
                target: commandId,
                status: "blocked",
                commandId: command.commandId,
                commandHash: command.commandHash,
                preview: `Rollback ${commandId}`,
                summary: rollbackRecord?.summary ?? "The original command did not record a reversible rollback path.",
                riskClass: "medium",
                approvalRequired: false,
                approvedBy,
                startedAt: null,
                completedAt: null,
                error: rollbackRecord?.summary ?? "The original command did not record a reversible rollback path."
            };
        }
        const rollbackRequest = buildRollbackDesktopRequest(command);
        if (!rollbackRequest) {
            return {
                proposalId: "rollback",
                kind: "launch-program",
                scope: "system",
                targetKind: "command",
                target: commandId,
                status: "blocked",
                commandId: command.commandId,
                commandHash: command.commandHash,
                preview: `Rollback ${commandId}`,
                summary: rollbackRecord.summary,
                riskClass: "medium",
                approvalRequired: false,
                approvedBy,
                startedAt: null,
                completedAt: null,
                error: rollbackRecord.summary
            };
        }
        const approvalToken = rollbackRequest.destructive
            ? issueDesktopActionApproval(rollbackRequest, approvedBy, dryRun ? 5 * 60 * 1000 : 15 * 60 * 1000)
            : null;
        return await executeDesktopAction({
            ...rollbackRequest,
            dryRun,
            approvedBy,
            approvalToken
        });
    };
    return {
        listDesktopActions,
        suggestDesktopAction,
        issueDesktopActionApproval,
        executeDesktopAction,
        rollbackDesktopAction,
        getGovernanceCommandStatus: (commandId) => commandBus.getGovernanceCommandStatus(commandId)
    };
};
export const resolveDefaultDesktopActionPaths = (workspaceRoot) => ({
    runtimeRoot: path.join(workspaceRoot, ".runtime", "governance"),
    workspaceRoot: path.resolve(workspaceRoot)
});
