@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Use working FFmpeg binary URL (b4.4.1)
echo ================================================================
echo.
echo   The b6.0 release has no linux-x64 binary asset (404).
echo   b4.4.1 is the latest with a confirmed-working binary (77MB).
echo.
git add .
git commit -m "fix: use ffmpeg b4.4.1 binary url (b6.0 was 404)" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90s.
)
pause
