@echo off
chcp 65001 >nul
cd /d E:\madmona-app
echo ============================================================
echo    MADMONA - DEPLOY (local files only - no setup - no git)
echo ============================================================
echo.
echo Deploying to production... please wait 1-2 minutes.
echo (Do NOT close this window until you see RESULT below)
echo.
where vercel >nul 2>&1
if %errorlevel%==0 (
    call vercel --prod --yes > deploy-clean-log.txt 2>&1
) else (
    call npx --yes vercel --prod --yes > deploy-clean-log.txt 2>&1
)
echo.
echo ----------------------------- RESULT -----------------------------
type deploy-clean-log.txt
echo ------------------------------------------------------------------
echo.
echo Done. Result saved in: deploy-clean-log.txt
echo Now open:  https://madmonacairo.com/admin-entry
echo.
pause
