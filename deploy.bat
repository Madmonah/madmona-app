@echo off
cd /d "%~dp0"
echo ==============================================
echo   Final Stage Deploy (without payment)
echo ==============================================
echo.
echo   * Real-time notifications for suppliers
echo   * Admin analytics dashboard at /admin/dashboard
echo   * Account hub link to admin dashboard
echo   * SEO + Open Graph for listing shares
echo.
pause
git add .
git commit -m "feat: realtime notifications + admin analytics + SEO metadata"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo   Then test the live app.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
