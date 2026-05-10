@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Download FFmpeg binary at runtime (cached in /tmp)
echo ================================================================
echo.
echo   Why: Vercel doesn't reliably bundle ffmpeg-static binary
echo   inside serverless functions. The download-on-cold-start pattern
echo   is what Vercel community uses for this.
echo.
echo   How:
echo   * On first invocation, downloads FFmpeg ~80MB from GitHub
echo   * Saves to /tmp/ffmpeg (writable, 512MB available)
echo   * Subsequent invocations reuse the cached binary
echo   * Cold-start: ~10s extra (one time)
echo   * Warm: instant
echo.
echo   Cleanup:
echo   * Removed ffmpeg-static from package.json (no longer needed)
echo   * Removed bundling config from next.config.mjs
echo.
git add .
git commit -m "fix: download ffmpeg at runtime instead of bundling" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90 seconds for Vercel deploy.
)
pause
