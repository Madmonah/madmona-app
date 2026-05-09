@echo off
title Madmona - Fix Conflicts and Deploy
color 0A
cd /d "C:\madmona-app"

echo.
echo ================================================================
echo   إصلاح الـ Merge Conflicts ونشر التعديلات
echo ================================================================
echo.

echo === الخطوة 1: فحص الـ conflicts المتبقية ===
findstr /S /M /C:"<<<<<<< HEAD" src\*.ts src\*.tsx 2>nul
if not errorlevel 1 (
    echo.
    echo ⚠️  لسه فيه conflicts! شوف الملفات فوق
    pause
    exit /b 1
)
echo ✅ مفيش conflicts متبقية
echo.

echo === الخطوة 2: Git status ===
git status --short
echo.

echo === الخطوة 3: Add الملفات المعدلة ===
git add src/app/api/admin/supplier-action/route.ts
git add src/app/api/admin/marketplace-suppliers/route.ts
git status --short
echo.

echo === الخطوة 4: Commit ===
git commit -m "fix: resolve merge conflicts in supplier admin API routes"
echo.

echo === الخطوة 5: Push ===
git push origin main
echo.

echo ================================================================
echo  تم! استنى دقيقتين وافتح Vercel وشوف لو الـ build نجح
echo  https://vercel.com/madmonaadmin-1699s-projects/project-ew64j
echo ================================================================
echo.
pause
