@echo off
setlocal
REM =====================================================================
REM  Madmona CapCut - ONE-CLICK installer (no Git needed) - v2
REM  Just double-click this file and wait.
REM  Installs into C:\madmona-capcutapi
REM =====================================================================

set TARGET=C:\madmona-capcutapi

echo ============================================
echo   Madmona CapCut - installer (v2)
echo ============================================
echo.

REM --- check Python ---
where python >nul 2>&1
if errorlevel 1 (
  echo Python is not installed. Trying to install it automatically...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
  echo.
  echo ----------------------------------------------------------
  echo  Python installed. CLOSE this window and double-click
  echo  this file AGAIN to continue.
  echo ----------------------------------------------------------
  pause
  exit /b 0
)

echo [1/5] Downloading CapCut helper (no Git needed)...
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'https://github.com/sun-guannan/CapCutAPI/archive/refs/heads/main.zip' -OutFile \"$env:TEMP\capcutapi.zip\" } catch { exit 1 }"
if errorlevel 1 ( echo DOWNLOAD FAILED - check internet & pause & exit /b 1 )

echo [2/5] Extracting to %TARGET% ...
powershell -NoProfile -Command "if (Test-Path 'C:\__capcuttmp') { Remove-Item -Recurse -Force 'C:\__capcuttmp' }; Expand-Archive -Force \"$env:TEMP\capcutapi.zip\" 'C:\__capcuttmp'; $d=(Get-ChildItem -Directory 'C:\__capcuttmp')[0].FullName; if (Test-Path '%TARGET%') { Remove-Item -Recurse -Force '%TARGET%' }; Move-Item $d '%TARGET%'; Remove-Item -Recurse -Force 'C:\__capcuttmp'"
if not exist "%TARGET%\requirements.txt" ( echo EXTRACT FAILED & pause & exit /b 1 )
cd /d "%TARGET%"

echo [3/5] Creating Python environment...
python -m venv venv
call venv\Scripts\activate.bat

echo [4/5] Installing dependencies (takes a minute)...
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
pip install -r requirements-mcp.txt

echo [5/5] Config + self-test...
if not exist config.json copy config.json.example config.json >nul
python -c "from create_draft import create_draft; from add_text_impl import add_text_impl; from save_draft_impl import save_draft_impl; import os; s,d=create_draft(1080,1920); add_text_impl(text='Madmona Test', start=0, end=3, draft_id=d, font_color='#FFD700', font_size=12.0, transform_y=0.0); os.makedirs('out_drafts',exist_ok=True); r=save_draft_impl(d,'out_drafts'); print('SELF-TEST OK:', r.get('success'))"

echo.
echo ============================================
echo   Look above for:   SELF-TEST OK: True
echo   Then type "OK" to Claude. Keep CapCut Desktop open + logged in.
echo ============================================
pause
