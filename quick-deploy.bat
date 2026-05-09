@echo off
echo 🚀 مضمونة - Quick Deploy
echo =========================

REM Check files
if not exist "package.json" (
    echo ❌ Error: Run this from C:\madmona-app
    pause
    exit
)

echo ✅ Files ready!

REM Get GitHub username
set /p USER="GitHub username: "
set REPO=https://github.com/%USER%/madmona-app.git

REM Git setup
git init
git add .
git commit -m "🚀 Madmona coworking app - Ready for madmonacairo.com"
git remote add origin %REPO%

echo.
echo 📋 NEXT STEPS:
echo 1. Create repository: madmona-app on GitHub
echo 2. Run: git push -u origin main
echo 3. Deploy on Vercel: vercel.com
echo 4. Add domain: madmonacairo.com
echo.

start https://github.com/new
start https://vercel.com/dashboard

echo Ready to go live! 🎉
pause
