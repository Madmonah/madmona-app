@echo off
REM ============================================================
REM  Quantum Leap V3 Deploy
REM  Includes:
REM  - Command Center page (/admin/command-center)
REM  - Analytics tracker (src/lib/analytics.ts)
REM  - Booking page bug fixes (paused state + ID verification optional)
REM  - Listing-drafts dedup fix (claimed status)
REM  - GitHub Actions fallback workflow
REM ============================================================
setlocal enabledelayedexpansion
cd /d C:\madmona-app

echo.
echo ==========================================================
echo   QUANTUM LEAP DEPLOY V3
echo ==========================================================
echo   1. Create /admin/command-center route
echo   2. Install src/lib/analytics.ts
echo   3. Install GitHub Action fallback workflow
echo   4. Booking page bug fix already applied to:
echo      src/app/marketplace/[slug]/book/page.tsx
echo      - listing 'paused' status shows clearer message
echo      - ID verification is now OPTIONAL at submit time
echo      - Booking with no ID -> id_verification_status=awaiting_id
echo   5. Listing-drafts dedup fix already applied to:
echo      src/app/api/listing-drafts/route.ts
echo   6. Commit + push
echo ==========================================================
echo.

REM ----------------------------------------------------------
REM 1. Create command-center directory
REM ----------------------------------------------------------
if not exist "src\app\admin\command-center" (
    mkdir "src\app\admin\command-center"
    echo [+] Created src\app\admin\command-center
) else (
    echo [=] src\app\admin\command-center already exists
)

REM ----------------------------------------------------------
REM 2. Move staged files
REM ----------------------------------------------------------
if exist "command-center-page.tsx" (
    move /Y "command-center-page.tsx" "src\app\admin\command-center\page.tsx" >nul
    echo [+] Moved command-center page.tsx into place
) else (
    if exist "src\app\admin\command-center\page.tsx" (
        echo [=] command-center page.tsx already in place
    ) else (
        echo [!] WARN: no command-center-page.tsx to move
    )
)

if exist "analytics-lib.ts" (
    move /Y "analytics-lib.ts" "src\lib\analytics.ts" >nul
    echo [+] Installed src\lib\analytics.ts
) else (
    if exist "src\lib\analytics.ts" (
        echo [=] analytics.ts already in place
    ) else (
        echo [!] WARN: no analytics-lib.ts to move
    )
)

REM ----------------------------------------------------------
REM 3. Verify GitHub workflow
REM ----------------------------------------------------------
if exist ".github\workflows\vercel-deploy-fallback.yml" (
    echo [+] vercel-deploy-fallback.yml in place
) else (
    echo [!] WARN: vercel-deploy-fallback.yml missing
)

REM ----------------------------------------------------------
REM 4. Verify booking page fix is in place
REM ----------------------------------------------------------
findstr /C:"listing-paused" "src\app\marketplace\[slug]\book\page.tsx" >nul
if errorlevel 1 (
    echo [!] WARN: booking page fix NOT applied
) else (
    echo [+] booking page fix verified
)

REM ----------------------------------------------------------
REM 5. Stage and commit
REM ----------------------------------------------------------
echo.
echo --- Git status ---
git status --short
echo.

git add -A

git commit -m "feat(quantum-leap-v3): Booking bug fix + Command Center + friction detection

ROOT CAUSE FIXED: Booking page was blocking high-intent visitors.
Investigation found:
- مكاريوس (intent_score=100) attempted 10 bookings on 3 different listings
- Another visitor (mp1llupl) attempted 6 bookings on same Mercedes listing
- Bug #1: listing-mp1lat47-bxrd is PAUSED, page showed 'not-found'
- Bug #2: requires_id_verification=true disabled submit button until 14-digit ID
- Bug #3: 'unknown_friction' on BMW 740 + Mercedes G Class (now monitored)

Frontend changes (this commit):
- src/app/marketplace/[slug]/book/page.tsx:
  * Added 'listing-paused' gate with clearer message + WhatsApp escape hatch
  * ID verification is now OPTIONAL at submit time (was: disabled button)
  * Booking submitted without ID gets id_verification_status='awaiting_id'
  * Form lookup no longer filters on status='published' (so we can show
    paused state instead of fake 'not-found')
- src/app/admin/command-center/page.tsx: ops hub UI
- src/lib/analytics.ts: track.pageView/listingView/booking helpers
- src/app/api/listing-drafts/route.ts: dedup includes 'claimed' status
- .github/workflows/vercel-deploy-fallback.yml: GitHub Action fallback

Backend changes (already deployed via Supabase):
- visitor_intelligence view (intent scoring 0-100)
- listing_friction view (per-listing booking abandonment)
- admin_alerts table (replaces blocked admin WhatsApp alerts)
- abandoned-booking-alerter edge function (4h cron)
- listing-friction-alerter edge function (daily 8:15 AM Cairo)
- system-health-monitor edge function (4h cron)
- daily-ai-brief v3 (now surfaces booking bugs)
- bulk-outreach-top-leads, drip-campaign-engine
- cleanup_orphan_drafts() (daily 5 AM Cairo)"

if errorlevel 1 (
    echo.
    echo [!] git commit had nothing to commit, or failed
    echo Continuing to push pending commits anyway...
)

echo.
echo --- Pushing to origin/main ---
git push origin main

if errorlevel 1 (
    echo.
    echo ==========================================================
    echo [!] git push failed
    echo ==========================================================
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  PUSHED. Next steps:
echo.
echo  1. Open Vercel dashboard:
echo     https://vercel.com/dashboard
echo  2. If madmona-app hasn't auto-deployed in 2 min,
echo     manually click "Redeploy" on the latest commit.
echo  3. Once live, TEST THE BOOKING FLOW:
echo     https://madmonacairo.com/marketplace/listing-mp1m00ri-hhij/book
echo     - The submit button should no longer be disabled
echo     - Try booking WITHOUT entering national_id
echo  4. Then open the Command Center:
echo     https://madmonacairo.com/admin/command-center
echo  5. Call مكاريوس on +201206134041 and offer manual booking
echo.
echo ==========================================================
echo.
pause
