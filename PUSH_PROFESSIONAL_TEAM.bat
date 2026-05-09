@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING THE FULL PROFESSIONAL TEAM
echo ================================================================
echo.
git add .
echo.
echo --- Files staged ---
git status --short
echo.
echo --- Committing ---
git commit -m "feat: 20 virtual agents + intelligence layer + live activity feed + visitor tracking"
echo.
echo --- Pushing to GitHub ---
git push origin main
echo.
echo ================================================================
echo   PUSH COMPLETE - Vercel auto-deploy in 2-3 min
echo ================================================================
echo.
echo Production URLs (after deploy):
echo   - madmonacairo.com/admin/agents     - Agent Dashboard
echo   - madmonacairo.com/admin/activity   - Live Activity Feed
echo.
echo Test endpoints (after deploy):
echo   curl -X POST -H "Authorization: Bearer SECRET" madmonacairo.com/api/agents/scheduler
echo.
pause
