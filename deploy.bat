@echo off
cd /d "%~dp0"
echo ================================================================
echo   System Unification — Marketplace is the only system now
echo ================================================================
echo.
echo   * Categories admin UX fixed:
echo     - Big "+ subcategory" button when category expanded
echo     - Help card explaining how to use
echo     - Auto-expand parent after adding child
echo     - Toast success messages
echo.
echo   * SYSTEM UNIFICATION (no more old/new split):
echo     - /book → redirects to /marketplace
echo     - /login → redirects to /auth/login
echo     - /my-bookings → redirects to /account/bookings
echo     - /reserve/* → redirects to /marketplace?category=...
echo     - /spaces/* → redirects to /marketplace
echo     - /units/* → redirects to /marketplace
echo     - /admin/bookings → /admin/marketplace-bookings
echo     - /admin/units → /admin/dashboard
echo     - /admin/suppliers → /admin/marketplace-suppliers
echo.
echo   * Admin dashboard cleaned up:
echo     - Removed old "Coworking" section entirely
echo     - 3 sections: Marketplace / Content / Team
echo     - Madmona's listings = our "ads" (إعلاناتنا)
echo.
pause
git add .
git commit -m "feat: unify old + new systems → marketplace only + categories UX fix"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
