@echo off
REM ============================================================
REM Deploy Phase 1c (Dynamic Listing Form + Public Marketplace)
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Deploy Phase 1c
echo ==============================================
echo.
echo Files being deployed:
echo   - Listing creation form (5-step wizard)
echo   - Supplier marketplace dashboard
echo   - Edit listing page
echo   - Public marketplace browse page
echo   - Public listing detail page (WhatsApp CTA)
echo.
pause

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "feat: Phase 1c - dynamic listing form + public marketplace"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   Test these URLs in 1-2 minutes:
  echo     https://madmonacairo.com/supplier/marketplace
  echo     https://madmonacairo.com/supplier/marketplace/new
  echo     https://madmonacairo.com/marketplace
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
