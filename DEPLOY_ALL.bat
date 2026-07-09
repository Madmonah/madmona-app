@echo off
chcp 65001 >nul
echo ================================================
echo  Madmona - FULL DEPLOY (all local changes to main)
echo ================================================
cd /d %~dp0

echo.
echo [1/4] Staging ALL changes (this includes everything:
echo       real-estate, world-cup, referral, wallet, marketplace,
echo       admin marid, supplier tools, checkout/cart changes)...
git add -A
git status --short

echo.
echo [2/4] Committing...
git commit -m "deploy: real-estate section + world-cup + referral + wallet + marketplace + supplier tools + fixes"

echo.
echo [3/4] Pushing to origin/main...
git push origin main

echo.
echo [4/4] Done.
echo ================================================
echo  Pushed. Vercel will auto-build and go live in ~1-3 min.
echo  Check build status: https://vercel.com/dashboard
echo.
echo  IMPORTANT - NOT covered by this script:
echo  - SQL migration files in the project root
echo    (supabase_property_market.sql, supabase_realestate_campaign.sql, etc.)
echo    These must be run manually against the production Supabase
echo    database BEFORE the new pages will work correctly.
echo  - New Supabase Edge Functions (e.g. marid-restaurant-agent)
echo    need a separate `supabase functions deploy`.
echo ================================================
pause
