@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   FIX: صفحة الموردين - بدون كلمة سر منفصلة
echo ================================================================
echo.
echo CHANGES:
echo   1. Page now uses your normal admin login (no separate password)
echo   2. API verifies admin role from session
echo   3. Auto-redirects to login if not authenticated
echo   4. Shows credentials hint on login screen
echo.
echo AFTER DEPLOY:
echo   Just login normally with 01002229982 / Madmona123
echo   then visit /admin/marketplace-suppliers
echo   No password prompt!
echo.
git add .
git status --short
echo.
git commit -m "fix: marketplace suppliers uses session auth instead of separate password"
git push origin main
echo.
echo ================================================================
echo   DONE - Wait 1-2 min then refresh madmonacairo.com
echo ================================================================
echo.
pause
