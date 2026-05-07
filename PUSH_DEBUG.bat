@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "debug: add temporary env var inspector for agents"
git push origin main
echo.
echo Done. Vercel will auto-deploy.
pause
