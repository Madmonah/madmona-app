@echo off
setlocal
cd /d "C:\madmona-app"
echo Pushing the cron fix (Hobby plan: 1 cron/day max)...
git add .
git commit -m "fix: vercel cron schedule to daily (Hobby plan limit)"
git push origin main
echo.
echo Done. Vercel should now accept the deploy.
pause
