@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "fix: hardcode email from/to for Resend testing mode (bypass Vercel env cache)"
git push origin main
echo.
echo Done. Vercel will auto-deploy.
echo Wait 90 seconds then test the agents.
pause
