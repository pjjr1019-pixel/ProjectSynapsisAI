import { spawnSync } from "node:child_process";
import * as os from "node:os";
import type {
  InstalledAppsSnapshot,
  ProcessSnapshot,
  ServiceSnapshot,
  StartupSnapshot,
  SystemIdentity
} from "../../../contracts/src/awareness";
import type { MachineInventorySource } from "./index";

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

const runPowerShellJson = <T>(script: string): T | null => {
  if (process.platform !== "win32") {
    return null;
  }

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  if (result.status !== 0) {
    return null;
  }

  const output = (result.stdout ?? "").replace(/^\uFEFF/, "").trim();
  if (!output) {
    return null;
  }

  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const single = toStringOrNull(value);
    return single ? [single] : [];
  }

  return value.map((item) => toStringOrNull(item)).filter((item): item is string => Boolean(item));
};

const ensureArray = <T>(value: T[] | T | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
};

const buildNodeIdentityFallback = (): SystemIdentity => {
  const now = new Date();
  const currentUser = os.userInfo().username;
  const totalBytes = os.totalmem();
  const uptimeSeconds = Math.max(0, Math.floor(os.uptime()));

  return {
    capturedAt: now.toISOString(),
    freshness: {
      capturedAt: now.toISOString(),
      generatedAt: now.toISOString(),
      observedAt: now.toISOString(),
      ageMs: 0,
      staleAfterMs: FRESHNESS_WINDOW_MS,
      isFresh: true
    },
    machineName: os.hostname(),
    windowsEdition: null,
    windowsVersion: os.version(),
    windowsBuild: os.release(),
    architecture: os.arch(),
    currentUser,
    uptimeSeconds,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown",
    localTime: now.toString(),
    hardware: {
      capturedAt: now.toISOString(),
      freshness: {
        capturedAt: now.toISOString(),
        generatedAt: now.toISOString(),
        observedAt: now.toISOString(),
        ageMs: 0,
        staleAfterMs: FRESHNESS_WINDOW_MS,
        isFresh: true
      },
      drives: [],
      memory: {
        totalBytes,
        availableBytes: null,
        freeBytes: null
      },
      cpu: {
        name: os.cpus()[0]?.model ?? "unknown",
        manufacturer: null,
        architecture: os.arch(),
        cores: os.cpus().length,
        logicalCores: os.cpus().length,
        speedMHz: os.cpus()[0]?.speed ?? null
      },
      gpus: [],
      networkAdapters: Object.entries(os.networkInterfaces())
        .map(([name, interfaces]) => ({
          name,
          description: null,
          macAddress: interfaces.find((item) => item.mac && item.mac !== "00:00:00:00:00:00")?.mac ?? null,
          ipAddresses: interfaces.map((item) => item.address).filter(Boolean),
          status: interfaces.some((item) => !item.internal) ? "up" : "unknown"
        }))
        .filter((adapter) => adapter.ipAddresses.length > 0 || adapter.macAddress !== null),
      displays: []
    }
  };
};

const buildFreshness = (capturedAt: string): SystemIdentity["freshness"] => ({
  capturedAt,
  generatedAt: capturedAt,
  observedAt: capturedAt,
  ageMs: 0,
  staleAfterMs: FRESHNESS_WINDOW_MS,
  isFresh: true
});

const processScript = `
$processDetails = @{}
Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
  $processDetails[$_.Id] = [PSCustomObject]@{
    cpuSeconds = if ($_.CPU -ne $null) { [double]$_.CPU } else { $null }
    publisher = if ($_.Company) { [string]$_.Company } else { $null }
    windowTitle = if ($_.MainWindowTitle) { [string]$_.MainWindowTitle } else { $null }
  }
}
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $detail = $processDetails[$_.ProcessId]
  [PSCustomObject]@{
    pid = [int]$_.ProcessId
    parentPid = if ($_.ParentProcessId -ne $null) { [int]$_.ParentProcessId } else { $null }
    name = [string]$_.Name
    executablePath = if ($_.ExecutablePath) { [string]$_.ExecutablePath } else { $null }
    commandLine = if ($_.CommandLine) { [string]$_.CommandLine } else { $null }
    cpuSeconds = if ($detail) { $detail.cpuSeconds } else { $null }
    memoryBytes = if ($_.WorkingSetSize -ne $null) { [int64]$_.WorkingSetSize } else { $null }
    ioReadBytes = if ($_.ReadTransferCount -ne $null) { [int64]$_.ReadTransferCount } else { $null }
    ioWriteBytes = if ($_.WriteTransferCount -ne $null) { [int64]$_.WriteTransferCount } else { $null }
    startTime = if ($_.CreationDate) { [System.Management.ManagementDateTimeConverter]::ToDateTime($_.CreationDate).ToString('o') } else { $null }
    signer = $null
    publisher = if ($detail) { $detail.publisher } else { $null }
    windowTitle = if ($detail) { $detail.windowTitle } else { $null }
  }
}
`;

