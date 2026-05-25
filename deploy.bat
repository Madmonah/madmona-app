@echo off
echo ===============================================
echo  Deploying: guest booking funnel fix (May 25 2026)
echo ===============================================
cd /d C:\madmona-app
git add -A
git commit -m "fix(booking): guest checkout by phone + enum fix + flat pricing — unblock zero-bookings funnel"
git push origin main
echo.
echo Pushed. Vercel auto-deploys in ~2 minutes.
echo TEST (incognito, NOT logged in): open a listing on https://madmonacairo.com/marketplace and book it.
pause
