const normalize = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const formatPreviewToken = (value, fallback) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return fallback;
    }
    return /\s/.test(trimmed) || /["'`]/.test(trimmed) ? JSON.stringify(trimmed) : trimmed;
};
const renderPreview = (template, values) => template
    .replace(/\{target\}/g, formatPreviewToken(values.target, "<target>"))
    .replace(/\{destination\}/g, formatPreviewToken(values.destinationTarget ?? "", "<destination>"))
    .replace(/\{args\}/g, values.args?.length ? values.args.map((arg) => formatPreviewToken(arg, arg)).join(" ") : "");
const createDefinition = (definition) => ({
    ...definition,
    aliases: [...definition.aliases],
    preconditions: [...definition.preconditions]
});
const makeCommandPreview = (definition, target, destinationTarget, args) => renderPreview(definition.commandPreview, {
    target: target?.trim() || definition.defaultTarget || definition.targetPlaceholder,
    destinationTarget,
    args
}).trim();
const appSurfaceDefinition = (id, title, description, defaultTarget, aliases, preconditions = ["Windows shell integration available"]) => ({
    id,
    title,
    description,
    kind: "open-settings",
    scope: "settings",
    targetKind: "uri",
    targetPlaceholder: "Windows URI or command",
    defaultTarget,
    commandPreview: `start ${defaultTarget}`,
    riskClass: "low",
    approvalRequired: false,
    preconditions,
    aliases: [...aliases],
    metadata: {
        surfaceType: "system-navigation"
    }
});
export const WINDOWS_ACTION_CATALOG = [
    createDefinition({
        id: "open-add-remove-programs",
        title: "Open Add or Remove Programs",
        description: "Open the installed apps manager through the safest available Windows surface.",
        kind: "open-settings",
        scope: "settings",
        targetKind: "uri",
        targetPlaceholder: "ms-settings:appsfeatures",
        defaultTarget: "ms-settings:appsfeatures",
        commandPreview: "start ms-settings:appsfeatures",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows settings protocol available"],
        aliases: [
            "add or remove programs",
            "add remove program",
            "add remove programs",
            "open add remove program",
            "open add remove programs",
            "windows add remove program",
            "windows add remove programs",
            "appsfeatures",
            "apps and features",
            "installed apps",
            "uninstall apps"
        ],
        metadata: {
            alternateTarget: "appwiz.cpl"
        }
    }),
    createDefinition({
        id: "open-windows-settings",
        title: "Open Windows Settings",
        description: "Open the main Windows Settings app.",
        kind: "open-settings",
        scope: "settings",
        targetKind: "uri",
        targetPlaceholder: "ms-settings:",
        defaultTarget: "ms-settings:",
        commandPreview: "start ms-settings:",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows settings protocol available"],
        aliases: [
            "open windows settings",
            "open up windows settings",
            "windows settings",
            "windows settings app",
            "open settings",
            "settings app"
        ],
        metadata: {
            systemSurface: "settings-home"
        }
    }),
    createDefinition({
        id: "open-startup-apps",
        title: "Open Startup Apps",
        description: "Open the Windows Startup Apps settings page.",
        kind: "open-settings",
        scope: "settings",
        targetKind: "uri",
        targetPlaceholder: "ms-settings:startupapps",
        defaultTarget: "ms-settings:startupapps",
        commandPreview: "start ms-settings:startupapps",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows settings protocol available"],
        aliases: ["startup apps", "startup items", "startup programs", "launch at startup", "launch at sign in"],
        metadata: {
            systemSurface: "startupapps"
        }
    }),
    createDefinition({
        id: "open-storage-settings",
        title: "Open Storage Settings",
        description: "Open the Windows Storage settings page for disk-space triage.",
        kind: "open-settings",
        scope: "settings",
        targetKind: "uri",
        targetPlaceholder: "ms-settings:storage",
        defaultTarget: "ms-settings:storage",
        commandPreview: "start ms-settings:storage",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows settings protocol available"],
        aliases: ["storage settings", "disk space", "disk cleanup", "storage sense", "free up space"],
        metadata: {
            systemSurface: "storage"
        }
    }),
    createDefinition({
        id: "enable-dark-theme",
        title: "Open Theme Personalization",
        description: "Open the Windows personalization screen where theme colors can be changed.",
        kind: "open-settings",
        scope: "settings",
        targetKind: "uri",
        targetPlaceholder: "ms-settings:personalization-colors",
        defaultTarget: "ms-settings:personalization-colors",
        commandPreview: "start ms-settings:personalization-colors",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows settings protocol available"],
        aliases: ["dark theme", "personalization", "theme colors", "darker"],
        metadata: {
            systemSurface: "personalization-colors"
        }
    }),
    appSurfaceDefinition("open-task-manager", "Open Task Manager", "Open Task Manager for process inspection and manual task control.", "taskmgr", ["task manager", "taskmgr", "process manager", "end task"]),
    appSurfaceDefinition("open-control-panel", "Open Control Panel", "Open the classic Control Panel shell.", "control", ["control panel", "classic control panel", "control.exe"]),
    appSurfaceDefinition("open-services", "Open Services", "Open the Services management console.", "services.msc", ["services", "service manager", "services.msc"]),
    appSurfaceDefinition("open-device-manager", "Open Device Manager", "Open Device Manager for hardware inspection.", "devmgmt.msc", ["device manager", "devmgmt.msc"]),
    appSurfaceDefinition("open-event-viewer", "Open Event Viewer", "Open Event Viewer for system log inspection.", "eventvwr.msc", ["event viewer", "eventvwr.msc", "logs"]),
    appSurfaceDefinition("open-task-scheduler", "Open Task Scheduler", "Open Task Scheduler for scheduled task inspection.", "taskschd.msc", ["task scheduler", "taskschd.msc"]),
    appSurfaceDefinition("open-computer-management", "Open Computer Management", "Open the consolidated Computer Management console.", "compmgmt.msc", ["computer management", "compmgmt.msc"]),
    appSurfaceDefinition("open-registry-editor", "Open Registry Editor", "Open Registry Editor without making changes.", "regedit", ["registry editor", "regedit", "registry"]),
    createDefinition({
        id: "open-file-explorer",
        title: "Open File Explorer",
        description: "Open the Windows File Explorer shell.",
        kind: "launch-program",
        scope: "application",
        targetKind: "program",
        targetPlaceholder: "explorer",
        defaultTarget: "explorer",
        commandPreview: "spawn explorer",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Windows shell integration available"],
        aliases: [
            "open explorer",
            "open windows explorer",
            "open up explorer",
            "open file explorer",
            "file explorer",
            "windows explorer",
            "explorer exe",
            "explorer.exe"
        ],
        metadata: {
            systemSurface: "file-explorer"
        }
    }),
    createDefinition({
        id: "ui-click",
        title: "Click UI Element",
        description: "Click a visible UI control in the current foreground window.",
        kind: "ui-click",
        scope: "window",
        targetKind: "ui-element",
        targetPlaceholder: "UI element label or selector",
        defaultTarget: null,
        commandPreview: "click {target}",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Target window is visible", "UI automation host is available"],
        aliases: ["click", "press button", "select option", "choose item"]
    }),
    createDefinition({
        id: "ui-type",
        title: "Type Text Into UI",
        description: "Type text into a visible UI control in the current foreground window.",
        kind: "ui-type",
        scope: "window",
        targetKind: "ui-element",
        targetPlaceholder: "UI element label or selector",
        defaultTarget: null,
        commandPreview: "type {target} {args}",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Target window is visible", "UI automation host is available"],
        aliases: ["type", "enter text", "fill field", "search box"]
    }),
    createDefinition({
        id: "ui-hotkey",
        title: "Send Hotkeys",
        description: "Send a hotkey sequence to the active window or selected UI target.",
        kind: "ui-hotkey",
        scope: "window",
        targetKind: "window-title",
        targetPlaceholder: "Window title or app name",
        defaultTarget: null,
        commandPreview: "hotkey {args} -> {target}",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Target window is visible", "UI automation host is available"],
        aliases: ["hotkey", "keyboard shortcut", "press ctrl", "press alt", "press win"]
    }),
    createDefinition({
        id: "start-service",
        title: "Start Service",
        description: "Start a Windows service under governed approval.",
        kind: "start-service",
        scope: "system",
        targetKind: "service-name",
        targetPlaceholder: "Service name or display name",
        defaultTarget: null,
        commandPreview: "Start-Service {target}",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Service is installed", "Approval token recorded"],
        aliases: ["start service", "enable service", "launch service"]
    }),
    createDefinition({
        id: "stop-service",
        title: "Stop Service",
        description: "Stop a Windows service under governed approval.",
        kind: "stop-service",
        scope: "system",
        targetKind: "service-name",
        targetPlaceholder: "Service name or display name",
        defaultTarget: null,
        commandPreview: "Stop-Service {target}",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Service is installed", "Approval token recorded"],
        aliases: ["stop service", "disable service", "halt service"]
    }),
    createDefinition({
        id: "restart-service",
        title: "Restart Service",
        description: "Restart a Windows service under governed approval.",
        kind: "restart-service",
        scope: "system",
        targetKind: "service-name",
        targetPlaceholder: "Service name or display name",
        defaultTarget: null,
        commandPreview: "Restart-Service {target}",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Service is installed", "Approval token recorded"],
        aliases: ["restart service", "refresh service", "bounce service"]
    }),
    createDefinition({
        id: "set-registry-value",
        title: "Set Registry Value",
        description: "Set a Windows registry value under governed approval.",
        kind: "set-registry-value",
        scope: "system",
        targetKind: "registry-key",
        targetPlaceholder: "Registry key path",
        defaultTarget: null,
        commandPreview: "Set-ItemProperty {target} {args}",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Registry key exists or can be created", "Approval token recorded"],
        aliases: ["set registry", "change registry", "registry value", "edit registry value"]
    }),
    createDefinition({
        id: "delete-registry-value",
        title: "Delete Registry Value",
        description: "Delete a Windows registry value under governed approval.",
        kind: "delete-registry-value",
        scope: "system",
        targetKind: "registry-value",
        targetPlaceholder: "Registry key path",
        defaultTarget: null,
        commandPreview: "Remove-ItemProperty {target} {args}",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Registry value is known", "Approval token recorded"],
        aliases: ["delete registry value", "remove registry value", "clear registry value"]
    }),
    createDefinition({
        id: "launch-program",
        title: "Launch Program",
        description: "Launch a local executable or program alias.",
        kind: "launch-program",
        scope: "application",
        targetKind: "program",
        targetPlaceholder: "Executable path or app alias",
        defaultTarget: null,
        commandPreview: 'spawn {target}',
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Target program exists or is on PATH"],
        aliases: ["launch program", "start program", "run app", "open app"]
    }),
    createDefinition({
        id: "open-file",
        title: "Open File",
        description: "Open a file in its associated application.",
        kind: "open-file",
        scope: "file",
        targetKind: "path",
        targetPlaceholder: "File path",
        defaultTarget: null,
        commandPreview: 'start "" {target}',
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["File exists"],
        aliases: ["open file", "view file", "show file"]
    }),
    createDefinition({
        id: "open-folder",
        title: "Open Folder",
        description: "Open a folder in File Explorer.",
        kind: "open-folder",
        scope: "folder",
        targetKind: "directory",
        targetPlaceholder: "Folder path",
        defaultTarget: null,
        commandPreview: 'explorer {target}',
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Folder exists"],
        aliases: ["open folder", "open directory", "show folder"]
    }),
    createDefinition({
        id: "create-file",
        title: "Create File",
        description: "Create a file in the workspace or an approved path.",
        kind: "create-file",
        scope: "workspace",
        targetKind: "path",
        targetPlaceholder: "File path",
        defaultTarget: null,
        commandPreview: 'New-Item -ItemType File {target}',
        riskClass: "medium",
        approvalRequired: false,
        preconditions: ["Write access to the target location"],
        aliases: ["create file", "new file", "write file", "make file"]
    }),
    createDefinition({
        id: "create-folder",
        title: "Create Folder",
        description: "Create a folder in the workspace or an approved path.",
        kind: "create-folder",
        scope: "workspace",
        targetKind: "directory",
        targetPlaceholder: "Folder path",
        defaultTarget: null,
        commandPreview: 'New-Item -ItemType Directory {target}',
        riskClass: "medium",
        approvalRequired: false,
        preconditions: ["Write access to the target location"],
        aliases: ["create folder", "new folder", "make folder"]
    }),
    createDefinition({
        id: "rename-item",
        title: "Rename Item",
        description: "Rename a file or folder within the workspace or an approved path.",
        kind: "rename-item",
        scope: "workspace",
        targetKind: "path",
        targetPlaceholder: "Existing path",
        defaultTarget: null,
        commandPreview: 'Rename-Item {target} -NewName {destination}',
        riskClass: "medium",
        approvalRequired: false,
        preconditions: ["Source item exists", "Destination name is available"],
        aliases: ["rename", "rename file", "rename folder"]
    }),
    createDefinition({
        id: "move-item",
        title: "Move Item",
        description: "Move a file or folder to a new location.",
        kind: "move-item",
        scope: "workspace",
        targetKind: "path",
        targetPlaceholder: "Source path",
        defaultTarget: null,
        commandPreview: 'Move-Item {target} {destination}',
        riskClass: "medium",
        approvalRequired: false,
        preconditions: ["Source item exists", "Destination path is writable"],
        aliases: ["move", "move file", "move folder", "relocate"]
    }),
    createDefinition({
        id: "delete-file",
        title: "Delete File",
        description: "Delete a file from the workspace or an approved location.",
        kind: "delete-file",
        scope: "workspace",
        targetKind: "path",
        targetPlaceholder: "File path",
        defaultTarget: null,
        commandPreview: 'Remove-Item {target}',
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Exact target selected"],
        aliases: ["delete file", "remove file", "trash file"]
    }),
    createDefinition({
        id: "delete-folder",
        title: "Delete Folder",
        description: "Delete a folder from the workspace or an approved location.",
        kind: "delete-folder",
        scope: "workspace",
        targetKind: "directory",
        targetPlaceholder: "Folder path",
        defaultTarget: null,
        commandPreview: 'Remove-Item {target} -Recurse -Force',
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Exact target selected", "Contents reviewed"],
        aliases: ["delete folder", "remove folder", "trash folder"]
    }),
    createDefinition({
        id: "focus-window",
        title: "Focus Window",
        description: "Bring an existing window to the foreground by exact title or process match.",
        kind: "focus-window",
        scope: "window",
        targetKind: "window-title",
        targetPlaceholder: "Window title or app name",
        defaultTarget: null,
        commandPreview: 'Focus window {target}',
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Matching window is already open"],
        aliases: ["focus window", "bring to front", "switch to", "activate window", "show window"]
    }),
    createDefinition({
        id: "inspect-process",
        title: "Inspect Process",
        description: "Inspect an exact process ID without terminating it.",
        kind: "inspect-process",
        scope: "process",
        targetKind: "process-id",
        targetPlaceholder: "Exact PID",
        defaultTarget: null,
        commandPreview: "Get-Process -Id {target}",
        riskClass: "low",
        approvalRequired: false,
        preconditions: ["Exact PID known"],
        aliases: ["inspect process", "view process", "process details"]
    }),
    createDefinition({
        id: "terminate-process",
        title: "Terminate Process",
        description: "Terminate an exact process ID.",
        kind: "terminate-process",
        scope: "process",
        targetKind: "process-id",
        targetPlaceholder: "Exact PID",
        defaultTarget: null,
        commandPreview: "taskkill /PID {target} /T",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Exact PID known", "Unsaved work reviewed"],
        aliases: ["terminate process", "stop process", "kill process", "end process"]
    }),
    createDefinition({
        id: "close-chrome-graceful",
        title: "Close Chrome Gracefully",
        description: "Gracefully request Chrome to close before using stronger termination.",
        kind: "close-app",
        scope: "process",
        targetKind: "process-name",
        targetPlaceholder: "chrome.exe",
        defaultTarget: "chrome.exe",
        commandPreview: "Close chrome.exe gracefully",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Chrome is running", "Unsaved work is handled"],
        aliases: ["close chrome", "close browser", "graceful close chrome", "quit chrome"],
        metadata: {
            recommendedFallback: "terminate-process"
        }
    }),
    createDefinition({
        id: "close-app",
        title: "Close App Gracefully",
        description: "Request a running app or window to close gracefully and only fall back to termination if required.",
        kind: "close-app",
        scope: "process",
        targetKind: "process-name",
        targetPlaceholder: "App name, process name, or PID",
        defaultTarget: null,
        commandPreview: "Close {target} gracefully",
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Running app identified", "Unsaved work reviewed"],
        aliases: ["close app", "quit app", "close window", "quit program", "close browser", "gracefully close"]
    }),
    createDefinition({
        id: "uninstall-app",
        title: "Uninstall App",
        description: "Uninstall an installed Windows application using the registered uninstall command.",
        kind: "uninstall-app",
        scope: "system",
        targetKind: "installed-app",
        targetPlaceholder: "Installed app name",
        defaultTarget: null,
        commandPreview: 'Uninstall {target}',
        riskClass: "high",
        approvalRequired: true,
        preconditions: ["Exact installed app resolved", "User approval recorded"],
        aliases: ["uninstall app", "remove app", "remove chrome", "remove browser", "delete application"]
    })
];
const ACTION_MATCH_ORDER = WINDOWS_ACTION_CATALOG;
export const listWindowsActionDefinitions = () => ACTION_MATCH_ORDER.map((entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    preconditions: [...entry.preconditions]
}));
export const findWindowsActionDefinitionById = (id) => ACTION_MATCH_ORDER.find((entry) => entry.id === id) ?? null;
export const buildWindowsActionPreview = (action, overrides = {}) => makeCommandPreview(action, overrides.target, overrides.destinationTarget, overrides.args);
export const suggestWindowsActionFromPrompt = (prompt) => {
    const normalized = normalize(prompt);
    if (!normalized) {
        return null;
    }
    for (const action of ACTION_MATCH_ORDER) {
        if (action.aliases.some((alias) => normalized.includes(normalize(alias))) ||
            normalized.includes(normalize(action.title)) ||
            normalized.includes(normalize(action.id))) {
            return {
                ...action,
                aliases: [...action.aliases],
                preconditions: [...action.preconditions],
                commandPreview: buildWindowsActionPreview(action)
            };
        }
    }
    return null;
};
export const inferWindowsActionKinds = () => ({
    "launch-program": { scope: "application", targetKind: "program", riskClass: "low" },
    "focus-window": { scope: "window", targetKind: "window-title", riskClass: "low" },
    "open-file": { scope: "file", targetKind: "path", riskClass: "low" },
    "open-folder": { scope: "folder", targetKind: "directory", riskClass: "low" },
    "ui-click": { scope: "window", targetKind: "ui-element", riskClass: "low" },
    "ui-type": { scope: "window", targetKind: "ui-element", riskClass: "low" },
    "ui-hotkey": { scope: "window", targetKind: "window-title", riskClass: "low" },
    "create-file": { scope: "workspace", targetKind: "path", riskClass: "medium" },
    "create-folder": { scope: "workspace", targetKind: "directory", riskClass: "medium" },
    "rename-item": { scope: "workspace", targetKind: "path", riskClass: "medium" },
    "move-item": { scope: "workspace", targetKind: "path", riskClass: "medium" },
    "delete-file": { scope: "workspace", targetKind: "path", riskClass: "high" },
    "delete-folder": { scope: "workspace", targetKind: "directory", riskClass: "high" },
    "open-settings": { scope: "settings", targetKind: "uri", riskClass: "low" },
    "open-add-remove-programs": { scope: "settings", targetKind: "uri", riskClass: "low" },
    "open-startup-apps": { scope: "settings", targetKind: "uri", riskClass: "low" },
    "open-storage-settings": { scope: "settings", targetKind: "uri", riskClass: "low" },
    "open-control-panel": { scope: "control-panel", targetKind: "command", riskClass: "low" },
    "open-registry-editor": { scope: "settings", targetKind: "command", riskClass: "low" },
    "open-task-manager": { scope: "task-manager", targetKind: "command", riskClass: "low" },
    "inspect-process": { scope: "process", targetKind: "process-id", riskClass: "low" },
    "terminate-process": { scope: "process", targetKind: "process-id", riskClass: "high" },
    "close-app": { scope: "process", targetKind: "process-name", riskClass: "high" },
    "uninstall-app": { scope: "system", targetKind: "installed-app", riskClass: "high" },
    "start-service": { scope: "system", targetKind: "service-name", riskClass: "high" },
    "stop-service": { scope: "system", targetKind: "service-name", riskClass: "high" },
    "restart-service": { scope: "system", targetKind: "service-name", riskClass: "high" },
    "set-registry-value": { scope: "system", targetKind: "registry-key", riskClass: "high" },
    "delete-registry-value": { scope: "system", targetKind: "registry-value", riskClass: "high" }
});
