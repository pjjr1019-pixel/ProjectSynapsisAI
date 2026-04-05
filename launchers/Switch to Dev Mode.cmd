@echo off
setlocal EnableExtensions
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.." >nul 2>nul || exit /b 1

set "LAUNCHER=%CD%\desktop\switchable-launcher.cjs"
node "%LAUNCHER%" --set-mode dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Launch mode is now set to DEV with portable fallback enabled.
echo If a source checkout exists at ..\taskmanager, the switchable launcher will use it.
echo Otherwise it will fall back to the portable runtime until that source path exists.
echo.
pause

popd >nul
exit /b %EXIT_CODE%
