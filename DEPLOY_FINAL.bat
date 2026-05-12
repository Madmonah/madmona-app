@echo off
chcp 65001 >nul
echo ================================================
echo  Madmona — FULL DEPLOY (NotificationButton + all)
echo ================================================
cd /d C:\madmona-app

REM Stage everything
git add -A
git status --short

REM Real commit with all changes
git commit -m "feat: wire NotificationButton into TopNav + finalize add-listing rebrand + force Vercel rebuild"

REM Push
git push origin main

echo.
echo ================================================
echo  Pushed. Vercel webhook should fire now.
echo  If it does not, check:
echo    https://vercel.com/dashboard
echo    Settings → Git → Deploy Hooks → create one
echo ================================================
pause
