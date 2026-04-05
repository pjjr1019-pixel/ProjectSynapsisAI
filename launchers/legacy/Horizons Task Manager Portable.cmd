@echo off
setlocal EnableExtensions
title Horizons Task Manager Portable

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..\..") do set "ROOT_DIR=%%~fI"
pushd "%ROOT_DIR%" >nul 2>nul || goto fail_pushd

set "APP_NAME=Horizons Task Manager Portable"
set "HORIZONS_TASKMANAGER_ROOT=%CD%"
set "HORIZONS_PORTABLE_MODE=1"
set "ELECTRON_RUN_AS_NODE="
set "ELECTRON_EXE=%CD%\node_modules\electron\dist\electron.exe"
set "MAIN_ENTRY=%CD%\desktop\main.cjs"
set "UI_ENTRY=%CD%\dist\index.html"

if not exist "%ELECTRON_EXE%" goto fail_missing_electron
if not exist "%MAIN_ENTRY%" goto fail_missing_main
if not exist "%UI_ENTRY%" goto fail_missing_ui

"%ELECTRON_EXE%" .
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul

if not "%EXIT_CODE%"=="0" (
  echo.
  echo %APP_NAME% exited with code %EXIT_CODE%.
  echo Check the portable folder contents and try again.
  echo.
  pause
)

exit /b %EXIT_CODE%

:fail_pushd
echo.
echo [Horizons Task Manager Portable] Unable to open the portable app folder.
echo.
pause
exit /b 1

:fail_missing_electron
echo.
echo [Horizons Task Manager Portable] Missing local Electron runtime:
echo %ELECTRON_EXE%
echo.
pause
popd >nul
exit /b 1

:fail_missing_main
echo.
echo [Horizons Task Manager Portable] Missing desktop entrypoint:
echo %MAIN_ENTRY%
echo.
pause
popd >nul
exit /b 1

:fail_missing_ui
echo.
echo [Horizons Task Manager Portable] Missing bundled UI:
echo %UI_ENTRY%
echo.
pause
popd >nul
exit /b 1
