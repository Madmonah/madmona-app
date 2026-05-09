@echo off
chcp 65001 >nul
title Madmona - FINAL DEPLOY
echo ============================================================
echo   Madmona - FINAL DEPLOY (kills locks, disables auto-gc)
echo ============================================================
echo.

cd /d "C:\madmona-app"

echo [1/8] Disable git auto-garbage-collection (prevents pack writes)...
git config gc.auto 0
git config receive.autogc false
git config maintenance.auto false
git config fetch.unpackLimit 1
echo Done.

echo.
echo [2/8] Kill any git/ssh processes...
taskkill /F /IM git.exe 2>nul
taskkill /F /IM ssh.exe 2>nul
taskkill /F /IM ssh-agent.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [3/8] Remove stale lock files...
if exist ".git\index.lock" (del /F /Q ".git\index.lock" & echo Removed index.lock)
if exist ".git\HEAD.lock" (del /F /Q ".git\HEAD.lock" & echo Removed HEAD.lock)
if exist ".git\config.lock" (del /F /Q ".git\config.lock" & echo Removed config.lock)
for /R ".git\objects\pack" %%f in (*.lock tmp_pack_*) do (
  del /F /Q "%%f" 2>nul
  echo Removed %%~nxf
)

echo.
echo [4/8] Current status:
git status --short
echo.

echo [5/8] Local commits ahead of origin/main:
git log --oneline origin/main..HEAD 2>nul
echo.

echo [6/8] Stage + commit any pending changes...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat: chalet cross-listing + WhatsApp debounce + admin news system"
  echo Committed.
) else (
  echo Nothing new to commit.
)

echo.
echo [7/8] Pull remote changes (with auto-gc disabled)...
git pull origin main --no-rebase --no-edit --no-stat 2>&1

if errorlevel 1 (
  echo.
  echo Pull failed. Aborting before push to avoid losing remote commits.
  echo If pack file still locked, RESTART your computer and run this bat again.
  pause
  exit /b 1
)

echo.
echo [8/8] Push to GitHub...
git push origin main 2>&1

if errorlevel 1 (
  echo.
  echo ============================================================
  echo Push failed.
  echo If pack lock issue: RESTART your computer.
  echo If credentials issue: check Windows Credential Manager.
  echo ============================================================
) else (
  echo.
  echo ============================================================
  echo SUCCESS! Vercel will auto-deploy in ~2 minutes.
  echo Check: https://madmonacairo.com/admin/news
  echo ============================================================
)

echo.
pause
