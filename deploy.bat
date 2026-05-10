@echo off
echo ===============================================
echo  Deploying: single-step list+signup form
echo ===============================================
cd /d C:\madmona-app
git add -A
git commit -m "feat: combine asset listing + account creation in single form on /list-your-asset"
git push origin main
echo.
echo Pushed. Vercel will auto-deploy in ~2 minutes.
echo Test URL: https://madmonacairo.com/list-your-asset
pause
