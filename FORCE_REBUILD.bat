@echo off
echo ===============================================
echo  FORCE Vercel rebuild via empty commit
echo ===============================================
cd /d C:\madmona-app

REM Empty commit to retrigger Vercel webhook
git commit --allow-empty -m "chore: force Vercel rebuild (webhook retrigger)"

REM Push to main
git push origin main

echo.
echo ===============================================
echo  Pushed empty commit. Vercel should rebuild.
echo  Wait 2-3 minutes then check madmonacairo.com
echo ===============================================
pause
