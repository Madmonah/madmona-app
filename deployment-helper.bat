@echo off
title مضمونة - Deployment Helper
color 0A

echo.
echo ========================================
echo           مضمونة - Deployment Helper
echo ========================================
echo.

echo 🔗 الـ URLs المهمة:
echo.
echo 📱 الموقع النهائي:
echo    https://madmonacairo.com
echo.
echo 🔧 Vercel Dashboard:
echo    https://vercel.com/dashboard
echo.
echo 💾 GitHub Repository: 
echo    https://github.com/YOUR_USERNAME/madmona-app
echo    ^(غير YOUR_USERNAME باسمك^)
echo.
echo 🗄️  Supabase Dashboard:
echo    https://app.supabase.com
echo.
echo ========================================
echo.

:MENU
echo اختار العملية اللي عايز تعملها:
echo.
echo 1. رفع التحديثات لـ GitHub
echo 2. فتح Vercel Dashboard  
echo 3. فتح Supabase Dashboard
echo 4. فتح الموقع النهائي
echo 5. عرض معلومات Git
echo 6. خروج
echo.
set /p choice="اختار رقم (1-6): "

if "%choice%"=="1" goto :GIT_PUSH
if "%choice%"=="2" goto :OPEN_VERCEL
if "%choice%"=="3" goto :OPEN_SUPABASE
if "%choice%"=="4" goto :OPEN_SITE
if "%choice%"=="5" goto :GIT_STATUS
if "%choice%"=="6" goto :EXIT
goto :MENU

:GIT_PUSH
echo.
echo 📤 رفع التحديثات لـ GitHub...
git add .
git commit -m "Update: %date% %time%"
git push
echo ✅ تم رفع التحديثات بنجاح!
echo.
pause
goto :MENU

:OPEN_VERCEL
start https://vercel.com/dashboard
echo ✅ تم فتح Vercel Dashboard
goto :MENU

:OPEN_SUPABASE
start https://app.supabase.com
echo ✅ تم فتح Supabase Dashboard  
goto :MENU

:OPEN_SITE
start https://madmonacairo.com
echo ✅ تم فتح الموقع النهائي
goto :MENU

:GIT_STATUS
echo.
echo 📊 حالة Git Repository:
echo.
git status
git log --oneline -5
echo.
pause
goto :MENU

:EXIT
echo.
echo 👋 شكراً لاستخدام مضمونة!
echo 🚀 الموقع شغال على: https://madmonacairo.com
echo.
pause
exit
