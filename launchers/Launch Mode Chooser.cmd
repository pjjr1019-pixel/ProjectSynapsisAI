@echo off
setlocal EnableExtensions
set "LAUNCHER_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%LAUNCHER_DIR%Launch Mode Chooser.ps1"
exit /b %ERRORLEVEL%
