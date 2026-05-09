@echo off
cd /d C:\madmona-app

echo ============================================
echo  DIAGNOSTIC: Check git status
echo ============================================
echo.

echo [Current git status]
git status
echo.

echo [Last 3 commits]
git log --oneline -3
echo.

echo [Check if buffer.ts is tracked]
git ls-files src/lib/buffer.ts
echo.

echo [Check the diff of buffer.ts vs HEAD]
git diff HEAD -- src/lib/buffer.ts | head -30
echo.

pause
