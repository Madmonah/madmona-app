@echo off
cd /d "%~dp0"
echo ==============================================
echo   Fix: Email domain (madmona.local to madmonacairo.com)
echo ==============================================
pause
git add .
git commit -m "fix: use madmonacairo.com domain for synthetic auth emails"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min, then signup at:
  echo     https://madmonacairo.com/auth/signup
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
