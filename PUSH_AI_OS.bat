@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: AI Operating System (Phase 2) - 8 NEW AGENTS
echo ================================================================
echo.
echo NEW AGENTS:
echo   CREATIVE TEAM:
echo     - ad-designer        (Meta ad creatives)
echo     - reel-script-writer (Instagram Reels)
echo     - carousel-designer  (Carousel posts)
echo.
echo   OPERATIONS TEAM:
echo     - booking-manager    (auto-evaluate bookings)
echo     - quality-control    (review new listings)
echo     - finance-tracker    (daily financial pulse)
echo.
echo   STRATEGIC TEAM:
echo     - ceo-assistant      (daily executive brief)
echo     - strategy-agent     (weekly strategy plays)
echo.
echo NEW PAGES:
echo   /admin/ai-os          = Full AI OS dashboard
echo   /admin/ad-creatives   = Ad designs gallery
echo   /admin/ceo-briefs     = Daily executive briefs
echo   /admin/strategy       = Strategy plays
echo.
git add .
git status --short
echo.
git commit -m "feat: AI Operating System Phase 2 - 8 new agents (creative + operations + strategic teams) + DB tables + admin pages"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo Total agents: 27 (was 19)
echo Visit: madmonacairo.com/admin/ai-os
echo.
pause
