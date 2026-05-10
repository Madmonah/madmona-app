@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: OG endpoint was returning 0 bytes (font fetch silent fail)
echo ================================================================
echo.
echo   Fix:
echo   * Cairo font fetch wrapped in try/catch with 5s timeout
echo   * If font loads: full Arabic text overlay
echo   * If font fails: shows "مضمونة/إيجار/احجز" hardcoded ^(works without font^)
echo                    + scene number + MADMONA branding
echo   * Final try/catch ensures NEVER returns empty body
echo.
git add .
git commit -m "fix: og endpoint robust against font fetch failures" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90s.
)
pause
