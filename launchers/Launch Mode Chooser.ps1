param(
  [ValidateSet("auto", "dev", "portable")]
  [string]$Mode,
  [switch]$Remember,
  [switch]$NoGui,
  [switch]$PrintState
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$launcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableRoot = Split-Path -Parent $launcherDir
$launcherScript = Join-Path $portableRoot "desktop\switchable-launcher.cjs"
$cmdLauncher = Join-Path $launcherDir "Launch Horizons Task Manager.cmd"
$configPath = Join-Path $portableRoot "config\launcher-profile.json"
$iconPath = Join-Path $portableRoot "desktop\app-icon.ico"
$defaultConfig = @{
  mode = "dev"
  allowPortableFallback = $true
  devSourceRoot = "../taskmanager"
}

function Get-LauncherConfig {
  if (-not (Test-Path -LiteralPath $configPath)) {
    return [pscustomobject]$defaultConfig
  }

  try {
    $raw = Get-Content -LiteralPath $configPath -Raw
    $parsed = $raw | ConvertFrom-Json
    return [pscustomobject]@{
      mode = if ($parsed.mode) { [string]$parsed.mode } else { $defaultConfig.mode }
      allowPortableFallback = if ($null -ne $parsed.allowPortableFallback) { [bool]$parsed.allowPortableFallback } else { $defaultConfig.allowPortableFallback }
      devSourceRoot = if ($parsed.devSourceRoot) { [string]$parsed.devSourceRoot } else { $defaultConfig.devSourceRoot }
    }
  } catch {
    return [pscustomobject]$defaultConfig
  }
}

function Resolve-DevSourceRoot([string]$devSourceRoot) {
  if ([string]::IsNullOrWhiteSpace($devSourceRoot)) {
    $resolvedDefault = Resolve-Path -LiteralPath (Join-Path $portableRoot "..\taskmanager") -ErrorAction SilentlyContinue
    if ($resolvedDefault) {
      return $resolvedDefault.Path
    }
    return [System.IO.Path]::GetFullPath((Join-Path $portableRoot "..\taskmanager"))
  }

  if ([System.IO.Path]::IsPathRooted($devSourceRoot)) {
    return [System.IO.Path]::GetFullPath($devSourceRoot)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $portableRoot $devSourceRoot))
}

function Test-DevSourceAvailable([string]$root) {
  if ([string]::IsNullOrWhiteSpace($root)) { return $false }
  $requiredPaths = @(
    (Join-Path $root "package.json"),
    (Join-Path $root "desktop\run-electron-dev.cjs"),
    (Join-Path $root "src")
  )
  foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath $path)) { return $false }
  }
  $viteCandidates = @("vite.config.ts", "vite.config.js", "vite.config.mjs", "vite.config.cjs") | ForEach-Object {
    Join-Path $root $_
  }
  return ($viteCandidates | Where-Object { Test-Path -LiteralPath $_ } | Measure-Object).Count -gt 0
}

function Get-LauncherState {
  $config = Get-LauncherConfig
  $devRoot = Resolve-DevSourceRoot $config.devSourceRoot
  $devAvailable = Test-DevSourceAvailable $devRoot
  [pscustomobject]@{
    config = $config
    portableRoot = $portableRoot
    devSourceRoot = $devRoot
    devSourceAvailable = $devAvailable
    configPath = $configPath
  }
}

function Invoke-CmdLauncher([string]$selectedMode) {
  $quotedLauncher = '"' + $cmdLauncher + '"'
  $command = if ([string]::IsNullOrWhiteSpace($selectedMode)) {
    $quotedLauncher
  } else {
    $quotedLauncher + " " + $selectedMode
  }
  $process = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $command) -WorkingDirectory $portableRoot -PassThru -WindowStyle Hidden
  return $process
}

