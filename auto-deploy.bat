@echo off
title مضمونة - Auto Deploy to madmonacairo.com
color 0A
cls

echo ==========================================
echo     مضمونة - AUTO DEPLOY STARTING...
echo ==========================================
echo.

REM Check if we're in the right place
if not exist "package.json" (
    echo ❌ خطأ: ملفات المشروع مش موجودة
    echo تأكد إنك في C:\madmona-app
    pause
    exit /b 1
)

echo ✅ Project files found!
echo 🚀 Starting deployment to madmonacairo.com...
echo.

REM Check Git installation
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git not installed
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git is ready!
echo.

REM Get GitHub username
echo 👤 Enter your GitHub username:
set /p GITHUB_USER="Username: "

if "%GITHUB_USER%"=="" (
    echo ❌ Username required!
    pause
    exit /b 1
)

echo ✅ Username: %GITHUB_USER%
echo 🔗 Repository will be: https://github.com/%GITHUB_USER%/madmona-app
echo.

REM Initialize Git repository
echo 📂 Setting up Git repository...
if not exist ".git" (
    git init
    git branch -M main
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository exists
)

REM Add all files
echo 📦 Adding all files...
git add .

REM Create commit
echo 💾 Creating commit...
git commit -m "🚀 PRODUCTION: Madmona Coworking App

✨ Complete Arabic RTL web application for coworking space booking
- 4 spaces: Indoor, Outdoor, Private Office, Meeting Room
- PWA ready with offline support  
- Brand design: #1F5F3F green, #B8860B gold, #C2410C orange
- Contact: WhatsApp 01002229982, Location: 7 Soliman St
- Free trial promotion: First day free
- Mobile-first responsive design with Tailwind CSS
- TypeScript + Next.js 14 for production reliability

🎯 Ready for deployment on madmonacairo.com
📱 Optimized for Egyptian market and Arabic users"

REM Add remote
echo 🌐 Connecting to GitHub...
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo ========================================
echo    GITHUB REPOSITORY CREATION NEEDED
echo ========================================
echo.
echo 🔗 Opening GitHub in your browser...
echo.
echo ⚠️  IMPORTANT: Create repository with these settings:
echo    📝 Repository name: madmona-app
echo    📄 Description: Madmona coworking space booking app  
echo    🔓 Visibility: Public or Private (your choice)
echo    ❌ DO NOT check "Initialize with README"
echo    ✅ Click "Create repository"
echo.

start https://github.com/new

echo ⏳ Waiting for you to create the repository...
echo    (Press Enter after creating the repository)
pause

echo 📤 Uploading code to GitHub...
git push -u origin main

if errorlevel 1 (
    echo ❌ Upload failed!
    echo Make sure you created the repository first
    pause
    exit /b 1
) else (
    echo ✅ Code uploaded successfully!
)

echo.
echo ========================================
echo       VERCEL DEPLOYMENT STARTING...
echo ========================================
echo.

echo 🌐 Opening Vercel dashboard...
start https://vercel.com/dashboard

echo.
echo 📋 Follow these steps in Vercel:
echo 1️⃣ Sign in with GitHub account
echo 2️⃣ Click "New Project"
echo 3️⃣ Find and select "madmona-app" repository
echo 4️⃣ Framework: Next.js (auto-detected)
echo 5️⃣ Click "Deploy" 
echo 6️⃣ Wait 2-3 minutes for deployment
echo.

pause

echo.
echo ========================================
echo        DOMAIN SETUP (FINAL STEP)
echo ========================================
echo.

echo 🔗 In Vercel Dashboard:
echo 1️⃣ Go to your project > Settings
echo 2️⃣ Click "Domains" in sidebar  
echo 3️⃣ Add domain: madmonacairo.com
echo 4️⃣ Follow DNS configuration instructions
echo 5️⃣ Wait 5-10 minutes for propagation
echo.

echo ========================================
echo              🎉 SUCCESS!
echo ========================================
echo.

echo 🌐 Your website will be live at:
echo    https://madmonacairo.com
echo.
echo 📊 Management URLs:
echo    • GitHub: %REPO_URL%
echo    • Vercel: https://vercel.com/dashboard
echo    • Domain: Cloudflare DNS settings
echo.
echo 🎯 Website Features Ready:
echo    ✅ Arabic RTL design with brand colors
echo    ✅ 4 coworking spaces with pricing
echo    ✅ WhatsApp contact integration
echo    ✅ PWA for mobile installation
echo    ✅ Free trial promotion
echo    ✅ Professional booking system
echo.

echo 🚀 Madmona is now ready to serve customers!
echo.
pause
