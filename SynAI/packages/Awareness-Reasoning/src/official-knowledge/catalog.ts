import type { OfficialKnowledgeSource } from "../contracts/awareness";

export const OFFICIAL_WINDOWS_ALLOWED_DOMAINS = [
  "learn.microsoft.com",
  "support.microsoft.com"
] as const;

export const CURATED_OFFICIAL_WINDOWS_SOURCES: OfficialKnowledgeSource[] = [
  {
    id: "windows-release-health",
    title: "Windows release health",
    url: "https://learn.microsoft.com/en-us/windows/release-health/",
    domain: "learn.microsoft.com",
    topic: "release-health",
    keywords: ["release health", "known issues", "windows issues", "windows build issues", "windows update problems"],
    aliases: ["known windows issue", "release notes issues"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "windows11-release-information",
    title: "Windows 11 release information",
    url: "https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information",
    domain: "learn.microsoft.com",
    topic: "release-information",
    keywords: ["windows 11 release information", "windows 11 build", "windows 11 version", "windows build"],
    aliases: ["windows 11 release", "windows 11 build info"],
    productTags: ["windows 11"],
    versionTags: ["windows 11"]
  },
  {
    id: "windows-whats-new",
    title: "What's new in Windows",
    url: "https://learn.microsoft.com/en-us/windows/whats-new/",
    domain: "learn.microsoft.com",
    topic: "whats-new",
    keywords: ["what's new in windows", "windows new features", "windows updates", "windows changes"],
    aliases: ["windows changelog", "windows features"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "launch-settings-uri",
    title: "Launch Windows Settings",
    url: "https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings",
    domain: "learn.microsoft.com",
    topic: "settings",
    keywords: ["ms-settings", "settings uri", "windows settings", "where is this setting", "open settings"],
    aliases: ["settings map", "settings launcher"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "windows-search-overview",
    title: "Windows Search overview",
    url: "https://learn.microsoft.com/en-us/windows/win32/search/windows-search",
    domain: "learn.microsoft.com",
    topic: "windows-search",
    keywords: ["windows search", "file search", "indexed search", "search index"],
    aliases: ["systemindex", "search service"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "windows-search-querying",
    title: "Querying process in Windows Search",
    url: "https://learn.microsoft.com/en-us/windows/win32/search/querying-process--windows-search-",
    domain: "learn.microsoft.com",
    topic: "windows-search-querying",
    keywords: ["windows search query", "aqs", "systemindex", "search query"],
    aliases: ["windows search sql"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "get-ciminstance",
    title: "Get-CimInstance",
    url: "https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance?view=powershell-7.6",
    domain: "learn.microsoft.com",
    topic: "powershell-cim",
    keywords: ["get-ciminstance", "cim", "wmi", "win32_process", "win32_service", "win32_logicaldisk"],
    aliases: ["wmi query", "cim query"],
    productTags: ["powershell", "windows"],
    versionTags: ["powershell 7"]
  },
  {
    id: "get-winevent",
    title: "Get-WinEvent",
    url: "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-7.5",
    domain: "learn.microsoft.com",
    topic: "event-logs",
    keywords: ["get-winevent", "event viewer", "event logs", "windows logs", "event id"],
    aliases: ["windows event logs"],
    productTags: ["powershell", "windows"],
    versionTags: ["powershell 7"]
  },
  {
    id: "get-counter",
    title: "Get-Counter",
    url: "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-counter?view=powershell-7.6",
    domain: "learn.microsoft.com",
    topic: "performance-counters",
    keywords: ["get-counter", "perf counters", "cpu usage", "ram usage", "disk usage", "gpu usage"],
    aliases: ["performance counter"],
    productTags: ["powershell", "windows"],
    versionTags: ["powershell 7"]
  },
  {
    id: "registry-provider",
    title: "about_Registry_Provider",
    url: "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_registry_provider?view=powershell-7.5",
    domain: "learn.microsoft.com",
    topic: "registry",
    keywords: ["registry", "registry provider", "registry path", "registry settings", "registry key"],
    aliases: ["powershell registry"],
    productTags: ["powershell", "windows"],
    versionTags: ["powershell 7"]
  },
  {
    id: "win32-process",
    title: "Win32_Process class",
    url: "https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process",
    domain: "learn.microsoft.com",
    topic: "processes",
    keywords: ["win32_process", "process class", "windows process", "process information"],
    aliases: ["process class"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "win32-service",
    title: "Win32_Service class",
    url: "https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-service",
    domain: "learn.microsoft.com",
    topic: "services",
    keywords: ["win32_service", "service class", "windows service", "service startup type"],
    aliases: ["service class"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "win32-logicaldisk",
    title: "Win32_LogicalDisk class",
    url: "https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-logicaldisk",
    domain: "learn.microsoft.com",
    topic: "storage",
    keywords: ["win32_logicaldisk", "disk space", "free space", "drive information", "logical disk"],
    aliases: ["drive free space"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "read-directory-changes",
    title: "ReadDirectoryChangesW",
    url: "https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-readdirectorychangesw",
    domain: "learn.microsoft.com",
    topic: "file-monitoring",
    keywords: ["readdirectorychangesw", "file watcher", "watch folder", "monitor file changes"],
    aliases: ["directory changes api"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "change-journal-identifier",
    title: "Using the Change Journal Identifier",
    url: "https://learn.microsoft.com/en-us/windows/win32/fileio/using-the-change-journal-identifier",
    domain: "learn.microsoft.com",
    topic: "usn-journal",
    keywords: ["usn journal", "change journal", "ntfs journal", "file change tracking"],
    aliases: ["usn", "ntfs change journal"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "fsutil-usn",
    title: "fsutil usn",
    url: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fsutil-usn",
    domain: "learn.microsoft.com",
    topic: "usn-journal",
    keywords: ["fsutil usn", "queryjournal", "readjournal", "usn commands"],
    aliases: ["usn command line"],
    productTags: ["windows", "windows server"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "uiautomation-overview",
    title: "UI Automation Overview",
    url: "https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview",
    domain: "learn.microsoft.com",
    topic: "ui-automation",
    keywords: ["ui automation", "window controls", "automation tree", "screen controls"],
    aliases: ["automation api"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "winget-overview",
    title: "WinGet",
    url: "https://learn.microsoft.com/en-us/windows/package-manager/winget/",
    domain: "learn.microsoft.com",
    topic: "packages",
    keywords: ["winget", "windows package manager", "installed apps", "package source"],
    aliases: ["package manager"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  },
  {
    id: "windows-update-support",
    title: "Windows Update support",
    url: "https://support.microsoft.com/en-us/windows/windows-update-faq-8af1f9d9-a7e8-4da7-8d12-31d177d3f4b0",
    domain: "support.microsoft.com",
    topic: "windows-update",
    keywords: ["windows update", "update faq", "update help", "how windows update works"],
    aliases: ["update support"],
    productTags: ["windows"],
    versionTags: ["windows 11", "windows 10"]
  }
];
