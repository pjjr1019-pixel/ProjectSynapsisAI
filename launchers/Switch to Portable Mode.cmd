@echo off
setlocal EnableExtensions
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.." >nul 2>nul || exit /b 1

set "LAUNCHER=%CD%\desktop\switchable-launcher.cjs"
node "%LAUNCHER%" --set-mode portable
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Launch mode is now set to PORTABLE.
echo The switchable launcher will always use the bundled runtime until you switch back.
echo.
pause

popd >nul
exit /b %EXIT_CODE%
