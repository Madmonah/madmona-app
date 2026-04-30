@echo off
cd /d "%~dp0"
echo ==============================================
echo   Frontend Polish Deploy
echo ==============================================
echo.
echo   Home page: Marketplace section added
echo   TopNav: Marketplace link + /account redirect
echo   All previous polish included
echo.
pause
git add .
git commit -m "feat: home page Marketplace section + TopNav links to /account and /marketplace"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
