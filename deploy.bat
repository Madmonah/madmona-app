@echo off
cd /d "%~dp0"
echo ================================================================
echo   InstaPay Integration + Address Fix
echo ================================================================
echo.
echo   * InstaPay payment block on /bookings/[id] page
echo   * Account: 5220001000009207 (بنك مصر)
echo   * Copy account number button
echo   * WhatsApp confirmation button (sends ref code + amount)
echo   * 4-step payment instructions
echo   * Address corrected to "سليمان عَزْمي" everywhere
echo   * Coordinates 30.1134075, 31.3655983 in DB
echo.
pause
git add .
git commit -m "feat: InstaPay payment flow + correct Madmona address"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
