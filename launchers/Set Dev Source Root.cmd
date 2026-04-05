@echo off
setlocal EnableExtensions
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.." >nul 2>nul || exit /b 1

if "%~1"=="" (
  echo.
  echo Usage:
  echo   Set Dev Source Root.cmd "C:\path\to\original\taskmanager"
  echo.
  echo Current default is ..\taskmanager
  echo.
  pause
  popd >nul
  exit /b 1
)

set "LAUNCHER=%CD%\desktop\switchable-launcher.cjs"
node "%LAUNCHER%" --set-dev-root "%~1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Updated the dev source root.
echo.
pause

popd >nul
exit /b %EXIT_CODE%
