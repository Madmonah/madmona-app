@echo off
title مضمونة - Deploy to madmonacairo.com
color 0A
cls

echo ==========================================
echo     مضمونة - Deploy to madmonacairo.com
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Project files not found
    echo Make sure you're in C:\madmona-app
    echo Run: cd C:\madmona-app
    pause
    exit /b 1
)

echo ✅ Project files found!
echo 📱 Project: Madmona Coworking App
echo 🌐 Domain: madmonacairo.com
echo 🎨 Design: Arabic RTL + Brand Colors
echo.

REM Check Git installation
echo 🔧 Checking Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git not installed
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git ready!
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
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git
echo 🔗 Repository: %REPO_URL%
echo.

REM Git setup
echo 📂 Setting up Git repository...
if not exist ".git" (
    git init
    git branch -M main
    echo ✅ Git initialized
) else (
    echo ✅ Git repository exists
)

echo 📦 Adding files...
git add .

echo 💾 Creating commit...
git commit -m "🚀 PRODUCTION: Madmona Coworking App

✨ Complete Features:
- Arabic RTL responsive web application
- 4 coworking spaces with dynamic pricing:
  • Indoor: 50ج/hr, 120ج/day, 2000ج/month
  • Outdoor: 65ج/day (garden space)
  • Private Office: 12000ج/month (up to 8 people)
  • Meeting Room: 300-500ج/hour
- WhatsApp integration: 01002229982
- Location: 7 Soliman St, Nasr City, Cairo
- Free trial banner: First day free
- PWA ready for mobile installation

🎨 Design System:
- Brand colors: #1F5F3F green, #B8860B gold, #C2410C orange
- Tailwind CSS with Arabic RTL support
- Mobile-first responsive design
- Smooth animations and interactions

🔧 Technical Stack:
- Next.js 14 with TypeScript
- Optimized for Vercel deployment
- Security headers configured
- SEO optimized for Egyptian market

🎯 Ready for madmonacairo.com production deployment!
Serving the coworking community in Cairo 🏢"

echo 🌐 Adding GitHub remote...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo ========================================
echo          DEPLOYMENT STEPS
echo ========================================
echo.

echo 1️⃣ CREATE GITHUB REPOSITORY:
echo    🔗 Opening GitHub in browser...
echo    📝 Repository name: madmona-app
echo    📄 Description: Madmona coworking space app
echo    ❌ DON'T check "Initialize with README"
echo    ✅ Click "Create repository"
echo.

start https://github.com/new

echo ⏳ Press Enter after creating the repository...
pause

echo 📤 Uploading code to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Upload failed!
    echo Make sure you created the repository first
    pause
    exit /b 1
) else (
    echo ✅ Code uploaded successfully!
    echo 🔗 Repository: %REPO_URL%
)

echo.
echo 2️⃣ VERCEL DEPLOYMENT:
echo    🔗 Opening Vercel in browser...
echo    🔑 Sign in with GitHub account
echo    📁 Select "madmona-app" repository  
echo    ⚙️ Framework: Next.js (auto-detected)
echo    🚀 Click "Deploy"
echo    ⏳ Wait 2-3 minutes for deployment
echo.

start https://vercel.com/dashboard

echo 3️⃣ DOMAIN SETUP:
echo    ⚙️ In Vercel Dashboard:
echo    📍 Settings ^> Domains
echo    🌐 Add domain: madmonacairo.com
echo    📋 Follow DNS configuration instructions
echo    ⏱️ Wait 5-10 minutes for activation
echo.

echo ========================================
echo           🎊 SUCCESS!
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
echo    ✅ Professional booking information
echo.

echo 🚀 Madmona is ready to serve customers!
echo.
pause
