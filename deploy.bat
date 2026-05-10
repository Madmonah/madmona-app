@echo off
echo ===============================================
echo  Deploying: list-your-asset page + signup pre-fill
echo ===============================================
cd /d C:\madmona-app
git add -A
git commit -m "feat: public /list-your-asset guest flow + signup pre-fill + OG image"
git push origin main
echo.
echo Pushed. Vercel will auto-deploy in ~2 minutes.
echo Test URL after deploy: https://madmonacairo.com/list-your-asset
pause