function Launch-SelectedMode([string]$selectedMode, [bool]$rememberSelection) {
  if ($rememberSelection) {
    $setMode = Start-Process -FilePath "node" -ArgumentList @($launcherScript, "--set-mode", $selectedMode) -WorkingDirectory $portableRoot -Wait -PassThru -WindowStyle Hidden
    if ($setMode.ExitCode -ne 0) {
      throw "Failed to save launch mode '$selectedMode'."
    }
  }

  $null = Invoke-CmdLauncher $selectedMode
}

if ($PrintState) {
  $state = Get-LauncherState
  $state | ConvertTo-Json -Depth 4
  exit 0
}

if ($NoGui -and $Mode) {
  Launch-SelectedMode $Mode $Remember.IsPresent
  exit 0
}

$state = Get-LauncherState
[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Horizons Launch Chooser"
$form.StartPosition = "CenterScreen"
$form.ClientSize = New-Object System.Drawing.Size(430, 290)
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(9, 14, 26)
$form.ForeColor = [System.Drawing.Color]::FromArgb(232, 239, 255)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
if (Test-Path -LiteralPath $iconPath) {
  try { $form.Icon = New-Object System.Drawing.Icon($iconPath) } catch {}
}

$title = New-Object System.Windows.Forms.Label
$title.Text = "Launch Horizons Task Manager"
$title.Location = New-Object System.Drawing.Point(18, 16)
$title.Size = New-Object System.Drawing.Size(360, 24)
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 13)
$title.ForeColor = [System.Drawing.Color]::FromArgb(245, 248, 255)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Choose which mode to launch this time."
$subtitle.Location = New-Object System.Drawing.Point(20, 42)
$subtitle.Size = New-Object System.Drawing.Size(360, 18)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(170, 190, 225)
$form.Controls.Add($subtitle)

$panel = New-Object System.Windows.Forms.Panel
$panel.Location = New-Object System.Drawing.Point(18, 72)
$panel.Size = New-Object System.Drawing.Size(394, 128)
$panel.BackColor = [System.Drawing.Color]::FromArgb(14, 21, 38)
$panel.BorderStyle = "FixedSingle"
$form.Controls.Add($panel)

$savedModeLabel = New-Object System.Windows.Forms.Label
$savedModeLabel.Text = "Saved default: $($state.config.mode.ToUpperInvariant())"
$savedModeLabel.Location = New-Object System.Drawing.Point(14, 12)
$savedModeLabel.Size = New-Object System.Drawing.Size(180, 18)
$savedModeLabel.ForeColor = [System.Drawing.Color]::FromArgb(146, 170, 210)
$panel.Controls.Add($savedModeLabel)

$devStatusText = if ($state.devSourceAvailable) {
  "Dev source found: $($state.devSourceRoot)"
} else {
  "Dev source missing: $($state.devSourceRoot)"
}
$devStatusLabel = New-Object System.Windows.Forms.Label
$devStatusLabel.Text = $devStatusText
$devStatusLabel.Location = New-Object System.Drawing.Point(14, 32)
$devStatusLabel.Size = New-Object System.Drawing.Size(360, 30)
$devStatusLabel.ForeColor = if ($state.devSourceAvailable) {
  [System.Drawing.Color]::FromArgb(145, 226, 179)
} else {
  [System.Drawing.Color]::FromArgb(244, 192, 126)
}
$panel.Controls.Add($devStatusLabel)

$radioAuto = New-Object System.Windows.Forms.RadioButton
$radioAuto.Text = "Auto"
$radioAuto.Location = New-Object System.Drawing.Point(18, 74)
$radioAuto.Size = New-Object System.Drawing.Size(90, 22)
$radioAuto.ForeColor = $form.ForeColor
$radioAuto.BackColor = $panel.BackColor
$panel.Controls.Add($radioAuto)

$radioDev = New-Object System.Windows.Forms.RadioButton
$radioDev.Text = "Dev"
$radioDev.Location = New-Object System.Drawing.Point(122, 74)
$radioDev.Size = New-Object System.Drawing.Size(90, 22)
$radioDev.ForeColor = $form.ForeColor
$radioDev.BackColor = $panel.BackColor
$panel.Controls.Add($radioDev)

