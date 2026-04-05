@echo off
setlocal EnableExtensions
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.." >nul 2>nul || exit /b 1

set "LAUNCHER=%CD%\desktop\switchable-launcher.cjs"
node "%LAUNCHER%" --print-config

echo.
pause

popd >nul
exit /b 0
