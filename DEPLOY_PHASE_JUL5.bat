@echo off
chcp 65001 >nul
REM ============================================================
REM DEPLOY_PHASE_JUL5.bat
REM Phase 2026-07-05: Menu Sizes + Excel Import + ERP Sync + World Cup Live
REM   - DB migrations: ALREADY APPLIED on Supabase (nothing to run)
REM   - This deploys the frontend to production via Vercel
REM ============================================================

cd /d E:\madmona-app

echo.
echo ==========================================
echo   MADMONA — Deploy Phase JUL 5 2026
echo   Menu Sizes + Excel Import + World Cup
echo ==========================================
echo.

call vercel --prod --yes

echo.
echo ==========================================
echo   Deploy finished.
echo   Test checklist:
echo   1) /supplier: menu item with sizes (صغير/وسط/كبير)
echo   2) Order a sized item from /marketplace
echo   3) Excel import (menu + products pages)
echo   4) ERP sync badge for CRM+ERP suppliers
echo   5) /world-cup live scores
echo ==========================================
echo.
echo [OPTIONAL] World Cup primary data source:
echo   Register free at https://www.football-data.org/client/register
echo   then run:  vercel env add FOOTBALL_DATA_API_KEY production
echo   (works WITHOUT it too — keyless fallback is built in)
echo.
pause
