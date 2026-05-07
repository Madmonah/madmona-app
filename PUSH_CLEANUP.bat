@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "remove: temporary debug endpoint"
git push origin main
echo.
echo Done.
pause
