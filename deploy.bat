@echo off
cd /d "%~dp0"
echo ================================================================
echo   Admin Dashboard Hub + Browse + Team Permissions
echo ================================================================
echo.
echo   ADMIN DASHBOARD UPGRADED — all admin links in one place:
echo.
echo   Section 1: Marketplace Management
echo     - Suppliers / Bookings / Categories / Payouts
echo.
echo   Section 2: Madmona Coworking
echo     - Space Bookings / Leads / Units / Old Suppliers
echo.
echo   Section 3: Team & Permissions
echo     - Team management / Supplier panel / New listing / Reviews
echo.
echo   ALSO INCLUDED:
echo   * /browse: Madmona-branded, pulls from listings table
echo   * Supplier team: /supplier/team with 10 granular permissions
echo   * DB: supplier_staff table + RLS + helper function
echo.
pause
git add .
git commit -m "feat: admin dashboard hub + team permissions + browse rebuild"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
