@echo off
title مضمونة - Continue Push
color 0A

echo ==========================================
echo         مضمونة - Continue Push
echo ==========================================
echo.

echo 📤 بعد إنشاء repository على GitHub، اضغط Enter للمحاولة تاني:
pause

echo 🔄 محاولة رفع الكود تاني...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ لسه فيه مشكلة!
    echo.
    echo تأكد من:
    echo 1. إنك عملت repository على GitHub
    echo 2. Repository name هو: madmona-app
    echo 3. Username هو: madmonacairo
    echo.
    echo جرب تاني لما تتأكد من الخطوات دي
    pause
) else (
    echo.
    echo ✅ تمام! الكود اترفع بنجاح!
    echo.
    echo 🌐 الخطوة الجاية:
    echo 1. روح على https://vercel.com
    echo 2. Sign in with GitHub
    echo 3. New Project > madmona-app  
    echo 4. Deploy
    echo 5. Settings > Domains > madmonacairo.com
    echo.
    echo 🎉 الموقع هيبقى شغال على madmonacairo.com
    echo.
    start https://vercel.com
)

pause
