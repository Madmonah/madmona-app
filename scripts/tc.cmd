@echo off
cd /d E:\madmona-app
call npx tsc --noEmit > scripts\tsc.log 2>&1
echo TSC_EXIT=%errorlevel%
findstr /C:"MyAssetsCard" /C:"home/page" /C:"dictionary" scripts\tsc.log
echo ---DONE---
