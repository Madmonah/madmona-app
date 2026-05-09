@echo off
chcp 65001 >nul
title Madmona - Deploy News Admin Fix
color 0A
cd /d "C:\madmona-app"

echo.
echo ================================================================
echo   نشر إصلاح الأخبار - Deploy News Admin
echo ================================================================
echo.

echo [1/6] فحص الملفات الجديدة...
if not exist "src\app\admin\news\page.tsx" (
    echo    [ERROR] صفحة /admin/news مش موجودة!
    pause
    exit /b 1
)
if not exist "src\app\api\news-feed\route.ts" (
    echo    [ERROR] API news-feed مش موجود!
    pause
    exit /b 1
)
echo    [OK] كل الملفات موجودة
echo.

echo [2/6] فحص حالة Git...
git status --short
echo.

echo [3/6] جلب آخر تعديلات من GitHub...
git fetch origin
echo.

echo [4/6] دمج أي تعديلات remote...
git pull origin main --no-edit 2>nul
echo.

echo [5/6] إضافة وعمل commit للتعديلات...
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "feat(news): admin-managed news + remove discount promo banner"
    echo    [OK] تم عمل commit
) else (
    echo    [INFO] مفيش تعديلات جديدة للـ commit
)
echo.

echo [6/6] رفع للـ GitHub (Vercel هيعمل auto-deploy)...
git push origin main
echo.

echo ================================================================
echo  ✅ تم! استنى دقيقتين وافتح الموقع:
echo.
echo  🔗 https://www.madmonacairo.com/admin/news
echo     (لإدارة الأخبار يدوياً)
echo.
echo  🔗 https://www.madmonacairo.com
echo     (الصفحة الرئيسية - شوف الأخبار شغالة)
echo.
echo  🔗 https://vercel.com/madmonaadmin-1699s-projects/project-ew64j
echo     (Vercel dashboard لمتابعة الـ build)
echo ================================================================
echo.
pause
