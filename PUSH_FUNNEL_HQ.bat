@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Funnel Dashboard + Marketing HQ + everything pending
echo ================================================================
echo.
git add .
git status --short
echo.
git commit -m "feat: marketing HQ + conversion funnel dashboard + ad builder + listing ad pages + auto-WhatsApp + Meta Pixel Lead"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo Visit these after deploy:
echo   madmonacairo.com/admin/marketing-hq  = Command center
echo   madmonacairo.com/admin/funnel        = Ad ROI tracking
echo   madmonacairo.com/admin/ad-builder    = Ad URL generator
echo   madmonacairo.com/admin/leads-feed    = Live leads
echo   madmonacairo.com/admin/agents        = AI team status
echo.
pause
