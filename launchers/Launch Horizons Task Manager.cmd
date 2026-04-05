@echo off
setlocal EnableExtensions
title Horizons Task Manager

set "LAUNCHER_DIR=%~dp0"
for %%I in ("%LAUNCHER_DIR%..") do set "ROOT_DIR=%%~fI"
pushd "%ROOT_DIR%" >nul 2>nul || goto fail_pushd

set "NODE_EXE=node"
set "LAUNCHER=%CD%\desktop\switchable-launcher.cjs"
set "MODE_OVERRIDE=%~1"

if not exist "%LAUNCHER%" goto fail_missing_launcher

if not "%MODE_OVERRIDE%"=="" (
  %NODE_EXE% "%LAUNCHER%" --mode "%MODE_OVERRIDE%"
) else (
  %NODE_EXE% "%LAUNCHER%"
)
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Horizons Task Manager exited with code %EXIT_CODE%.
  echo.
  pause
)

exit /b %EXIT_CODE%

:fail_pushd
echo.
echo [Horizons Task Manager] Unable to open the launcher folder.
echo.
pause
exit /b 1

:fail_missing_launcher
echo.
echo [Horizons Task Manager] Missing launcher script:
echo %LAUNCHER%
echo.
pause
popd >nul
exit /b 1
