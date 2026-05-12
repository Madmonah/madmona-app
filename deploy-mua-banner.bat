@echo off
echo ================================================================
echo  Deploying: MUA Campaign Banner + Makeup Studio Listing Setup
echo ================================================================
echo.
echo This deploys:
echo  - New MUACampaignBanner component on the homepage
echo  - Triggers on ?from=mua_ad or ?utm_campaign=mua
echo  - Two CTAs: Register as supplier + Book the studio
echo.
echo Listing already created in Supabase:
echo  https://madmonacairo.com/marketplace/madmona-makeup-studio-heliopolis
echo.
echo Pressing Ctrl+C now will abort. Otherwise, deployment starts in 3 seconds...
timeout /t 3 /nobreak >nul

cd /d C:\madmona-app
echo.
echo === Adding changes ===
git add src/components/MUACampaignBanner.tsx src/app/page.tsx
echo.
echo === Committing ===
git commit -m "feat: MUA campaign banner on homepage for Meta ad traffic"
echo.
echo === Pushing to GitHub (triggers Vercel auto-deploy) ===
git push origin main
echo.
echo ================================================================
echo  Push complete. Vercel will auto-deploy in 60-120 seconds.
echo ================================================================
echo.
echo  Test these URLs after deploy:
echo.
echo  1. Homepage WITHOUT banner (no MUA traffic):
echo     https://madmonacairo.com/
echo.
echo  2. Homepage WITH banner (MUA traffic):
echo     https://madmonacairo.com/?from=mua_ad
echo     https://madmonacairo.com/?utm_campaign=mua_test
echo.
echo  3. Studio listing page:
echo     https://madmonacairo.com/marketplace/madmona-makeup-studio-heliopolis
echo.
echo  4. Supplier registration page:
echo     https://madmonacairo.com/supplier/register
echo.
echo Check Vercel: https://vercel.com/madmona for build status.
echo.
pause
