@echo off
:loop
if exist "E:\madmona-app\scripts\villa-daily.json" goto done
timeout /t 8 /nobreak >nul 2>&1
goto loop
:done
echo READY
cd /d E:\madmona-app\scripts
node villa-report.js
