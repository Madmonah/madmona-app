@echo off
chcp 65001 >nul
echo ============================================================
echo   Madmona - DIAGNOSE + Pull + Push
echo ============================================================

cd /d "C:\madmona-app"

echo.
echo [1/7] Current git status:
git status --short
echo.

echo [2/7] Local commits NOT yet on GitHub:
git log --oneline origin/main..HEAD
echo.

echo [3/7] Remote commits NOT yet on local:
git fetch origin
git log --oneline HEAD..origin/main
echo.

echo [4/7] Pulling remote changes (with merge)...
git pull origin main --no-edit

echo.
echo [5/7] Status after pull:
git status --short

echo.
echo [6/7] Staging any new changes + committing...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(news): admin-managed news + remove discount promo banner"
) else (
  echo No new changes to commit.
)

echo.
echo [7/7] Pushing to GitHub...
git push origin main

echo.
echo ============================================================
echo Done!
echo ============================================================
pause
