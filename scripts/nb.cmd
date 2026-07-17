@echo off
cd /d E:\madmona-app
set NODE_OPTIONS=--max-old-space-size=8192
call npx next build > scripts\next.log 2>&1
echo NEXT_EXIT=%errorlevel%
findstr /C:"Compiled successfully" /C:"Failed to compile" /C:"Type error" /C:"worker exited" scripts\next.log
echo ---DONE---
