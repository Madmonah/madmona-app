@echo off
chcp 65001 >nul
title Madmona - Full Diagnostic
color 0E
cd /d "C:\madmona-app"

echo.
echo ================================================================
echo   تشخيص شامل - ايه اللي مش شغال؟
echo ================================================================
echo.

echo [1] Git Configuration:
git config --get remote.origin.url
echo.

echo [2] Current Branch:
git branch --show-current
echo.

echo [3] Git Status (الملفات اللي اتعدلت):
git status
echo.

echo [4] آخر 5 Commits محلية:
git log --oneline -5
echo.

echo [5] هل Local متقدم على Remote؟
git fetch origin 2>&1
git rev-list --left-right --count origin/main...HEAD
echo (الأرقام ^>^> Local ahead, Remote ahead)
echo.

echo [6] هل في Merge Conflicts؟
findstr /S /M /C:"<<<<<<< HEAD" src\*.ts src\*.tsx 2>nul
if errorlevel 1 (
    echo    [OK] مفيش conflicts
) else (
    echo    [WARNING] في conflicts!
)
echo.

echo [7] فحص ملفات الأخبار:
if exist "src\app\admin\news\page.tsx" (
    echo    [OK] /admin/news/page.tsx موجود
    for %%A in ("src\app\admin\news\page.tsx") do echo         الحجم: %%~zA bytes
) else echo    [MISSING] /admin/news/page.tsx
if exist "src\app\api\news-feed\route.ts" (
    echo    [OK] /api/news-feed/route.ts موجود
    for %%A in ("src\app\api\news-feed\route.ts") do echo         الحجم: %%~zA bytes
) else echo    [MISSING] /api/news-feed/route.ts
echo.

echo [8] هل الملفات دي اتعملها commit؟
git log --oneline --all -- src\app\admin\news\page.tsx 2>nul | findstr /C:"" >nul
if errorlevel 1 (
    echo    [WARNING] /admin/news/page.tsx لسه ما اتعملش commit أبداً!
) else (
    echo    [OK] /admin/news/page.tsx متعمله commit
    git log --oneline -1 -- src\app\admin\news\page.tsx
)
echo.

echo [9] محاولة Push:
git push origin main 2>&1
echo.

echo ================================================================
echo  انسخ كل اللي فوق وابعتلي عشان أعرف المشكلة فين
echo ================================================================
echo.
pause
