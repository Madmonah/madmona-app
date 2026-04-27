@echo off
title مضمونة - Fix Git Remote
color 0A

echo ==========================================
echo        مضمونة - Fix Git Remote
echo ==========================================
echo.

echo 🔧 تصحيح Git remote للـ repository الجديد...
echo.

REM Remove old remote (if exists)
git remote remove origin >nul 2>&1

REM Add correct remote with actual username
git remote add origin https://github.com/Madmonah/madmona-app.git

echo ✅ Git remote updated to: Madmonah/madmona-app
echo.

echo 📤 Pushing code to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push failed! 
    echo Try again or check your GitHub credentials
    pause
) else (
    echo.
    echo ✅ SUCCESS! Code uploaded to GitHub!
    echo.
    echo 🔗 Repository: https://github.com/Madmonah/madmona-app
    echo.
    echo 🌐 Next step: Vercel Deployment
    echo 1. Visit: https://vercel.com
    echo 2. Sign in with GitHub
    echo 3. New Project ^> madmona-app
    echo 4. Deploy
    echo 5. Settings ^> Domains ^> madmonacairo.com
    echo.
    echo 🎉 Your website will be live at madmonacairo.com!
    echo.
    start https://vercel.com
)

pause
