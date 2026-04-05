@echo off
setlocal EnableExtensions

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..\..") do set "ROOT_DIR=%%~fI"
set "SHORTCUT_NAME=Horizons Task Manager Portable (Legacy).lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '%ROOT_DIR%').Path; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$target = Join-Path $env:SystemRoot 'System32\wscript.exe'; " ^
  "$script = Join-Path $root 'launchers\legacy\Horizons Task Manager Portable.vbs'; " ^
  "$icon = Join-Path $root 'desktop\app-icon.ico'; " ^
  "$shortcutPath = Join-Path $desktop '%SHORTCUT_NAME%'; " ^
  "$shell = New-Object -ComObject WScript.Shell; " ^
  "$shortcut = $shell.CreateShortcut($shortcutPath); " ^
  "$shortcut.TargetPath = $target; " ^
  "$shortcut.Arguments = '\"' + $script + '\"'; " ^
  "$shortcut.WorkingDirectory = $root; " ^
  "$shortcut.Description = 'Launch Horizons Task Manager Portable (legacy launcher)'; " ^
  "if (Test-Path $icon) { $shortcut.IconLocation = $icon + ',0' }; " ^
  "$shortcut.Save();"

if errorlevel 1 (
  echo.
  echo Failed to create the desktop shortcut.
  echo.
  pause
  exit /b 1
)

echo.
echo Created desktop shortcut:
echo %SHORTCUT_NAME%
echo.
pause
exit /b 0
