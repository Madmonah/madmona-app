@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: AI Lead Scoring Fix (sync instead of void)
echo ================================================================
echo.
git add .
git commit -m "fix: lead capture AI scoring runs synchronously (Vercel kills void promises)"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel auto-deploy in 2-3 min
echo ================================================================
echo.
pause
