@echo off
title Madmona - Real Conflict Check
color 0E
cd /d "C:\madmona-app"

echo.
echo ================================================================
echo   فحص الـ Merge Conflicts الحقيقية بس
echo ================================================================
echo.

echo === فحص HEAD markers (المؤشر الأكيد للـ conflict) ===
findstr /S /M /C:"<<<<<<< HEAD" src\*.ts src\*.tsx src\*.js src\*.jsx 2>nul
if errorlevel 1 (
    echo ✅ مفيش ولا ملف فيه HEAD marker
) else (
    echo ⚠️ الملفات اللي فوق فيها conflicts!
)

echo.
echo === فحص lines فيها بس ======= (7 علامات يساوي لوحدها) ===
findstr /S /M /R /C:"^=======$" src\*.ts src\*.tsx src\*.js src\*.jsx 2>nul
if errorlevel 1 (
    echo ✅ مفيش conflict separators
)

echo.
echo ================================================================
echo  لو مفيش حاجة فوق، يبقى الكود نضيف ✅
echo  الـ ======= في الـ output اللي شفته قبل كده decorative comments
echo ================================================================
echo.
pause
