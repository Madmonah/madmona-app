@echo off
chcp 65001 >nul
echo ============================================================
echo   Madmona - FORCE Push (clears pack locks first)
echo ============================================================
echo.
echo If this fails, RESTART your computer and run again.
echo ============================================================

cd /d "C:\madmona-app"

echo.
echo [1/6] Killing any git processes...
taskkill /F /IM git.exe 2>nul
taskkill /F /IM ssh.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/6] Removing stale lock files...
if exist ".git\index.lock" del /F /Q ".git\index.lock"
if exist ".git\HEAD.lock" del /F /Q ".git\HEAD.lock"
if exist ".git\config.lock" del /F /Q ".git\config.lock"

echo.
echo [3/6] Current git status:
git status --short
echo.

echo [4/6] Local commits NOT on GitHub:
git log --oneline origin/main..HEAD 2>nul
echo.

echo [5/6] Stage + commit any pending changes...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat: chalet cross-listing + WhatsApp debounce + news improvements"
) else (
  echo No uncommitted changes.
)

echo.
echo [6/6] Pushing to GitHub (use --force-with-lease for safety)...
git push origin main

if errorlevel 1 (
  echo.
  echo ============================================================
  echo PUSH FAILED. Possible causes:
  echo   1. Pack file still locked - restart computer
  echo   2. GitHub credentials needed - check git credentials manager
  echo   3. Try: git push origin main --force-with-lease
  echo ============================================================
)

echo.
echo Done.
pause
