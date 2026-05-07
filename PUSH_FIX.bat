@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "fix: default to madmona.admin@gmail.com (matches Resend testing account)"
git push origin main
echo.
echo Done. Vercel will auto-deploy.
pause