const serviceScript = `
Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{
    serviceName = [string]$_.Name
    displayName = if ($_.DisplayName) { [string]$_.DisplayName } else { [string]$_.Name }
    state = [string]$_.State
    startupType = if ($_.StartMode) { [string]$_.StartMode } else { $null }
    executablePath = if ($_.PathName) { [string]$_.PathName } else { $null }
    dependentServices = @()
    linkedProcessId = if ($_.ProcessId -ne $null -and $_.ProcessId -ne 0) { [int]$_.ProcessId } else { $null }
    account = if ($_.StartName) { [string]$_.StartName } else { $null }
  }
}
`;

const startupScript = `
$folderEntries = @()
$startupFolders = @(
  (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\Startup'),
  (Join-Path $env:ProgramData 'Microsoft\\Windows\\Start Menu\\Programs\\Startup')
)
$wsh = $null
try {
  $wsh = New-Object -ComObject WScript.Shell
} catch {
  $wsh = $null
}
foreach ($folder in $startupFolders) {
  if (Test-Path $folder) {
    Get-ChildItem -Path $folder -File -ErrorAction SilentlyContinue | ForEach-Object {
      $target = $null
      $command = $null
      if ($wsh -ne $null -and $_.Extension -ieq '.lnk') {
        try {
          $shortcut = $wsh.CreateShortcut($_.FullName)
          $target = if ($shortcut.TargetPath) { [string]$shortcut.TargetPath } else { $null }
          $command = if ($shortcut.Arguments) { [string]$shortcut.Arguments } else { $null }
        } catch {
          $target = $null
          $command = $null
        }
      }
      $folderEntries += [PSCustomObject]@{
        name = [string]$_.BaseName
        source = 'startup-folder'
        location = [string]$_.FullName
        command = $command
        target = $target
        processId = $null
        linkedAppName = $null
      }
    }
  }
}

$registryEntries = @()
$registryKeys = @(
  @{ path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; source = 'run' },
  @{ path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce'; source = 'runonce' },
  @{ path = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; source = 'run' },
  @{ path = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce'; source = 'runonce' }
)
foreach ($registryKey in $registryKeys) {
  if (Test-Path $registryKey.path) {
    $item = Get-ItemProperty -Path $registryKey.path -ErrorAction SilentlyContinue
    if ($item -ne $null) {
      $item.PSObject.Properties | Where-Object { $_.MemberType -eq 'NoteProperty' } | ForEach-Object {
        $registryEntries += [PSCustomObject]@{
          name = [string]$_.Name
          source = [string]$registryKey.source
          location = [string]$registryKey.path
          command = if ($_.Value) { [string]$_.Value } else { $null }
          target = $null
          processId = $null
          linkedAppName = $null
        }
      }
    }
  }
}

$scheduledTaskEntries = @()
try {
  $taskRows = schtasks /query /fo csv /v 2>$null | ConvertFrom-Csv
  foreach ($row in $taskRows) {
    $scheduleType = if ($row.'Schedule Type') { [string]$row.'Schedule Type' } else { '' }
    if ($scheduleType -match 'At logon|At startup') {
      $scheduledTaskEntries += [PSCustomObject]@{
        name = if ($row.'TaskName') { [string]$row.'TaskName' } else { [string]$row.'HostName' }
        source = 'scheduled-task'
        location = if ($row.'Task To Run') { [string]$row.'Task To Run' } else { $null }
        command = if ($row.'Task To Run') { [string]$row.'Task To Run' } else { $null }
        target = if ($row.'Run As User') { [string]$row.'Run As User' } else { $null }
        processId = $null
        linkedAppName = $null
      }
    }
  }
} catch {
  $scheduledTaskEntries = @()
}

[PSCustomObject]@{
  folderEntries = $folderEntries
  registryEntries = $registryEntries
  scheduledTaskEntries = $scheduledTaskEntries
}
`;

