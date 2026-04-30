@echo off
cd /d "%~dp0"
echo ==============================================
echo   Deploy any pending changes
echo ==============================================
echo.
pause
git add .
git status
echo.
git commit -m "deploy"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED — maybe nothing to commit?
)
pause
