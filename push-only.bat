@echo off
chcp 65001 >nul
echo ============================================================
echo   Madmona - PUSH ONLY (no pull, no fetch, no pack changes)
echo ============================================================

cd /d "C:\madmona-app"

echo.
echo Pushing 14 local commits to GitHub...
echo.
git push origin main

echo.
echo ============================================================
echo If still failed with "pack file" lock:
echo   1. Close VS Code / Cursor / any IDE
echo   2. Close all File Explorer windows on C:\madmona-app
echo   3. Run this bat again
echo ============================================================
pause
