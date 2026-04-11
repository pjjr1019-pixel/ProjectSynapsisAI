@echo off
setlocal

set "APP_DIR=%~dp0"
set "ELECTRON_RUN_AS_NODE="

title SynAI Launcher

if not exist "%APP_DIR%\package.json" (
  echo SynAI project folder was not found:
  echo %APP_DIR%
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm was not found on this machine.
  echo Install Node.js, then try launching SynAI again.
  echo.
  pause
  exit /b 1
)

pushd "%APP_DIR%"

if defined NODE_OPTIONS (
  set "NODE_OPTIONS=--max-old-space-size=4096 %NODE_OPTIONS%"
) else (
  set "NODE_OPTIONS=--max-old-space-size=4096"
)

if not exist "%APP_DIR%\node_modules" (
  echo Installing SynAI dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency install failed.
    popd
    pause
    exit /b 1
  )
)

echo Starting SynAI...
call npm run dev
set "EXITCODE=%ERRORLEVEL%"

popd

if not "%EXITCODE%"=="0" (
  echo.
  echo SynAI exited with code %EXITCODE%.
  pause
)

exit /b %EXITCODE%
