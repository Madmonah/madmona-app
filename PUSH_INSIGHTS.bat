@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: AI Insights Dashboard + Listing Performance Tracker
echo ================================================================
echo.
git add .
git status --short
echo.
git commit -m "feat: AI insights dashboard + listing performance tracker + HQ updates"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo NEW pages:
echo   madmonacairo.com/admin/insights              = All AI insights
echo   madmonacairo.com/admin/listing-performance   = Top/idle listings
echo.
echo Marketing HQ now has links to all 8 tools.
echo.
pause
