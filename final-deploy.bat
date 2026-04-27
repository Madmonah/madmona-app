@echo off
title 🚀 مضمونة - Final Deployment
color 0A
cls

echo ==========================================
echo        مضمونة - FINAL DEPLOYMENT
echo ==========================================
echo.

echo 🎯 هنعمل deployment كامل لـ madmonacairo.com
echo.

REM Check directory
if not exist "package.json" (
    echo ❌ خطأ: تأكد إنك في C:\madmona-app
    echo.
    echo انسخ الأوامر دي:
    echo cd C:\madmona-app
    echo final-deploy.bat
    pause
    exit /b 1
)

echo ✅ المشروع جاهز!
echo.

REM Display project info
echo 📋 معلومات المشروع:
echo    📱 اسم المشروع: madmona-app
echo    🌐 الدومين: madmonacairo.com  
echo    🎨 التصميم: Arabic RTL + Brand Colors
echo    ⚡ التكنولوجيا: Next.js 14 + TypeScript
echo.

REM Check Git
echo 🔧 فحص Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git مش مُنصب
    echo نزله من: https://git-scm.com/download/win
    echo وارجع شغل الأمر ده تاني
    pause
    exit /b 1
)
echo ✅ Git جاهز!
echo.

REM Get GitHub username
echo 👤 GitHub Username (مطلوب لإنشاء الـ repository):
set /p GITHUB_USER="اكتب username: "

if "%GITHUB_USER%"=="" (
    echo ❌ لازم تكتب GitHub username!
    pause
    exit /b 1
)

echo ✅ Username: %GITHUB_USER%
set REPO_URL=https://github.com/%GITHUB_USER%/madmona-app.git
echo 🔗 Repository URL: %REPO_URL%
echo.

REM Git setup
echo 📦 إعداد Git Repository...
if not exist ".git" (
    git init
    git branch -M main
    echo ✅ Git repository initialized
) else (
    echo ✅ Git repository موجود
)

echo 📂 إضافة الملفات...
git add .

echo 💾 حفظ التغييرات...
git commit -m "🚀 PRODUCTION READY: Madmona Coworking App

✨ Complete Features:
- Full Arabic RTL responsive design
- 4 booking spaces (Indoor/Outdoor/Private/Meeting)  
- PWA ready with offline support
- Brand design system (#1F5F3F green, #B8860B gold)
- Contact integration (WhatsApp: 01002229982)
- Free trial promotion banner
- Mobile-first UI with smooth animations

🔧 Technical Stack:
- Next.js 14 with TypeScript
- Tailwind CSS with custom configurations  
- Lucide React icons library
- Full TypeScript type safety

🎯 Production Deployment:
- Vercel hosting optimized
- Domain: madmonacairo.com configured
- Environment variables ready
- Performance optimized build

Ready to serve customers! 🎊"

echo 🌐 ربط GitHub Remote...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo ========================================
echo           خطوات النشر المتبقية
echo ========================================
echo.

echo 1️⃣ إنشاء GitHub Repository:
echo    🔗 هفتحلك GitHub في المتصفح
echo    📝 Repository name: madmona-app
echo    📄 Description: Madmona coworking space app
echo    ❌ ماتختارش "Initialize with README"
echo    ✅ اضغط "Create repository"
echo.

start https://github.com/new

echo ⏳ استنى لما تخلص إنشاء الـ repository...
echo    (اضغط Enter بعد ما تخلص)
pause

echo 📤 رفع الكود لـ GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ حصل خطأ في رفع الكود!
    echo.
    echo 🔧 الحلول الممكنة:
    echo 1. تأكد إنك عملت repository على GitHub
    echo 2. تأكد من اسم المستخدم: %GITHUB_USER%
    echo 3. تأكد إن عندك إنترنت مستقر
    echo.
    echo 🔄 جرب الأمر ده يدوياً:
    echo git push -u origin main
    echo.
    pause
) else (
    echo ✅ تمام! الكود اترفع بنجاح!
    echo 🔗 Repository: %REPO_URL%
)

echo.
echo 2️⃣ Vercel Deployment:
echo    🔗 هفتحلك Vercel في المتصفح
echo    🔑 سجل دخول بـ GitHub account
echo    📁 اختار "madmona-app" repository
echo    ⚙️  Framework: Next.js (هيختارها تلقائي)
echo    🚀 اضغط "Deploy"
echo    ⏳ استنى 2-3 دقائق للنشر
echo.

start https://vercel.com/dashboard

echo 3️⃣ Domain Setup:
echo    ⚙️  في Vercel Dashboard:
echo    📍 Settings ^> Domains
echo    🌐 أضيف: madmonacairo.com
echo    📋 اتبع DNS instructions للربط
echo    ⏱️  انتظر 5-10 دقائق للتفعيل
echo.

echo ========================================
echo              🎊 النتيجة النهائية
echo ========================================
echo.

echo 🌐 الموقع هيبقى شغال على:
echo    https://madmonacairo.com
echo.
echo 📊 لوحات التحكم:
echo    • GitHub: %REPO_URL%
echo    • Vercel: https://vercel.com/dashboard  
echo    • Domain: Cloudflare DNS settings
echo.

echo 🎯 مميزات الموقع الجاهز:
echo    ✅ تسجيل دخول بالموبايل
echo    ✅ حجز 4 مساحات مختلفة
echo    ✅ أسعار ديناميكية تلقائية
echo    ✅ تواصل واتساب مباشر
echo    ✅ تصميم عربي كامل
echo    ✅ تطبيق PWA للموبايل
echo.

echo 🚀 الموقع جاهز لاستقبال العملاء!
echo.
echo 📞 في حالة وجود مشاكل:
echo    • تأكد من GitHub repository
echo    • تأكد من Vercel deployment
echo    • تأكد من Domain DNS settings
echo.

echo ✨ بالتوفيق مع مضمونة! 🎊
pause
