@echo off
title مضمونة - Retry Push
color 0A

echo ==========================================
echo           مضمونة - Retry Push
echo ==========================================
echo.

echo 📤 محاولة رفع الكود تاني...
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ لسه فيه مشكلة!
    echo.
    echo تأكد من:
    echo ✅ عملت repository على GitHub
    echo ✅ Repository name هو: madmona-app
    echo ✅ Username هو: madmonacairo
    echo ✅ ماختارتش "Initialize with README"
    echo.
    pause
) else (
    echo.
    echo ✅ تمام! الكود اترفع بنجاح!
    echo.
    echo 🌐 الخطوة الجاية: Vercel
    echo 1. روح على https://vercel.com
    echo 2. Sign in with GitHub
    echo 3. New Project ^> madmona-app
    echo 4. Deploy
    echo 5. Settings ^> Domains ^> madmonacairo.com
    echo.
    echo 🎉 الموقع هيبقى شغال على madmonacairo.com
    echo.
    start https://vercel.com
)

pause