$radioPortable = New-Object System.Windows.Forms.RadioButton
$radioPortable.Text = "Portable"
$radioPortable.Location = New-Object System.Drawing.Point(226, 74)
$radioPortable.Size = New-Object System.Drawing.Size(120, 22)
$radioPortable.ForeColor = $form.ForeColor
$radioPortable.BackColor = $panel.BackColor
$panel.Controls.Add($radioPortable)

$savedMode = if ($state.config.mode) { [string]$state.config.mode } else { "dev" }
switch ($savedMode.ToLowerInvariant()) {
  "auto" { $radioAuto.Checked = $true }
  "portable" { $radioPortable.Checked = $true }
  default { $radioDev.Checked = $true }
}

$modeHint = New-Object System.Windows.Forms.Label
$modeHint.Text = "Dev will fall back to portable automatically if the source repo is missing."
$modeHint.Location = New-Object System.Drawing.Point(14, 100)
$modeHint.Size = New-Object System.Drawing.Size(360, 18)
$modeHint.ForeColor = [System.Drawing.Color]::FromArgb(124, 148, 186)
$panel.Controls.Add($modeHint)

$rememberCheck = New-Object System.Windows.Forms.CheckBox
$rememberCheck.Text = "Remember this as my default"
$rememberCheck.Location = New-Object System.Drawing.Point(22, 214)
$rememberCheck.Size = New-Object System.Drawing.Size(220, 24)
$rememberCheck.ForeColor = $form.ForeColor
$rememberCheck.BackColor = $form.BackColor
$form.Controls.Add($rememberCheck)

$openConfigButton = New-Object System.Windows.Forms.Button
$openConfigButton.Text = "Show Mode"
$openConfigButton.Location = New-Object System.Drawing.Point(22, 248)
$openConfigButton.Size = New-Object System.Drawing.Size(92, 28)
$openConfigButton.FlatStyle = "Flat"
$openConfigButton.BackColor = [System.Drawing.Color]::FromArgb(20, 30, 52)
$openConfigButton.ForeColor = $form.ForeColor
$openConfigButton.Add_Click({
  $freshState = Get-LauncherState
  [System.Windows.Forms.MessageBox]::Show(
    "Saved default: $($freshState.config.mode)`n`nDev source:`n$($freshState.devSourceRoot)`n`nAvailable: $($freshState.devSourceAvailable)",
    "Horizons Launch Chooser",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
})
$form.Controls.Add($openConfigButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancel"
$cancelButton.Location = New-Object System.Drawing.Point(228, 244)
$cancelButton.Size = New-Object System.Drawing.Size(86, 34)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$cancelButton.FlatStyle = "Flat"
$cancelButton.BackColor = [System.Drawing.Color]::FromArgb(18, 24, 40)
$cancelButton.ForeColor = $form.ForeColor
$form.Controls.Add($cancelButton)
$form.CancelButton = $cancelButton

$launchButton = New-Object System.Windows.Forms.Button
$launchButton.Text = "Launch"
$launchButton.Location = New-Object System.Drawing.Point(324, 244)
$launchButton.Size = New-Object System.Drawing.Size(88, 34)
$launchButton.FlatStyle = "Flat"
$launchButton.BackColor = [System.Drawing.Color]::FromArgb(46, 76, 132)
$launchButton.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($launchButton)
$form.AcceptButton = $launchButton

$launchButton.Add_Click({
  try {
    $selectedMode = if ($radioPortable.Checked) {
      "portable"
    } elseif ($radioAuto.Checked) {
      "auto"
    } else {
      "dev"
    }

    Launch-SelectedMode $selectedMode $rememberCheck.Checked
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
  } catch {
    [System.Windows.Forms.MessageBox]::Show(
      $_.Exception.Message,
      "Horizons Launch Chooser",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  }
})

[void]$form.ShowDialog()
