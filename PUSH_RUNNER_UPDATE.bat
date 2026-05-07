@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING RUNNER UPDATE (content-marketing + analytics-reporter)
echo ================================================================
echo.
git add .
git status --short
echo.
git commit -m "feat: add content-marketing + analytics-reporter to runners + tighten DB integration"
git push origin main
echo.
echo Done. Vercel auto-deploy in 2-3 min.
echo Now ALL 19 agents are dispatchable from the scheduler.
echo.
pause
