@echo off
cd /d E:\madmona-app
call npx tsc --noEmit > "%~dp0tsc-all.log" 2>&1
echo --- أخطاء في ملفاتي أنا ---
findstr /I /C:"MyAssetsCard" /C:"account/page" "%~dp0tsc-all.log"
echo --- إجمالي الأخطاء ---
find /c "error TS" < "%~dp0tsc-all.log"
