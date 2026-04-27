@echo off
title مضمونة - Quick Start Deployment
color 0A
cls

echo ========================================
echo        مضمونة - Quick Start Deployment  
echo ========================================
echo.

echo 🚀 هنبدأ النشر على madmonacairo.com
echo.

REM Check if we have the required files
echo ✅ فحص الملفات...
if not exist "package.json" (
    echo ❌ خطأ: ملفات المشروع مش موجودة
    echo تأكد إنك في مجلد C:\madmona-app
    pause
    exit /b 1
)

echo ✅ كل الملفات موجودة!
echo.

echo 📋 الخطوات المطلوبة:
echo.
echo 1️⃣ GitHub Repository - هنعملها دلوقتي
echo 2️⃣ Vercel Deployment - بعد كده
echo 3️⃣ Domain Connection - آخر خطوة  
echo.

pause

echo 🔧 إعداد Git Repository...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git مش مُنصب
    echo نزل من: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Initialize git
if not exist ".git" (
    git init
    git branch -M main
)

echo 👤 محتاج اسم المستخدم على GitHub:
set /p GITHUB_USERNAME="GitHub Username: "

if "%GITHUB_USERNAME%"=="" (
    echo ❌ لازم تكتب اسم المستخدم!
    pause
    exit /b 1
)

echo ✅ Username: %GITHUB_USERNAME%
echo.

echo 📦 تجهيز الملفات للرفع...
git add .
git commit -m "🚀 Initial commit: Madmona coworking app ready for production

✨ Features:
- Complete Next.js 14 app with Arabic RTL
- 4 spaces: Indoor, Outdoor, Private Office, Meeting Room  
- PWA ready with offline support
- Brand design with Tailwind CSS
- Mobile-first responsive design
- Contact integration (WhatsApp + Phone)
- Free trial banner
- Ready for Supabase backend

🎯 Ready for deployment to madmonacairo.com"

echo 🌐 ربط بـ GitHub repository...
set REPO_URL=https://github.com/%GITHUB_USERNAME%/madmona-app.git

REM Check if remote exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin %REPO_URL%
) else (
    echo 🔗 Remote origin موجود
)

echo.
echo ⚠️  دلوقتي محتاج تعمل repository على GitHub:
echo.
echo 🔗 هفتحلك GitHub في المتصفح
echo 📝 Repository name: madmona-app  
echo 📄 Description: Madmona coworking space booking app
echo ❌ ماتختارش "Initialize with README"
echo ✅ اضغط "Create repository"
echo.

start https://github.com/new

echo ⏳ استنى لما تخلص إنشاء الـ repository...
pause

echo 📤 رفع الكود لـ GitHub...
git push -u origin main

if errorlevel 1 (
    echo ❌ حصل خطأ في الرفع!
    echo جرب تاني بعد ما تتأكد من إنشاء الـ repository
    pause
    exit /b 1
)

echo.
echo 🎉 تمام! الكود اترفع على GitHub بنجاح!
echo.
echo 🔗 Repository: %REPO_URL%
echo.

echo 🌐 فتح Vercel للنشر...
start https://vercel.com/dashboard

echo.
echo ✅ الخطوة الجاية:
echo 1. روح على vercel.com 
echo 2. سجل دخول بـ GitHub
echo 3. اختار madmona-app repository
echo 4. اضغط Deploy
echo.
echo 🎯 بعد النشر هنربط Domain: madmonacairo.com
echo.

echo 🚀 الموقع هيبقى شغال في 15 دقيقة!
pause
