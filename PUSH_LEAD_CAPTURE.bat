@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Lead Capture System + Landing Page + Leads Feed
echo ================================================================
echo.
git add .
echo.
git status --short
echo.
git commit -m "feat: lead capture (landing page + AI scoring + leads feed) + content-marketing & analytics-reporter runners"
echo.
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel auto-deploy in 2-3 min
echo ================================================================
echo.
echo What's NEW after deploy:
echo   - madmonacairo.com/ad-landing      = Landing page for Meta ads
echo   - madmonacairo.com/admin/leads-feed = Live leads dashboard
echo   - /api/leads/capture                = Lead capture endpoint
echo.
echo Meta Ads workflow:
echo   1. Create ad in Meta Business Suite
echo   2. Destination URL: madmonacairo.com/ad-landing?utm_source=facebook^&utm_campaign=YOUR_CAMPAIGN_NAME
echo   3. Leads captured ^>^> AI scores in 5sec ^>^> high-priority emails sent immediately
echo.
pause
