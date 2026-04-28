@echo off
title مضمونة - Complete Deployment Diagnosis
color 0A

echo ==========================================
echo     مضمونة - Complete Deployment Fix
echo ==========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ مش في مجلد المشروع الصح
    echo شغل الأمر ده: cd C:\madmona-app
    pause
    exit
)

echo ✅ في المجلد الصح
echo.

echo 🔍 تشخيص المشكلة...
echo.

echo 1️⃣ اختبار البناء محلياً...
echo =====================================

REM Clean everything first
echo 🧹 تنظيف المشروع...
if exist "node_modules" rmdir /s /q node_modules >nul 2>&1
if exist ".next" rmdir /s /q .next >nul 2>&1
echo ✅ تم التنظيف

echo.
echo 📦 تثبيت Dependencies جديدة...
call npm install --force --silent

if errorlevel 1 (
    echo.
    echo ❌ مشكلة في npm install!
    echo ده ممكن يكون سبب Preview Deployment
    echo جرب:
    echo npm cache clean --force
    echo npm install
    pause
    goto :vercel_check
)

echo ✅ Dependencies installed
echo.

echo 🔨 اختبار البناء...
call npm run build

if errorlevel 1 (
    echo.
    echo ❌ Build فشل محلياً!
    echo ده هو سبب Preview Deployment error
    echo شوف الأخطاء اللي فوق وصلحها
    echo.
    pause
    goto :vercel_check
) else (
    echo.
    echo ✅ Build نجح محلياً!
    echo يبقى المشكلة في Vercel settings أو cache
    echo.
)

:vercel_check
echo.
echo 2️⃣ فحص الـ Domain...
echo =====================================

echo 🌐 اختبار madmonacairo.com...

REM Test domain resolution
ping -n 1 madmonacairo.com >nul 2>&1
if errorlevel 1 (
    echo ❌ Domain مش بيرد على ping
    echo المشكلة في DNS settings
) else (
    echo ✅ Domain بيرد على ping
)

echo.
echo 3️⃣ حلول المشاكل...
echo =====================================

echo 🔧 جرب الحلول دي:
echo.
echo أ) Force Push جديد:
echo    git add .
echo    git commit -m "Fix deployment issues"
echo    git push --force
echo.
echo ب) في Vercel Dashboard:
echo    1. روح على https://vercel.com/dashboard
echo    2. اختار madmona-app
echo    3. اضغط "Redeploy" أو "Rebuild"
echo    4. انتظر 5 دقائق
echo.
echo ج) Clear Vercel Cache:
echo    Settings ^> General ^> Clear Build Cache
echo.

echo 🎯 لو عايز تعمل Force Push دلوقتي، اضغط Enter:
pause

echo 📤 Force Push للكود...
git add . >nul 2>&1
git commit -m "🔧 Fix preview deployment issues - force rebuild" >nul 2>&1
git push --force

if errorlevel 1 (
    echo ❌ مشكلة في Git Push
    echo تأكد من GitHub credentials
) else (
    echo ✅ تم رفع الكود بنجاح
    echo.
    echo 🚀 الخطوة الجاية:
    echo 1. روح على https://vercel.com/dashboard
    echo 2. شوف madmona-app project
    echo 3. انتظر Deployment الجديد (5 دقائق)
    echo 4. اختبر https://madmonacairo.com
    echo.
    start https://vercel.com/dashboard
)

echo.
echo 📋 ملخص التشخيص:
echo =====================================
if exist ".next\BUILD_ID" (
    echo ✅ Build نجح محلياً
) else (
    echo ❌ Build فشل محلياً
)

echo.
echo 📱 اختبار سريع:
echo افتح https://madmonacairo.com في متصفح وشوف إيه اللي بيحصل
echo.

echo 🆘 لو لسه مش شغال:
echo 1. ابعت screenshot من Vercel deployment logs
echo 2. ابعت أي error messages ظاهرة
echo 3. قول إيه اللي حصل لما فتحت الموقع

pause
