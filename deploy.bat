@echo off
chcp 65001 >nul
cd /d E:\madmona-app
echo ============================================================
echo    MADMONA - DEPLOY to madmonacairo.com (Vercel CLI direct)
echo ============================================================
echo.
echo This uses Vercel CLI directly - NOT git push.
echo Building and deploying... please wait 2-4 minutes.
echo (Do NOT close this window until you see RESULT below)
echo.
where vercel >nul 2>&1
if %errorlevel%==0 (
    echo Using local Vercel CLI...
    call vercel --prod --yes > deploy-log.txt 2>&1
) else (
    echo Using npx Vercel CLI...
    call npx --yes vercel --prod --yes > deploy-log.txt 2>&1
)
echo.
echo ----------------------------- RESULT -----------------------------
type deploy-log.txt
echo ------------------------------------------------------------------
echo.
echo Pinging IndexNow (search engines) ...
powershell -NoProfile -Command "try{ (Invoke-RestMethod -Uri 'https://www.madmonacairo.com/api/indexnow' -TimeoutSec 90 | ConvertTo-Json -Compress) } catch { Write-Host 'IndexNow ping failed (non-fatal)' }"
echo.
echo Done. Full log saved in: deploy-log.txt
pause
