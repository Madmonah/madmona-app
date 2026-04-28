@echo off
title مضمونة - Test Build Locally
color 0A

echo ==========================================
echo        مضمونة - Test Build Locally  
echo ==========================================
echo.

echo 📋 اختبار البناء محلياً عشان نشوف نفس خطأ Vercel...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ مش في مجلد المشروع الصح
    echo شغل الأمر ده: cd C:\madmona-app
    pause
    exit
)

echo ✅ Package.json موجود
echo.

echo 🧹 تنظيف المشروع...
if exist "node_modules" rmdir /s /q node_modules >nul 2>&1
if exist ".next" rmdir /s /q .next >nul 2>&1
echo ✅ تم تنظيف node_modules و .next
echo.

echo 📦 تثبيت Dependencies...
call npm install

if errorlevel 1 (
    echo.
    echo ❌ فشل في تثبيت Dependencies!
    echo ده ممكن يكون سبب مشكلة Preview
    pause
    exit
)

echo ✅ Dependencies installed successfully
echo.

echo 🔨 اختبار Build...
call npm run build

if errorlevel 1 (
    echo.
    echo ❌ Build فشل محلياً!
    echo ده هو نفس الخطأ اللي في Vercel Preview
    echo شوف الرسائل اللي فوق للتفاصيل
    echo.
    pause
) else (
    echo.
    echo ✅ Build نجح محلياً!
    echo.
    echo يبقى المشكلة ممكن تكون:
    echo 1. Cache قديم في Vercel
    echo 2. Environment variables
    echo 3. Node version مختلف
    echo.
    echo 🚀 جرب Push جديد:
    echo git add .
    echo git commit -m "Fix preview deployment"
    echo git push
    echo.
    pause
)
