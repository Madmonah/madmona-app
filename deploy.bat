@echo off
cd /d "%~dp0"
echo ==============================================
echo   Polish Pass 2 — closing the loop
echo ==============================================
echo.
echo   * Supplier reviews page with response writing
echo   * Map embed on listing detail (Google Maps)
echo   * Supplier responses shown on listing reviews
echo   * Reviews pill in supplier dashboard
echo   * About page (/about) for trust + ads readiness
echo   * Footer with About link
echo.
pause
git add .
git commit -m "feat: supplier review responses + maps + about page + footer links"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
