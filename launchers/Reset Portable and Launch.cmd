@echo off
setlocal EnableExtensions
title Horizons Task Manager Reset Portable

set "LAUNCHER_DIR=%~dp0"
set "SCRIPT_PATH=%LAUNCHER_DIR%Reset Portable and Launch.ps1"

if not exist "%SCRIPT_PATH%" goto fail_missing_script

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Horizons Task Manager reset launcher exited with code %EXIT_CODE%.
  echo.
  pause
)

exit /b %EXIT_CODE%

:fail_missing_script
echo.
echo [Horizons Task Manager] Missing reset launcher script:
echo %SCRIPT_PATH%
echo.
pause
exit /b 1
