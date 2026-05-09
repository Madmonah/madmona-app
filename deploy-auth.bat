@echo off
REM ============================================================
REM Deploy Auth System (Phone + Password Sign-in)
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Madmona — Deploy Auth System
echo ==============================================
echo.
echo Adding:
echo   - /auth/login (phone + password sign-in)
echo   - /auth/signup (new account creation)
echo   - Phone normalization helpers
echo.
echo Updating redirects on:
echo   - /supplier/marketplace
echo   - /supplier/marketplace/new
echo   - /supplier/register
echo.
pause

echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing...
git commit -m "feat: phone+password auth system (signup, signin, redirects)"

echo.
echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo ==============================================
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Vercel is now deploying...
  echo.
  echo   IMPORTANT: Before testing, disable email
  echo   confirmation in Supabase Dashboard:
  echo     Authentication ^> Sign In / Up
  echo     ^> Email confirmation: OFF
  echo.
  echo   Then test:
  echo     https://madmonacairo.com/auth/signup
  echo     https://madmonacairo.com/auth/login
) else (
  echo   PUSH FAILED. Check the error above.
)
echo ==============================================
pause
