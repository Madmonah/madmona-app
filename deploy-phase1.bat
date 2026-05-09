@echo off
REM ============================================================
REM Deploy Phase 1 changes to Vercel
REM Just double-click. Git push triggers auto-deploy.
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Deploy Phase 1 to Vercel
echo ==============================================
echo.
echo Files being deployed:
echo   - Admin categories management page
echo   - Admin marketplace-suppliers review page
echo   - Supplier registration page
echo   - 5 new API routes
echo.
pause

echo.
echo [1/3] Checking git status...
git status
echo.

echo [2/3] Adding and committing changes...
git add .
git commit -m "feat: Phase 1 - admin categories + marketplace supplier registration"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   In 1-2 minutes, test these URLs:
  echo     https://madmonacairo.com/admin/categories
  echo     https://madmonacairo.com/admin/marketplace-suppliers
  echo     https://madmonacairo.com/supplier/register
  echo.
  echo   Watch deploy progress at:
  echo     https://vercel.com/dashboard
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
