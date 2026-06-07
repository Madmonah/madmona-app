@echo off
chcp 65001 >nul
cd /d C:\madmona-app
title Madmona - Deploy to Production
echo ============================================================
echo    MADMONA - DEPLOY to madmonacairo.com (Vercel CLI direct)
echo ============================================================
echo.
echo This uses Vercel CLI directly — NOT git push (which fails on large repos).
echo Building and deploying... please wait 2-4 minutes.
echo (Do NOT close this window until you see RESULT below)
echo.

where vercel >nul 2>&1
if %errorlevel%==0 (
    echo Using local Vercel CLI...
    call vercel --prod --yes > deploy-log.txt 2>&1
) else (
    echo Using npx vercel...
    call npx --yes vercel --prod --yes > deploy-log.txt 2>&1
)

set DEPLOY_EXIT=%errorlevel%
echo.
echo ----------------------------- RESULT -----------------------------
type deploy-log.txt
echo ------------------------------------------------------------------
echo.

if %DEPLOY_EXIT%==0 (
    echo SUCCESS! Deployment complete.
    echo.
    echo Test these URLs in INCOGNITO (not logged in):
    echo   https://madmonacairo.com/careers           (NEW)
    echo   https://madmonacairo.com/clinic/polyclinic-model
    echo   https://madmonacairo.com/demo/clinic/polyclinic-model  (NEW)
) else (
    echo DEPLOY FAILED. Check deploy-log.txt above for the error.
    echo Common fixes:
    echo   1. Run: vercel login  (if not logged in)
    echo   2. Run: vercel link  (if .vercel folder is missing)
    echo   3. Check .vercel/project.json exists
)

echo.
echo Backup: a copy of the log is in deploy-log.txt
pause
