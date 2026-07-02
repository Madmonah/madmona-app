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
echo Done. Full log saved in: deploy-log.txt
pause
