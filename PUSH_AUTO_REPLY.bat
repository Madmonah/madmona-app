@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Auto-WhatsApp Reply + Meta Pixel Lead Event
echo ================================================================
echo.
git add .
git status --short
echo.
git commit -m "feat: auto-WhatsApp reply for high-priority leads + Meta Pixel Lead event for ad attribution"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo What's NEW:
echo   - Lead score 70+ ^>^> AI sends WhatsApp greeting AUTOMATICALLY
echo     (only works after WhatsApp creds added to Vercel env vars)
echo   - Meta Pixel "Lead" event fires on form submit
echo     (for Meta ad attribution - shows in Ads Manager as conversion)
echo.
pause
