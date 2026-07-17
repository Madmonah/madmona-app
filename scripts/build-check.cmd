@echo off
cd /d E:\madmona-app
call npx tsc --noEmit -p tsconfig.json > scripts\tsc.log 2>&1
echo TSC_EXIT=%errorlevel%
findstr /C:"inventory" scripts\tsc.log
echo ---DONE---
