@echo off
title GitHub Repository Setup - مضمونة
color 0A
cls

echo ========================================
echo      GitHub Repository Setup - مضمونة
echo ========================================
echo.

echo 🚀 هنعمل repository جديد على GitHub ونرفع الكود
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ خطأ: تأكد إنك في مجلد C:\madmona-app
    echo انسخ الأمر ده وشغله:
    echo cd C:\madmona-app
    pause
    exit /b 1
)

echo ✅ إحنا في المجلد الصح!
echo.

REM Step 1: Git initialization
echo 📂 بداية إعداد Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git مش مُنصب على الجهاز
    echo نزل Git من: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git موجود!

REM Initialize git if not already done
if not exist ".git" (
    echo 🔧 إعداد Git repository...
    git init
    git branch -M main
) else (
    echo 📁 Git repository موجود بالفعل
)

REM Step 2: GitHub username
echo.
echo 👤 محتاجين اسم المستخدم بتاعك على GitHub:
set /p GITHUB_USERNAME="GitHub Username: "

if "%GITHUB_USERNAME%"=="" (
    echo ❌ لازم تكتب اسم المستخدم!
    pause
    exit /b 1
)

REM Step 3: Create .gitignore if not exists
if not exist ".gitignore" (
    echo 📄 إنشاء .gitignore...
    (
        echo # Dependencies
        echo /node_modules
        echo /.pnp
        echo .pnp.js
        echo.
        echo # Next.js
        echo /.next/
        echo /out/
        echo.
        echo # Environment files
        echo .env*.local
        echo .env
        echo.
        echo # Production
        echo /build
        echo.
        echo # Misc
        echo .DS_Store
        echo *.pem
        echo.
        echo # Debug
        echo npm-debug.log*
        echo yarn-debug.log*
        echo.
        echo # Vercel
        echo .vercel
        echo.
        echo # TypeScript
        echo *.tsbuildinfo
        echo next-env.d.ts
    ) > .gitignore
)

REM Step 4: Add all files
echo 📦 إضافة كل الملفات للـ repository...
git add .

REM Step 5: Commit
echo 💾 حفظ التغييرات...
git commit -m "Initial commit: Madmona coworking app ready for production

- Complete Next.js 14 app with TypeScript
- Arabic RTL design with Tailwind CSS
- Brand colors and design system
- PWA ready with service worker
- Space booking system (Indoor/Outdoor/Private/Meeting)
- QR code integration for smart locks
- Authentication system ready
- Supabase integration ready
- Mobile-first responsive design

Ready for deployment to madmonacairo.com"

REM Step 6: Remote setup
echo 🌐 ربط بـ GitHub repository...
set REPO_URL=https://github.com/%GITHUB_USERNAME%/madmona-app.git

REM Check if remote already exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin %REPO_URL%
) else (
    echo 🔗 Remote origin موجود بالفعل
)

echo.
echo ⚠️  الآن روح على GitHub وعمل repository جديد:
echo.
echo 🔗 افتح الرابط ده: https://github.com/new
echo 📝 Repository name: madmona-app
echo 📄 Description: Madmona coworking space booking app
echo 🔓 اختار Public أو Private (حسب رغبتك)
echo ❌ ماتختارش "Initialize with README"
echo ✅ اضغط "Create repository"
echo.

pause

REM Step 7: Push to GitHub
echo 📤 رفع الكود لـ GitHub...
echo ⏳ ده هياخد دقيقة أو اتنين...

git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ حصل خطأ في الرفع!
    echo.
    echo 🔧 جرب الحلول دي:
    echo 1. تأكد إنك عملت repository على GitHub
    echo 2. تأكد من اسم المستخدم: %GITHUB_USERNAME%
    echo 3. تأكد إن عندك إنترنت
    echo.
    echo أو شغل الأمر ده يدوياً:
    echo git push -u origin main
    echo.
    pause
    exit /b 1
)

echo.
echo 🎉 تمت! الكود اترفع بنجاح على GitHub!
echo.
echo 🔗 Repository URL: %REPO_URL%
echo.
echo 📋 الخطوات الجاية:
echo 1. ✅ GitHub Repository - خلاص!
echo 2. 🌐 Vercel Deployment - روح على vercel.com
echo 3. 🔗 Domain Setup - ربط madmonacairo.com
echo 4. ⚙️  Environment Variables - Supabase keys
echo.
echo 🎯 لما تخلص، الموقع هيبقى شغال على:
echo    https://madmonacairo.com
echo.

pause

REM Step 8: Open helpful links
echo 🔗 فتح المواقع المطلوبة...
start https://github.com/%GITHUB_USERNAME%/madmona-app
start https://vercel.com/dashboard

echo.
echo ✨ Git repository جاهز! بالتوفيق في باقي الخطوات!
echo.
pause