const installedAppsScript = `
$roots = @(
  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
)
$apps = @()
foreach ($root in $roots) {
  if (Test-Path $root) {
    Get-ChildItem -Path $root -ErrorAction SilentlyContinue | ForEach-Object {
      $item = Get-ItemProperty -Path $_.PSPath -ErrorAction SilentlyContinue
      if ($item -ne $null -and $item.DisplayName) {
        $apps += [PSCustomObject]@{
          name = [string]$item.DisplayName
          publisher = if ($item.Publisher) { [string]$item.Publisher } else { $null }
          version = if ($item.DisplayVersion) { [string]$item.DisplayVersion } else { $null }
          installLocation = if ($item.InstallLocation) { [string]$item.InstallLocation } else { $null }
          installDate = if ($item.InstallDate) { [string]$item.InstallDate } else { $null }
          uninstallCommand = if ($item.UninstallString) { [string]$item.UninstallString } else { $null }
          quietUninstallCommand = if ($item.QuietUninstallString) { [string]$item.QuietUninstallString } else { $null }
          displayIcon = if ($item.DisplayIcon) { [string]$item.DisplayIcon } else { $null }
          estimatedSizeKb = if ($item.EstimatedSize -ne $null) { [int]$item.EstimatedSize } else { $null }
          sources = @([string]$root)
        }
      }
    }
  }
}
$apps
`;

const mapDrive = (drive: {
  DeviceID?: string;
  VolumeName?: string;
  FileSystem?: string;
  Size?: number | string;
  FreeSpace?: number | string;
  DriveType?: number | string;
}): SystemIdentity["hardware"]["drives"][number] => ({
  deviceId: toStringOrNull(drive.DeviceID) ?? "unknown",
  volumeLabel: toStringOrNull(drive.VolumeName),
  fileSystem: toStringOrNull(drive.FileSystem),
  totalBytes: toNumberOrNull(drive.Size),
  freeBytes: toNumberOrNull(drive.FreeSpace),
  driveType: toStringOrNull(drive.DriveType)
});

const mapProcess = (process: {
  pid?: number | string;
  parentPid?: number | string | null;
  name?: string;
  executablePath?: string | null;
  commandLine?: string | null;
  cpuSeconds?: number | string | null;
  memoryBytes?: number | string | null;
  ioReadBytes?: number | string | null;
  ioWriteBytes?: number | string | null;
  startTime?: string | null;
  signer?: string | null;
  publisher?: string | null;
  windowTitle?: string | null;
}): ProcessSnapshot["processes"][number] => ({
  pid: Number(process.pid ?? 0),
  parentPid: process.parentPid == null ? null : Number(process.parentPid),
  name: toStringOrNull(process.name) ?? "unknown",
  executablePath: toStringOrNull(process.executablePath),
  commandLine: toStringOrNull(process.commandLine),
  cpuSeconds: toNumberOrNull(process.cpuSeconds),
  memoryBytes: toNumberOrNull(process.memoryBytes),
  ioReadBytes: toNumberOrNull(process.ioReadBytes),
  ioWriteBytes: toNumberOrNull(process.ioWriteBytes),
  startTime: toStringOrNull(process.startTime),
  signer: toStringOrNull(process.signer),
  publisher: toStringOrNull(process.publisher),
  windowTitle: toStringOrNull(process.windowTitle)
});

const mapService = (service: {
  serviceName?: string;
  displayName?: string;
  state?: string;
  startupType?: string | null;
  executablePath?: string | null;
  dependentServices?: string[] | null;
  linkedProcessId?: number | string | null;
  account?: string | null;
}): ServiceSnapshot["services"][number] => ({
  serviceName: toStringOrNull(service.serviceName) ?? "unknown",
  displayName: toStringOrNull(service.displayName) ?? toStringOrNull(service.serviceName) ?? "unknown",
  state: toStringOrNull(service.state) ?? "unknown",
  startupType: toStringOrNull(service.startupType) ?? "unknown",
  executablePath: toStringOrNull(service.executablePath),
  dependentServices: toStringArray(service.dependentServices),
  linkedProcessId: service.linkedProcessId == null ? null : Number(service.linkedProcessId),
  account: toStringOrNull(service.account)
});

