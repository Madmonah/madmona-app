@echo off
cd /d "%~dp0"
echo ================================================================
  echo   FIX: Broken /categories/* URLs in WhatsApp customer messages
echo ================================================================
echo.
echo   Two fixes applied:
echo   1. WhatsApp Edge function v4 deployed (now uses /marketplace/X)
echo   2. Redirect /categories/* -^> /marketplace/* in next.config.mjs
echo      (rescues old links sent to customers earlier today)
echo.
git add .
git commit -m "fix: broken /categories urls in whatsapp + redirect rescue" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Wait 90s.
)
pause
