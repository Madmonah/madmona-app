@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING PROFESSIONAL 20-AGENT TEAM TO PRODUCTION
echo ================================================================
echo.
git add .
git status
echo.
echo Committing...
git commit -m "feat: 20 virtual agents (10 sales + 10 marketing) + intelligence layer + admin dashboard + tracking"
echo.
echo Pushing to GitHub (Vercel will auto-deploy)...
git push origin main
echo.
echo ================================================================
echo   DONE. Vercel auto-deploy in 2-3 min.
echo ================================================================
echo.
echo What's NEW:
echo   - 20 AI agents (10 sales + 10 marketing) - all wired up
echo   - Master scheduler dispatches due agents hourly
echo   - Admin dashboard at: madmonacairo.com/admin/agents
echo   - Site events tracking (frontend pixel ready)
echo   - Content calendar in DB (drafts saved automatically)
echo   - Daily KPI tracking
echo   - Marketing campaigns table
echo   - Supplier prospects table
echo   - Agent insights table
echo.
echo NEXT TO ACTIVATE:
echo   1. Add Analytics tracker to layout.tsx (1 line of code)
echo   2. Get WhatsApp credentials from Meta Business Suite
echo   3. Visit madmonacairo.com/admin/agents to see your team
echo.
pause
