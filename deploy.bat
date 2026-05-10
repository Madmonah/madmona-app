@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Real reels with Arabic text + branding (not blank green)
echo ================================================================
echo.
echo   New rendering pipeline:
echo   * @vercel/og generates 1080x1920 PNG per scene
echo     - Madmona green gradients per scene type
echo     - Cairo Arabic font (loaded from Google Fonts CDN)
echo     - "MADMONA" + scene text + CTA + brand strip
echo   * FFmpeg concats PNGs with fade transitions
echo   * Output: branded MP4 with actual Arabic text overlays
echo.
echo   Failsafes:
echo   * Frame fetches in parallel ^(faster^)
echo   * 25s timeout per fetch ^(prevents deadlock^)
echo   * Falls back to fewer frames if some fail
echo.
echo   Updated: also re-renders 'rendered' reels (overwrites blank ones)
echo.
git add .
git commit -m "fix: render reels with real arabic text + branding (vercel/og)" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90s for deploy.
)
pause
