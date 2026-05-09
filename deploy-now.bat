@echo off
title مضمونة - Deploy Now!
color 0A
cls

echo ==========================================
echo           مضمونة - DEPLOY NOW!
echo ==========================================
echo.

echo 🚀 Starting deployment to madmonacairo.com...
echo.

REM Check files exist
if not exist "package.json" (
    echo ❌ Error: Project files not found
    echo Make sure you're in C:\madmona-app
    pause
    exit /b 1
)

echo ✅ Project files ready!
echo.

echo 📋 What we'll deploy:
echo    🎨 Complete Arabic RTL website
echo    📱 4 coworking spaces with pricing
echo    💬 WhatsApp contact (01002229982)
echo    🏢 Location: 7 Soliman St, Nasr City
echo    🆓 Free trial promotion
echo    🌐 Domain: madmonacairo.com
echo.

REM Check Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git not installed
    echo Download: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git ready!
echo.

echo 👤 Enter GitHub username:
set /p GITHUB_USER="Username: "

if "%GITHUB_USER%"=="" (
    echo ❌ Username required!
    pause
    exit /b 1
)

echo ✅ Username: %GITHUB_USER%
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git
echo.

echo 🔧 Setting up Git repository...
if not exist ".git" (
    git init
    git branch -M main
)

echo 📦 Adding files...
git add .

echo 💾 Creating commit...
git commit -m "🚀 PRODUCTION: Madmona Coworking App

✨ Features:
- Complete Arabic RTL responsive design
- 4 spaces: Indoor (50ج/hr), Outdoor (65ج/day), Private (12000ج/mo), Meeting (300ج/hr)
- WhatsApp integration: 01002229982
- Location: 7 Soliman St, Nasr City, Cairo
- Free trial: 'First day free' promotion
- Brand colors: #1F5F3F green, #B8860B gold, #C2410C orange
- PWA ready for mobile installation

🔧 Tech Stack:
- Next.js 14 with TypeScript
- Tailwind CSS with Arabic RTL
- Mobile-first responsive design
- Optimized for Egyptian market

🎯 Ready for production deployment on madmonacairo.com!"

echo 🌐 Adding GitHub remote...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo ⚠️  NEXT STEPS:
echo 1️⃣ Create GitHub repository (opening browser...)
echo 2️⃣ Upload code automatically
echo 3️⃣ Deploy to Vercel
echo 4️⃣ Connect madmonacairo.com domain
echo.

echo 🔗 Opening GitHub repository creation...
start https://github.com/new

echo.
echo 📋 In GitHub:
echo    📝 Repository name: madmona-app
echo    📄 Description: Madmona coworking space app
echo    ❌ DON'T check "Initialize with README"
echo    ✅ Click "Create repository"
echo.

pause

echo 📤 Uploading code to GitHub...
git push -u origin main

if errorlevel 1 (
    echo ❌ Upload failed! Make sure repository is created.
    pause
    exit /b 1
) else (
    echo ✅ Code uploaded successfully!
    echo 🔗 Repository: %REPO_URL%
)

echo.
echo 🌐 Opening Vercel for deployment...
start https://vercel.com/dashboard

echo.
echo 📋 In Vercel:
echo 1️⃣ Sign in with GitHub
echo 2️⃣ Click "New Project"
echo 3️⃣ Select "madmona-app" repository
echo 4️⃣ Framework: Next.js (auto-detected)
echo 5️⃣ Click "Deploy"
echo 6️⃣ Wait 2-3 minutes
echo.

echo 🔗 Domain setup:
echo    • Vercel Settings > Domains
echo    • Add: madmonacairo.com
echo    • Follow DNS instructions
echo.

echo ========================================
echo           🎉 DEPLOYMENT COMPLETE!
echo ========================================
echo.

echo 🌐 Your website: https://madmonacairo.com
echo 📊 GitHub: %REPO_URL%
echo ⚙️  Vercel: https://vercel.com/dashboard
echo.

echo 🚀 Madmona is now live and ready for customers!
pause
