@echo off
chcp 65001 >nul
title Madmona - Check News Status
color 0E
cd /d "C:\madmona-app"

echo.
echo ================================================================
echo   فحص حالة إصلاح الأخبار - Status Check
echo ================================================================
echo.

echo [1] الملفات الجديدة في المشروع:
echo.
if exist "src\app\admin\news\page.tsx" (
    echo    [OK] src\app\admin\news\page.tsx
) else (
    echo    [MISSING] src\app\admin\news\page.tsx
)
if exist "src\app\api\news-feed\route.ts" (
    echo    [OK] src\app\api\news-feed\route.ts
) else (
    echo    [MISSING] src\app\api\news-feed\route.ts
)
echo.

echo [2] آخر 10 commits محلي:
git log --oneline -10
echo.

echo [3] هل في تعديلات لسه ما اتعملش commit؟
git status --short
echo.

echo [4] هل في commits محلية لسه ما اتعملش push؟
git log --oneline origin/main..HEAD 2>nul
echo.

echo [5] دور على commits ليها علاقة بالأخبار:
git log --oneline --all --grep="news" -i -10
echo.

echo ================================================================
pause
