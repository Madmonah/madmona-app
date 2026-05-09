@echo off
cd /d "%~dp0"
echo ==============================================
echo   Madmona — Final Polish + Conflict Handling
echo ==============================================
echo.
echo   Account icon in marketplace pages (sign out access)
echo   Fixed view counter bug (slug to listing UUID)
echo   /account/bookings back button to /account
echo   New auto-cancel competing pendings (SQL)
echo.
echo   IMPORTANT: Run BOTH SQL blocks in Supabase
echo   SQL Editor before testing (see chat)
echo.
pause
git add .
git commit -m "polish: account nav across marketplace, fix view counter, auto-cancel competing"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
