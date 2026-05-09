@echo off
REM ============================================
REM Madmona Push Script
REM Double-click this file to push all changes to GitHub
REM Vercel will auto-deploy after the push
REM ============================================

cd /d "%~dp0"

echo.
echo ============================================
echo   Madmona - Push Changes to GitHub
echo ============================================
echo.

echo [1/3] Adding all changed files...
git add .
if errorlevel 1 (
  echo ERROR: git add failed
  pause
  exit /b 1
)

echo.
echo [2/3] Committing changes...
git commit -m "feat: complete admin dashboard + dynamic hero images + smart delete"
if errorlevel 1 (
  echo.
  echo No changes to commit, or commit failed.
  echo This is OK if you already committed earlier.
  echo.
)

echo.
echo [3/3] Pushing to GitHub...
git push
if errorlevel 1 (
  echo.
  echo ERROR: git push failed!
  echo Check your internet connection and try again.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   SUCCESS! Changes pushed to GitHub.
echo ============================================
echo.
echo Vercel will now deploy automatically.
echo Wait 2 minutes and check:
echo https://madmonacairo.com/admin/dashboard
echo.
pause
