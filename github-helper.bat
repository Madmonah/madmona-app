@echo off
title مضمونة - GitHub Helper
color 0A

echo ==========================================
echo          مضمونة - GitHub Helper
echo ==========================================
echo.

echo هنشوف لو عندك GitHub account ولا محتاج نعمل واحد جديد
echo.

echo 🔍 إزاي تعرف GitHub username بتاعك:
echo.
echo 1. افتح Chrome
echo 2. روح على github.com
echo 3. لو سجلت دخول قبل كده، هتشوف اسمك في اليمين فوق
echo 4. لو مش سجلت دخول، اضغط "Sign in"
echo.

echo 🆕 لو مبرش عملت GitHub account:
echo.
echo 1. افتح Chrome
echo 2. روح على github.com/signup
echo 3. اختار username زي: madmonacairo أو mohamedmadmona
echo 4. حط email وpassword
echo 5. اتبع التعليمات
echo.

echo ⚠️  مهم: فتكر الـ username لأنك هتحتاجه!
echo.

echo 🚀 لما تبقى جاهز:
echo.
echo اكتب GitHub username هنا:
set /p GITHUB_USER="Username: "

if "%GITHUB_USER%"=="" (
    echo.
    echo ❌ مفيش username! شوف الخطوات اللي فوق الأول
    pause
    exit
)

echo.
echo ✅ تمام! GitHub username: %GITHUB_USER%
echo.

REM Create repository URL
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git
echo 🔗 Repository URL: %REPO_URL%
echo.

REM Check if project exists
if not exist "package.json" (
    echo ❌ مش في مجلد المشروع الصح
    echo شغل الأمر ده: cd C:\madmona-app
    pause
    exit
)

echo 📂 تجهيز Git...
git init >nul 2>&1
git add . >nul 2>&1
git commit -m "🚀 Madmona website - Ready for madmonacairo.com" >nul 2>&1

echo ✅ Git جاهز!
echo.

echo 📋 دلوقتي محتاج تعمل repository على GitHub:
echo.
echo 1. افتح Chrome
echo 2. روح على github.com/new
echo 3. Repository name: madmona-app
echo 4. اختار Public أو Private
echo 5. ❌ ماتختارش "Initialize with README"
echo 6. اضغط "Create repository"
echo.

pause

echo 📤 رفع الكود لـ GitHub...
git remote add origin %REPO_URL%
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ مشكلة في الرفع!
    echo تأكد إنك عملت repository على GitHub
    echo Repository name لازم يكون: madmona-app
    pause
) else (
    echo.
    echo ✅ تمام! الكود اترفع على GitHub
    echo.
    echo 🌐 الخطوة الجاية: Vercel
    echo 1. روح على vercel.com
    echo 2. Sign in with GitHub
    echo 3. New Project > madmona-app
    echo 4. Deploy
    echo 5. Settings > Domains > madmonacairo.com
    echo.
    echo 🎉 الموقع هيبقى شغال على madmonacairo.com
)

pause
