@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Bundle ffmpeg-static binary in Vercel deployment
echo ================================================================
echo.
echo   Issue: ffmpeg binary path resolved to wrong location after webpack bundling
echo.
echo   Fix:
echo   * next.config.mjs:
echo     - serverComponentsExternalPackages: ['ffmpeg-static']  ^(skip bundling^)
echo     - outputFileTracingIncludes: includes binary in deployment
echo   * route.ts: verify binary exists + chmod 755 before spawn
echo   * Better error messages
echo.
git add .
git commit -m "fix: bundle ffmpeg-static binary correctly in vercel deployment" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90 sec for Vercel deploy.
)
pause
