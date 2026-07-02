@echo off
chcp 65001 >nul
cd /d E:\madmona-app

echo ========================================
echo   اصلاح git + رفع تعديلات (منتج + عمولة 10%%)
echo ========================================

REM 1) امسح القفل والـ index البايظ
if exist .git\index.lock del /f .git\index.lock
if exist .git\index del /f .git\index

REM 2) ابني الـ index من جديد من آخر commit
git reset

REM 3) ضيف التعديلات
git add -A src supabase/functions

REM 4) commit + push
git commit -m "feat: rename listing to product app-wide + unified 10%% commission"
git push origin HEAD

echo.
echo ========================================
echo   خلص! Vercel هيبدأ deploy تلقائي دلوقتي
echo   تابع من: https://vercel.com/dashboard
echo ========================================
pause
