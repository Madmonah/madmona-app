@echo off
cd /d "C:\madmona-app"
echo.
echo === Git Status ===
git status
echo.
echo === Last 3 commits ===
git log --oneline -3
echo.
echo === Current branch ===
git branch --show-current
echo.
echo === Remote ===
git remote -v
echo.
pause
