@echo off
title مضمونة - Complete Deployment Setup
color 0A
cls

echo.
echo ==========================================
echo      مضمونة - Complete Deployment Setup
echo ==========================================
echo.

echo 🚀 هنعمل deployment كامل لـ madmonacairo.com
echo.

REM Check if in correct directory
if not exist "package.json" (
    echo ❌ تأكد إنك في مجلد C:\madmona-app
    echo انسخ الأوامر دي:
    echo cd C:\madmona-app
    echo deploy-complete.bat
    pause
    exit /b 1
)

echo ✅ الملفات موجودة! هنبدأ...
echo.

REM Check Git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git مش مُنصب
    echo نزل من: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git جاهز!
echo.

REM Get GitHub username
echo 👤 اكتب GitHub username بتاعك:
set /p GITHUB_USER="Username: "

if "%GITHUB_USER%"=="" (
    echo ❌ لازم تكتب اليوزر نيم!
    pause
    exit /b 1
)

echo ✅ Username: %GITHUB_USER%
echo.

REM Initialize Git
echo 📂 إعداد Git repository...
if not exist ".git" (
    git init
    git branch -M main
)

echo 📦 إضافة الملفات...
git add .
git commit -m "🚀 Initial: Madmona coworking app ready for production

✨ Complete Next.js app with:
- Arabic RTL design
- 4 spaces booking system  
- PWA ready
- Brand colors & design
- Mobile-first responsive
- Contact integration

Ready for madmonacairo.com deployment! 🎯"

echo 🌐 ربط GitHub repository...
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git

REM Add remote
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo 📋 الآن محتاج تعمل repository على GitHub:
echo.
echo 🔗 هفتحلك GitHub في المتصفح
echo 📝 Repository name: madmona-app
echo ❌ ماتختارش "Initialize with README"  
echo ✅ اضغط "Create repository"
echo.

start https://github.com/new

echo ⏳ استنى لحد ما تخلص إنشاء الـ repository...
pause

echo 📤 رفع الكود لـ GitHub...
git push -u origin main

if errorlevel 1 (
    echo ❌ فيه مشكلة في الرفع
    echo تأكد من إنشاء الـ repository الأول
    pause
) else (
    echo ✅ الكود اترفع بنجاح! 
)

echo.
echo 🌐 الآن هنروح على Vercel:
echo.
echo 1️⃣ هفتحلك Vercel
echo 2️⃣ سجل دخول بـ GitHub
echo 3️⃣ اختار "madmona-app" repository  
echo 4️⃣ اضغط "Deploy"
echo 5️⃣ استنى 2-3 دقائق للنشر
echo.

start https://vercel.com/dashboard

echo 🔗 بعد النشر:
echo.
echo 📍 في Vercel Dashboard:
echo   • روح Settings > Domains
echo   • أضيف: madmonacairo.com
echo   • اتبع DNS instructions
echo.
echo 🎉 النتيجة: الموقع هيبقى شغال على madmonacairo.com
echo.
echo 📊 URLs مهمة:
echo   • Live Site: https://madmonacairo.com
echo   • GitHub: %REPO_URL%
echo   • Vercel: https://vercel.com/dashboard
echo.

echo ✨ كل التوفيق! 🚀
pause
