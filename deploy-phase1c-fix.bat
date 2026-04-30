@echo off
REM ============================================================
REM Deploy Phase 1c FIX (Suspense wrapper for useSearchParams)
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Deploy Phase 1c (FIX)
echo ==============================================
echo.
echo Fixing: useSearchParams Suspense boundaries
echo   - /marketplace/page.tsx wrapped in Suspense
echo   - /supplier/marketplace/page.tsx wrapped in Suspense
echo.
pause

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "fix: wrap marketplace pages in Suspense for useSearchParams (Next.js 15)"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   Wait 1-2 minutes, then test:
  echo     https://madmonacairo.com/supplier/marketplace
  echo     https://madmonacairo.com/marketplace
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
