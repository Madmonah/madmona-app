@echo off
chcp 65001 >nul
title Madmona Deploy - Phase Z
color 0A

echo.
echo  ============================================================
echo   Madmona Deploy - Phase Z (Quality of Life batch)
echo  ============================================================
echo.

cd /d C:\madmona-app

echo  [1/4] Staging files...
git add "src/app/marketplace/[slug]/book/page.tsx"
git add src/app/admin/daily-messages/page.tsx
git add src/app/admin/site-settings/page.tsx
git add src/components/retention/DailyMessageCard.tsx

echo.
echo  [2/4] Staged:
git diff --cached --name-only

echo.
echo  [3/4] Committing...
git commit -m "Phase Z: booking addon selection + admin daily-messages CRUD + payment settings UI + share button + claim_listing_draft addon persistence fix"

echo.
echo  [4/4] Pushing to origin/main...
git push origin main

echo.
echo  ============================================================
echo   DONE - check https://vercel.com/dashboard for build
echo  ============================================================
echo.
pause
