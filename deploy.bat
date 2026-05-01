@echo off
cd /d "%~dp0"
echo ================================================================
echo   FINAL POLISH BATCH — listing detail + auth + privacy/terms
echo ================================================================
echo.
echo   * Listing detail PREMIUM redesign (cinematic + sticky widget)
echo   * Mobile bottom navigation (4 tabs: home/marketplace/fav/account)
echo   * Login + Signup pages premium redesign
echo   * Account hub premium redesign
echo   * Privacy Policy page (/privacy)
echo   * Terms of Service page (/terms)
echo   * Footer updated with privacy/terms links
echo.
pause
git add .
git commit -m "feat: premium listing detail + auth pages + privacy/terms + mobile bottom nav"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