const mapStartupEntry = (entry: {
  name?: string;
  source?: string;
  location?: string;
  command?: string | null;
  target?: string | null;
  processId?: number | string | null;
  linkedAppName?: string | null;
}): StartupSnapshot["folderEntries"][number] => ({
  name: toStringOrNull(entry.name) ?? "unknown",
  source:
    entry.source === "run" || entry.source === "runonce" || entry.source === "scheduled-task" || entry.source === "launcher-hint"
      ? entry.source
      : "startup-folder",
  location: toStringOrNull(entry.location) ?? "",
  command: toStringOrNull(entry.command),
  target: toStringOrNull(entry.target),
  processId: entry.processId == null ? null : Number(entry.processId),
  linkedAppName: toStringOrNull(entry.linkedAppName)
});

const mapInstalledApp = (app: {
  name?: string;
  publisher?: string | null;
  version?: string | null;
  installLocation?: string | null;
  installDate?: string | null;
  uninstallCommand?: string | null;
  quietUninstallCommand?: string | null;
  displayIcon?: string | null;
  estimatedSizeKb?: number | string | null;
  sources?: string[] | string | null;
}): InstalledAppsSnapshot["apps"][number] => ({
  name: toStringOrNull(app.name) ?? "unknown",
  publisher: toStringOrNull(app.publisher),
  version: toStringOrNull(app.version),
  installLocation: toStringOrNull(app.installLocation),
  installDate: toStringOrNull(app.installDate),
  uninstallCommand: toStringOrNull(app.uninstallCommand),
  quietUninstallCommand: toStringOrNull(app.quietUninstallCommand),
  displayIcon: toStringOrNull(app.displayIcon),
  estimatedSizeKb: toNumberOrNull(app.estimatedSizeKb),
  sources: Array.isArray(app.sources)
    ? app.sources.map((value) => toStringOrNull(value)).filter((item): item is string => Boolean(item))
    : toStringArray(app.sources),
  associatedProcessIds: [],
  associatedProcessNames: [],
  startupReferences: []
});

