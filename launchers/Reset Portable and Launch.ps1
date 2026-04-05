param()

$ErrorActionPreference = "Stop"

$launcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableRoot = Split-Path -Parent $launcherDir
$configPath = Join-Path $portableRoot "config\launcher-profile.json"
$launcherScript = Join-Path $portableRoot "desktop\switchable-launcher.cjs"
$userDataRoot = Join-Path $env:APPDATA "horizons-taskmanager"

function Stop-PortableProcesses {
  $targets = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.ExecutablePath -like "*taskmanager-portable*electron.exe") -or
    ($_.ExecutablePath -like "*node.exe" -and $_.CommandLine -like "*taskmanager-portable*")
  }

  foreach ($target in $targets) {
    Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
  }

  if ($targets) {
    Start-Sleep -Seconds 3
  }
}

function Reset-PortableProfile {
  if (Test-Path -LiteralPath $userDataRoot) {
    Remove-Item -LiteralPath $userDataRoot -Recurse -Force -ErrorAction Stop
  }
}

function Set-PortableDefault {
  $configDirectory = Split-Path -Parent $configPath
  New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null

  $config = [ordered]@{
    mode = "portable"
    allowPortableFallback = $true
    devSourceRoot = "../taskmanager"
  } | ConvertTo-Json -Depth 4

  Set-Content -LiteralPath $configPath -Value ($config + "`n") -Encoding UTF8
}

function Start-PortableApp {
  if (-not (Test-Path -LiteralPath $launcherScript)) {
    throw "Launcher script not found at $launcherScript"
  }

  Start-Process -FilePath "node" -ArgumentList @("desktop\switchable-launcher.cjs", "--mode", "portable") -WorkingDirectory $portableRoot -WindowStyle Hidden | Out-Null
}

Stop-PortableProcesses
Reset-PortableProfile
Set-PortableDefault
Start-PortableApp
