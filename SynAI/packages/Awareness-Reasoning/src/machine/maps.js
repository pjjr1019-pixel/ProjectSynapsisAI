import { createFreshnessMetadata } from "../context";
const SETTINGS_MAP_ENTRIES = [
    {
        category: "display",
        label: "Display",
        aliases: ["screen", "resolution", "monitor"],
        launchTarget: "ms-settings:display",
        relatedSettings: ["Scale and layout", "Multiple displays", "Night light"],
        description: "Screen resolution, scaling, and display layout."
    },
    {
        category: "sound",
        label: "Sound",
        aliases: ["audio", "volume", "speakers"],
        launchTarget: "ms-settings:sound",
        relatedSettings: ["Output", "Input", "Volume mixer"],
        description: "Audio devices, volume, and sound preferences."
    },
    {
        category: "personalization",
        label: "Personalization",
        aliases: ["theme", "wallpaper", "colors"],
        launchTarget: "ms-settings:personalization",
        relatedSettings: ["Background", "Colors", "Themes", "Lock screen"],
        description: "Desktop background, colors, lock screen, and themes."
    },
    {
        category: "taskbar",
        label: "Taskbar",
        aliases: ["task bar", "start menu", "system tray"],
        launchTarget: "ms-settings:taskbar",
        relatedSettings: ["Taskbar behaviors", "Pinned apps", "System tray icons"],
        description: "Taskbar layout, pinned apps, and tray behavior."
    },
    {
        category: "apps",
        label: "Installed apps",
        aliases: ["apps and features", "programs", "software"],
        launchTarget: "ms-settings:appsfeatures",
        relatedSettings: ["Installed apps", "Optional features", "Advanced app settings"],
        description: "Manage installed applications and app behavior."
    },
    {
        category: "startup",
        label: "Startup apps",
        aliases: ["startup", "startup apps", "boot apps", "launch on login", "open at login", "run at startup"],
        launchTarget: "ms-settings:startupapps",
        relatedSettings: ["Startup impact", "Login apps", "Background launchers"],
        description: "Apps allowed to start with Windows."
    },
    {
        category: "defaults",
        label: "Default apps",
        aliases: ["file associations", "default programs", "handlers"],
        launchTarget: "ms-settings:defaultapps",
        relatedSettings: ["Browser defaults", "File type associations", "Protocol handlers"],
        description: "Default file and protocol handlers."
    },
    {
        category: "bluetooth",
        label: "Bluetooth & devices",
        aliases: ["bluetooth", "bluetoth", "bluetooh", "devices", "peripherals", "paired devices"],
        launchTarget: "ms-settings:bluetooth",
        relatedSettings: ["Printers & scanners", "Mouse", "Touchpad"],
        description: "Bluetooth, paired devices, and peripheral settings."
    },
    {
        category: "windows-update",
        label: "Windows Update",
        aliases: ["update", "patching", "updates"],
        launchTarget: "ms-settings:windowsupdate",
        relatedSettings: ["Update history", "Advanced options", "Optional updates"],
        description: "Windows update and update history controls."
    },
    {
        category: "network",
        label: "Network & internet",
        aliases: ["network", "wifi", "ethernet", "vpn"],
        launchTarget: "ms-settings:network",
        relatedSettings: ["Wi-Fi", "Ethernet", "VPN", "Proxy"],
        description: "Network adapters, Wi-Fi, Ethernet, and VPN settings."
    },
    {
        category: "storage",
        label: "Storage",
        aliases: ["disk", "drives", "storage sense"],
        launchTarget: "ms-settings:storagesense",
        relatedSettings: ["Temporary files", "Storage Sense", "Advanced storage settings"],
        description: "Drive usage, cleanup, and Storage Sense."
    },
    {
        category: "accounts",
        label: "Accounts",
        aliases: ["user accounts", "sign in", "work or school"],
        launchTarget: "ms-settings:yourinfo",
        relatedSettings: ["Your info", "Email & accounts", "Family & other users"],
        description: "User account, sign-in, and family settings."
    },
    {
        category: "privacy-security",
        label: "Privacy & security",
        aliases: ["privacy", "security", "permissions"],
        launchTarget: "ms-settings:privacy",
        relatedSettings: ["App permissions", "Windows Security", "Diagnostics"],
        description: "Privacy permissions and security surfaces."
    },
    {
        category: "accessibility",
        label: "Accessibility",
        aliases: ["ease of access", "assistive", "accessibility"],
        launchTarget: "ms-settings:easeofaccess",
        relatedSettings: ["Text size", "Narrator", "Captions", "Mouse pointer"],
        description: "Accessibility and assistive technology controls."
    },
    {
        category: "power",
        label: "Power & battery",
        aliases: ["battery", "power", "sleep"],
        launchTarget: "ms-settings:powersleep",
        relatedSettings: ["Power mode", "Battery usage", "Sleep"],
        description: "Power, sleep, and battery behavior."
    }
];
const CONTROL_PANEL_ENTRIES = [
    {
        category: "system",
        label: "System",
        aliases: ["about", "device info"],
        launchTarget: "control.exe sysdm.cpl",
        relatedPanels: ["Advanced system settings", "Remote", "System protection"],
        description: "Classic system properties and device information."
    },
    {
        category: "programs",
        label: "Programs and Features",
        aliases: ["apps", "uninstall", "programs and features"],
        launchTarget: "control.exe appwiz.cpl",
        relatedPanels: ["Installed programs", "Windows features"],
        description: "Install, repair, and remove desktop programs."
    },
    {
        category: "services",
        label: "Services",
        aliases: ["service manager", "services", "services.msc", "background services"],
        launchTarget: "services.msc",
        relatedPanels: ["Background services", "Service startup"],
        description: "View and inspect Windows services."
    },
    {
        category: "device-manager",
        label: "Device Manager",
        aliases: ["devices", "drivers", "hardware"],
        launchTarget: "devmgmt.msc",
        relatedPanels: ["Hardware devices", "Driver updates"],
        description: "Hardware devices, drivers, and device status."
    },
    {
        category: "task-scheduler",
        label: "Task Scheduler",
        aliases: ["scheduled tasks", "startup tasks"],
        launchTarget: "taskschd.msc",
        relatedPanels: ["At startup tasks", "Logon tasks"],
        description: "Scheduled tasks and startup-triggered automation."
    },
    {
        category: "registry-editor",
        label: "Registry Editor",
        aliases: ["regedit", "registry"],
        launchTarget: "regedit.exe",
        relatedPanels: ["HKLM", "HKCU", "Policies"],
        description: "Read-only inspection of registry keys and values."
    },
    {
        category: "computer-management",
        label: "Computer Management",
        aliases: ["compmgmt", "management console"],
        launchTarget: "compmgmt.msc",
        relatedPanels: ["Disk Management", "Event Viewer", "Services"],
        description: "Administrative management console."
    },
    {
        category: "event-viewer",
        label: "Event Viewer",
        aliases: ["logs", "eventvwr"],
        launchTarget: "eventvwr.msc",
        relatedPanels: ["Application logs", "System logs"],
        description: "System and application event logs."
    },
    {
        category: "performance",
        label: "Performance Monitor",
        aliases: ["perfmon", "monitor"],
        launchTarget: "perfmon.exe",
        relatedPanels: ["Performance counters", "Data collector sets"],
        description: "Performance counters and analysis."
    },
    {
        category: "resource-monitor",
        label: "Resource Monitor",
        aliases: ["resmon", "resources"],
        launchTarget: "resmon.exe",
        relatedPanels: ["CPU", "Memory", "Disk", "Network"],
        description: "Live resource usage and per-process activity."
    }
];
const REGISTRY_ZONE_ENTRIES = [
    {
        category: "startup",
        hive: "HKCU/HKLM",
        path: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        aliases: ["run", "startup apps", "login items"],
        valueNames: ["startup commands", "per-user launchers"],
        notes: ["Per-user startup commands"]
    },
    {
        category: "startup",
        hive: "HKCU/HKLM",
        path: "\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        aliases: ["runonce", "first-run", "post-install"],
        valueNames: ["one-time startup commands"],
        notes: ["One-time launch commands after sign-in"]
    },
    {
        category: "uninstall-apps",
        hive: "HKLM/HKCU",
        path: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        aliases: ["uninstall", "apps", "programs and features"],
        valueNames: ["DisplayName", "DisplayVersion", "Publisher", "InstallLocation"],
        notes: ["Primary application uninstall metadata"]
    },
    {
        category: "uninstall-apps",
        hive: "HKLM",
        path: "\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        aliases: ["32-bit apps", "wow6432", "x86 apps"],
        valueNames: ["DisplayName", "DisplayVersion", "Publisher"],
        notes: ["32-bit application uninstall metadata"]
    },
    {
        category: "file-associations",
        hive: "HKCR/HKCU",
        path: "\\Software\\Classes",
        aliases: ["file associations", "protocols", "handlers"],
        valueNames: ["ProgId", "OpenWithList", "UserChoice"],
        notes: ["File type and protocol associations"]
    },
    {
        category: "personalization",
        hive: "HKCU",
        path: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes",
        aliases: ["theme", "wallpaper", "colors"],
        valueNames: ["CurrentTheme", "Wallpaper", "ColorPrevalence"],
        notes: ["Theme and color preferences"]
    },
    {
        category: "services",
        hive: "HKLM",
        path: "\\SYSTEM\\CurrentControlSet\\Services",
        aliases: ["service", "drivers", "startup type"],
        valueNames: ["ImagePath", "Start", "Type", "ObjectName"],
        notes: ["Service and driver configuration"]
    },
    {
        category: "policies",
        hive: "HKCU/HKLM",
        path: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies",
        aliases: ["policy", "group policy", "restrictions"],
        valueNames: ["Explorer", "System", "Attachments"],
        notes: ["Policy-controlled user and shell behavior"]
    },
    {
        category: "shell-behavior",
        hive: "HKCU/HKLM",
        path: "\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon",
        aliases: ["shell", "logon", "explorer"],
        valueNames: ["Shell", "Userinit", "AutoAdminLogon"],
        notes: ["Windows shell and logon behavior"]
    },
    {
        category: "user-preferences",
        hive: "HKCU",
        path: "\\Control Panel",
        aliases: ["ui preferences", "mouse", "keyboard", "desktop"],
        valueNames: ["MouseSpeed", "Wallpaper", "Sound"],
        notes: ["User preference and control panel data"]
    },
    {
        category: "diagnostics",
        hive: "HKLM/HKCU",
        path: "\\Software\\Microsoft\\Windows\\Windows Error Reporting",
        aliases: ["wer", "crash reporting", "diagnostics"],
        valueNames: ["Disabled", "DontShowUI", "LoggingDisabled"],
        notes: ["Crash reporting and diagnostic behavior"]
    }
];
const nowFreshness = (capturedAt, now) => createFreshnessMetadata(capturedAt, capturedAt, now);
const cloneSettingsEntry = (entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    relatedSettings: [...entry.relatedSettings]
});
const cloneControlPanelEntry = (entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    relatedPanels: [...entry.relatedPanels]
});
const cloneRegistryZoneEntry = (entry) => ({
    ...entry,
    aliases: [...entry.aliases],
    valueNames: [...entry.valueNames],
    notes: [...entry.notes]
});
const normalizeQuery = (query) => query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const entryMatchScore = (haystack, query) => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
        return 0;
    }
    const normalizedHaystack = normalizeQuery(haystack);
    if (!normalizedHaystack) {
        return 0;
    }
    if (normalizedHaystack === normalizedQuery) {
        return 100;
    }
    if (normalizedHaystack.includes(normalizedQuery)) {
        return 50 + normalizedQuery.length;
    }
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const tokenHits = queryTokens.filter((token) => normalizedHaystack.includes(token)).length;
    return tokenHits;
};
const pickBestEntries = (query, entries, scorer) => [...entries]
    .map((entry) => ({ entry, score: scorer(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
const findExactEntry = (query, entries, termsForEntry) => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
        return null;
    }
    return (entries.find((entry) => termsForEntry(entry).some((term) => {
        const normalizedTerm = normalizeQuery(term);
        return normalizedTerm.length > 0 && normalizedQuery.includes(normalizedTerm);
    })) ?? null);
};
const scoreSettingsEntry = (entry, query) => entryMatchScore([entry.category, entry.label, ...entry.aliases, entry.launchTarget, ...entry.relatedSettings, entry.description].join(" "), query);
const scoreControlPanelEntry = (entry, query) => entryMatchScore([entry.category, entry.label, ...entry.aliases, entry.launchTarget, ...entry.relatedPanels, entry.description].join(" "), query);
const scoreRegistryZoneEntry = (entry, query) => entryMatchScore([entry.category, entry.hive, entry.path, ...entry.aliases, ...entry.valueNames, ...entry.notes].join(" "), query);
export const buildSettingsMap = (now = new Date()) => {
    const capturedAt = now.toISOString();
    return {
        capturedAt,
        freshness: nowFreshness(capturedAt, now),
        entries: SETTINGS_MAP_ENTRIES.map(cloneSettingsEntry)
    };
};
export const buildControlPanelMap = (now = new Date()) => {
    const capturedAt = now.toISOString();
    return {
        capturedAt,
        freshness: nowFreshness(capturedAt, now),
        entries: CONTROL_PANEL_ENTRIES.map(cloneControlPanelEntry)
    };
};
export const buildRegistryZoneMap = (now = new Date()) => {
    const capturedAt = now.toISOString();
    return {
        capturedAt,
        freshness: nowFreshness(capturedAt, now),
        zones: REGISTRY_ZONE_ENTRIES.map(cloneRegistryZoneEntry)
    };
};
export const findSettingsMapEntry = (query) => findExactEntry(query, SETTINGS_MAP_ENTRIES, (entry) => [entry.label, entry.category, ...entry.aliases]) ??
    pickBestEntries(query, SETTINGS_MAP_ENTRIES, scoreSettingsEntry)[0] ??
    null;
export const findControlPanelEntry = (query) => findExactEntry(query, CONTROL_PANEL_ENTRIES, (entry) => [entry.label, entry.category, ...entry.aliases]) ??
    pickBestEntries(query, CONTROL_PANEL_ENTRIES, scoreControlPanelEntry)[0] ??
    null;
export const findRegistryZoneEntry = (query) => findExactEntry(query, REGISTRY_ZONE_ENTRIES, (entry) => [entry.category, entry.hive, entry.path, ...entry.aliases]) ??
    pickBestEntries(query, REGISTRY_ZONE_ENTRIES, scoreRegistryZoneEntry)[0] ??
    null;
export const searchSettingsMapEntries = (query, limit = 3) => pickBestEntries(query, SETTINGS_MAP_ENTRIES, scoreSettingsEntry)
    .slice(0, limit)
    .map(cloneSettingsEntry);
export const searchControlPanelEntries = (query, limit = 3) => pickBestEntries(query, CONTROL_PANEL_ENTRIES, scoreControlPanelEntry)
    .slice(0, limit)
    .map(cloneControlPanelEntry);
export const searchRegistryZoneEntries = (query, limit = 3) => pickBestEntries(query, REGISTRY_ZONE_ENTRIES, scoreRegistryZoneEntry)
    .slice(0, limit)
    .map(cloneRegistryZoneEntry);
export const toMapSummary = (entry) => `${entry.label} -> ${entry.launchTarget}`;
export const toControlPanelSummary = (entry) => `${entry.label} -> ${entry.launchTarget}`;
export const toRegistryZoneSummary = (entry) => `${entry.category}: ${entry.hive}${entry.path}`;
