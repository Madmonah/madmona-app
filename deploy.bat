@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Simplified renderer (no internal HTTP fetch, ~3s per reel)
echo ================================================================
echo.
echo   Removed dependency on /api/og/reel-scene (was hanging on Vercel)
echo   Each reel now renders in ~3 seconds via direct FFmpeg lavfi.
echo.
echo   Output: 1080x1920 portrait MP4, Madmona green (#1F5F3F),
echo           with smooth fade in/out, duration matches reel script.
echo.
echo   You can add Arabic text + photos in Instagram (perfect Arabic support).
echo.
git add .
git commit -m "fix: simplified ffmpeg renderer (no internal fetch, fast)" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90 seconds for Vercel deploy.
)
pause
