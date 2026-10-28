@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SkyRealm Auth API - Local Development

echo ==========================================
echo   SkyRealm Auth API - Local Development
echo   SMTP-ready version / Python 3.12
echo ==========================================
echo.

rem Use Python 3.12 explicitly to avoid incompatible preview runtimes.
set "PY="
where py >nul 2>&1
if not errorlevel 1 (
  py -3.12 --version >nul 2>&1
  if not errorlevel 1 set "PY=py -3.12"
)
if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>&1
    if not errorlevel 1 set "PY=python"
  )
)
if not defined PY goto no_python

echo Using Python 3.12 via: %PY%
%PY% --version

echo.
echo Checking existing virtual environment...
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>&1
  if errorlevel 1 (
    echo Existing .venv was made with a different Python version. Recreating it...
    rmdir /s /q ".venv"
  )
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment with Python 3.12...
  %PY% -m venv .venv
  if errorlevel 1 goto venv_error
)

set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" goto venv_error

echo.
echo Installing API packages. The first run requires internet access...
"%VPY%" -m pip install --upgrade pip
if errorlevel 1 goto install_error
"%VPY%" -m pip install --only-binary=:all: -r requirements.txt
if errorlevel 1 goto install_error

echo.
echo Settings: server\.env will be loaded if present.
echo API address: http://127.0.0.1:8000
echo Do not share the SMTP app password or publish this local server.
echo Press Ctrl+C to stop the API.
echo.
"%VPY%" run_server.py
set "EXITCODE=%ERRORLEVEL%"
echo.
echo Server stopped with code %EXITCODE%.
pause
exit /b %EXITCODE%

:no_python
echo ERROR: Python 3.12 was not found.
echo Install Python 3.12 from https://www.python.org/downloads/ and enable "Add python.exe to PATH".
pause
exit /b 1

:venv_error
echo ERROR: Could not create the Python 3.12 virtual environment.
pause
exit /b 1

:install_error
echo ERROR: Could not install API packages.
echo Check your internet connection and the messages above.
pause
exit /b 1
