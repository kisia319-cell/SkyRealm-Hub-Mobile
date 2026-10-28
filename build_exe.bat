@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SkyRealm Launcher - Stable EXE Builder
set "LOG=%~dp0build_log.txt"
set "CHECK=%TEMP%\skyrealm_python_check.txt"
>"%LOG%" echo SkyRealm Launcher 0.9.1 build log
>>"%LOG%" echo Started: %DATE% %TIME%
>>"%LOG%" echo Project folder: %CD%
echo ==========================================
echo       SkyRealm Launcher 0.9.1 Builder
echo ==========================================
echo.
echo This build creates a separate game process and bundles it into SkyRealm.exe.
echo Log: "%LOG%"
echo.
set "PY="
where py >nul 2>&1
if not errorlevel 1 (
  py -3.12 --version >"%CHECK%" 2>&1
  type "%CHECK%" >>"%LOG%"
  findstr /i /c:"Python 3.12" "%CHECK%" >nul 2>&1
  if not errorlevel 1 set "PY=py -3.12"
)
if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 (
    python --version >"%CHECK%" 2>&1
    type "%CHECK%" >>"%LOG%"
    findstr /i /c:"Python 3.12" "%CHECK%" >nul 2>&1
    if not errorlevel 1 set "PY=python"
  )
)
if exist "%CHECK%" del "%CHECK%" >nul 2>&1
if not defined PY goto no_python
echo [1/5] Python 3.12 detected: %PY%
>>"%LOG%" echo Selected Python command: %PY%
%PY% --version
if errorlevel 1 goto build_error
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>&1
  if errorlevel 1 (
    echo Removing incompatible build environment...
    rmdir /s /q ".venv"
  )
)
if not exist ".venv\Scripts\python.exe" (
  echo [2/5] Creating build environment...
  %PY% -m venv .venv >>"%LOG%" 2>&1
  if errorlevel 1 goto build_error
)
set "VPY=%~dp0.venv\Scripts\python.exe"
if not exist "%VPY%" goto build_error
echo [3/5] Installing PyWebView and PyInstaller...
"%VPY%" -m pip install --upgrade pip >>"%LOG%" 2>&1
if errorlevel 1 goto build_error
"%VPY%" -m pip install pywebview pyinstaller >>"%LOG%" 2>&1
if errorlevel 1 goto build_error
if exist "game_runner_dist" rmdir /s /q "game_runner_dist"
if exist "build_game_runner" rmdir /s /q "build_game_runner"
echo [4/5] Building independent game window executable...
"%VPY%" -m PyInstaller --noconfirm --clean --windowed --onefile --name SkyRealmGame --distpath "game_runner_dist" --workpath "build_game_runner\work" --specpath "build_game_runner" launcher.py >>"%LOG%" 2>&1
if errorlevel 1 goto build_error
if not exist "game_runner_dist\SkyRealmGame.exe" goto build_error
echo [5/5] Bundling game runner and game assets into SkyRealm.exe...
"%VPY%" -m PyInstaller --noconfirm --clean --windowed --onefile --name SkyRealm --icon "SkyRealm.ico" --add-data "index.html;." --add-data "style.css;." --add-data "app.js;." --add-data "config.js;." --add-data "realm.jpg;." --add-data "icon.png;." --add-data "game;game" --add-data "game_runner_version.txt;." --add-data "game_runner_dist\SkyRealmGame.exe;bin" launcher.py >>"%LOG%" 2>&1
if errorlevel 1 goto build_error
if not exist "dist\SkyRealm.exe" goto build_error
if exist "game_runner_dist" rmdir /s /q "game_runner_dist"
if exist "build_game_runner" rmdir /s /q "build_game_runner"
echo.
echo ==========================================
echo BUILD SUCCESSFUL
echo EXE: "%~dp0dist\SkyRealm.exe"
echo ==========================================
>>"%LOG%" echo SUCCESS: %~dp0dist\SkyRealm.exe
goto keep_open
:no_python
echo.
echo ERROR: Python 3.12 was not found.
echo Install Python 3.12 from https://www.python.org/downloads/release/python-31210/
echo During setup, select "Add python.exe to PATH".
echo Log: "%LOG%"
>>"%LOG%" echo ERROR: No Python 3.12 interpreter was detected.
goto keep_open
:build_error
echo.
echo BUILD FAILED. Recent details from build_log.txt:
echo ------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath '%LOG%' -Tail 60"
echo ------------------------------------------
echo.
echo Fix the error above and run build_exe.bat again.
:keep_open
echo.
echo This window stays open. Type EXIT and press Enter to close it.
cmd /k
