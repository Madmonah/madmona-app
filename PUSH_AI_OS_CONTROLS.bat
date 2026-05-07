@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: AI OS Controls + Auto-triggers + Drain endpoint
echo ================================================================
echo.
echo NEW FEATURES:
echo   1. DB triggers auto-queue agents when:
echo      - Booking created   = booking-manager triggered
echo      - Listing published = quality-control triggered
echo.
echo   2. /api/agents/drain   = process pending auto-triggered runs
echo   3. /admin/ai-os         = interactive controls (toggle + trigger)
echo   4. /api/admin/agent-toggle = enable/disable + manual trigger
echo.
git add .
git status --short
echo.
git commit -m "feat: AI OS interactive controls + auto-triggers for bookings and listings"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo After deploy, visit:
echo   madmonacairo.com/admin/ai-os
echo.
echo You can:
echo   - Toggle any agent on/off with one click
echo   - Trigger any agent manually (will run on next drain)
echo   - See live stats per agent
echo.
echo Make sure MADMONA_ADMIN_PW is set in Vercel env vars.
echo.
pause