const captureSystemIdentity = async (): Promise<SystemIdentity> => {
  const now = new Date();
  const fallback = buildNodeIdentityFallback();
  const identity = runPowerShellJson<{
    machineName?: string;
    windowsEdition?: string | null;
    windowsVersion?: string | null;
    windowsBuild?: string | null;
    architecture?: string | null;
    currentUser?: string | null;
    uptimeSeconds?: number | string | null;
    timezone?: string | null;
    localTime?: string | null;
    hardware?: {
      drives?: Array<{
        DeviceID?: string;
        VolumeName?: string;
        FileSystem?: string;
        Size?: number | string;
        FreeSpace?: number | string;
        DriveType?: number | string;
      }>;
      memory?: {
        totalBytes?: number | string | null;
        availableBytes?: number | string | null;
        freeBytes?: number | string | null;
      };
      cpu?: {
        name?: string;
        manufacturer?: string | null;
        architecture?: string | null;
        cores?: number | string | null;
        logicalCores?: number | string | null;
        speedMHz?: number | string | null;
      };
      gpus?: Array<{
        name?: string;
        driverVersion?: string | null;
        memoryBytes?: number | string | null;
        resolution?: string | null;
      }>;
      networkAdapters?: Array<{
        name?: string;
        description?: string | null;
        macAddress?: string | null;
        ipAddresses?: string[] | string | null;
        status?: string | null;
      }>;
      displays?: Array<{
        name?: string;
        width?: number | string | null;
        height?: number | string | null;
        refreshRateHz?: number | string | null;
        primary?: boolean | string | null;
      }>;
    };
  }>(`
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$computer = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
$drives = Get-CimInstance Win32_LogicalDisk -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{
    DeviceID = $_.DeviceID
    VolumeName = $_.VolumeName
    FileSystem = $_.FileSystem
    Size = $_.Size
    FreeSpace = $_.FreeSpace
    DriveType = $_.DriveType
  }
}
$gpus = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
  $resolution = $null
  if ($_.CurrentHorizontalResolution -and $_.CurrentVerticalResolution) {
    $resolution = "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution)"
  }
  [PSCustomObject]@{
    name = $_.Name
    driverVersion = $_.DriverVersion
    memoryBytes = $_.AdapterRAM
    resolution = $resolution
  }
}
$networkAdapters = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPEnabled } | ForEach-Object {
  [PSCustomObject]@{
    name = $_.Description
    description = $_.Description
    macAddress = $_.MACAddress
    ipAddresses = @($_.IPAddress)
    status = if ($_.DHCPEnabled -eq $true) { 'up' } else { 'unknown' }
  }
}
$displays = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
  [PSCustomObject]@{
    name = $_.Name
    width = $_.CurrentHorizontalResolution
    height = $_.CurrentVerticalResolution
    refreshRateHz = $_.CurrentRefreshRate
    primary = $true
  }
}
[PSCustomObject]@{
  machineName = if ($os.CSName) { $os.CSName } elseif ($computer.Name) { $computer.Name } else { $env:COMPUTERNAME }
  windowsEdition = if ($os.Caption) { $os.Caption } else { $null }
  windowsVersion = if ($os.Version) { $os.Version } else { $null }
  windowsBuild = if ($os.BuildNumber) { $os.BuildNumber } else { $os.CurrentBuild }
  architecture = if ($os.OSArchitecture) { $os.OSArchitecture } else { $env:PROCESSOR_ARCHITECTURE }
  currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  uptimeSeconds = if ($os.LastBootUpTime) { [math]::Round(((Get-Date) - [System.Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)).TotalSeconds) } else { [math]::Round((New-TimeSpan -Start (Get-Date)).TotalSeconds) }
  timezone = [TimeZoneInfo]::Local.Id
  localTime = (Get-Date).ToString('o')
  hardware = [PSCustomObject]@{
    drives = $drives
    memory = [PSCustomObject]@{
      totalBytes = if ($computer.TotalPhysicalMemory) { [int64]$computer.TotalPhysicalMemory } else { $null }
      availableBytes = if ($os.FreePhysicalMemory) { [int64]($os.FreePhysicalMemory * 1KB) } else { $null }
      freeBytes = if ($os.FreePhysicalMemory) { [int64]($os.FreePhysicalMemory * 1KB) } else { $null }
    }
    cpu = [PSCustomObject]@{
      name = if ($cpu.Name) { $cpu.Name } else { 'unknown' }
      manufacturer = if ($cpu.Manufacturer) { $cpu.Manufacturer } else { $null }
      architecture = if ($os.OSArchitecture) { $os.OSArchitecture } else { $env:PROCESSOR_ARCHITECTURE }
      cores = if ($cpu.NumberOfCores) { [int]$cpu.NumberOfCores } else { 0 }
      logicalCores = if ($cpu.NumberOfLogicalProcessors) { [int]$cpu.NumberOfLogicalProcessors } else { 0 }
      speedMHz = if ($cpu.MaxClockSpeed) { [int]$cpu.MaxClockSpeed } else { $null }
    }
    gpus = $gpus
    networkAdapters = $networkAdapters
    displays = $displays
  }
} | ConvertTo-Json -Depth 8
`);

  if (!identity) {
    return fallback;
  }

  return {
    capturedAt: now.toISOString(),
    freshness: buildFreshness(now.toISOString()),
    machineName: toStringOrNull(identity.machineName) ?? fallback.machineName,
    windowsEdition: toStringOrNull(identity.windowsEdition),
    windowsVersion: toStringOrNull(identity.windowsVersion) ?? fallback.windowsVersion,
    windowsBuild: toStringOrNull(identity.windowsBuild) ?? fallback.windowsBuild,
    architecture: toStringOrNull(identity.architecture) ?? fallback.architecture,
    currentUser: toStringOrNull(identity.currentUser) ?? fallback.currentUser,
    uptimeSeconds: toNumberOrNull(identity.uptimeSeconds) ?? fallback.uptimeSeconds,
    timezone: toStringOrNull(identity.timezone) ?? fallback.timezone,
    localTime: toStringOrNull(identity.localTime) ?? fallback.localTime,
    hardware: {
      capturedAt: now.toISOString(),
      freshness: buildFreshness(now.toISOString()),
      drives: ensureArray(identity.hardware?.drives).map(mapDrive),
      memory: {
        totalBytes:
          toNumberOrNull(identity.hardware?.memory?.totalBytes) ??
          fallback.hardware.memory.totalBytes,
        availableBytes:
          toNumberOrNull(identity.hardware?.memory?.availableBytes) ??
          fallback.hardware.memory.availableBytes,
        freeBytes:
          toNumberOrNull(identity.hardware?.memory?.freeBytes) ?? fallback.hardware.memory.freeBytes
      },
      cpu: {
        name: toStringOrNull(identity.hardware?.cpu?.name) ?? fallback.hardware.cpu.name,
        manufacturer: toStringOrNull(identity.hardware?.cpu?.manufacturer),
        architecture: toStringOrNull(identity.hardware?.cpu?.architecture) ?? fallback.hardware.cpu.architecture,
        cores: toNumberOrNull(identity.hardware?.cpu?.cores) ?? fallback.hardware.cpu.cores,
        logicalCores:
          toNumberOrNull(identity.hardware?.cpu?.logicalCores) ?? fallback.hardware.cpu.logicalCores,
        speedMHz: toNumberOrNull(identity.hardware?.cpu?.speedMHz) ?? fallback.hardware.cpu.speedMHz
      },
      gpus: ensureArray(identity.hardware?.gpus).map((gpu) => ({
            name: toStringOrNull(gpu.name) ?? "unknown",
            driverVersion: toStringOrNull(gpu.driverVersion),
            memoryBytes: toNumberOrNull(gpu.memoryBytes),
            resolution: toStringOrNull(gpu.resolution)
          })),
      networkAdapters: ensureArray(identity.hardware?.networkAdapters).map((adapter) => ({
            name: toStringOrNull(adapter.name) ?? "unknown",
            description: toStringOrNull(adapter.description),
            macAddress: toStringOrNull(adapter.macAddress),
            ipAddresses: toStringArray(adapter.ipAddresses),
            status: toStringOrNull(adapter.status)
          })),
      displays: ensureArray(identity.hardware?.displays).map((display) => ({
            name: toStringOrNull(display.name) ?? "unknown",
            width: toNumberOrNull(display.width),
            height: toNumberOrNull(display.height),
            refreshRateHz: toNumberOrNull(display.refreshRateHz),
            primary: Boolean(display.primary)
          }))
    }
  };
};

const captureProcesses = async (): Promise<ProcessSnapshot> => {
  const capturedAt = new Date().toISOString();
  const raw = runPowerShellJson<Array<Record<string, unknown>>>(processScript);
  const processes = ensureArray(raw).map(mapProcess);

  return {
    capturedAt,
    freshness: buildFreshness(capturedAt),
    totalCount: processes.length,
    isTruncated: false,
    processes
  };
};

const captureServices = async (): Promise<ServiceSnapshot> => {
  const capturedAt = new Date().toISOString();
  const raw = runPowerShellJson<Array<Record<string, unknown>>>(serviceScript);
  const services = ensureArray(raw).map(mapService);

  return {
    capturedAt,
    freshness: buildFreshness(capturedAt),
    totalCount: services.length,
    isTruncated: false,
    services
  };
};

const captureStartup = async (): Promise<StartupSnapshot> => {
  const capturedAt = new Date().toISOString();
  const raw = runPowerShellJson<{
    folderEntries?: Array<Record<string, unknown>>;
    registryEntries?: Array<Record<string, unknown>>;
    scheduledTaskEntries?: Array<Record<string, unknown>>;
  }>(startupScript);

  const folderEntries = ensureArray(raw?.folderEntries).map(mapStartupEntry);
  const registryEntries = ensureArray(raw?.registryEntries).map(mapStartupEntry);
  const scheduledTaskEntries = ensureArray(raw?.scheduledTaskEntries).map(mapStartupEntry);
  const launcherHints = [...folderEntries, ...registryEntries, ...scheduledTaskEntries].map((entry) => ({
    ...entry,
    source: "launcher-hint" as const,
    linkedAppName: entry.linkedAppName ?? entry.name
  }));

  return {
    capturedAt,
    freshness: buildFreshness(capturedAt),
    totalCount: folderEntries.length + registryEntries.length + scheduledTaskEntries.length,
    folderEntries,
    registryEntries,
    scheduledTaskEntries,
    launcherHints
  };
};

const captureInstalledApps = async (): Promise<InstalledAppsSnapshot> => {
  const capturedAt = new Date().toISOString();
  const raw = runPowerShellJson<Array<Record<string, unknown>>>(installedAppsScript);
  const apps = ensureArray(raw).map(mapInstalledApp);

  return {
    capturedAt,
    freshness: buildFreshness(capturedAt),
    totalCount: apps.length,
    isTruncated: false,
    apps
  };
};

export const createWindowsMachineInventorySource = (): MachineInventorySource => ({
  captureSystemIdentity,
  captureProcesses,
  captureServices,
  captureStartup,
  captureInstalledApps
});
