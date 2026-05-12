@echo off
REM ============================================================
REM  Quantum Leap V2 Deploy
REM  Now includes: command-center page, analytics tracker,
REM  fixed listing-drafts dedup bug, GitHub Actions fallback.
REM ============================================================
setlocal enabledelayedexpansion
cd /d C:\madmona-app

echo.
echo ==========================================================
echo   QUANTUM LEAP DEPLOY V2
echo ==========================================================
echo   What this does:
echo     1. Create /admin/command-center route
echo     2. Install src/lib/analytics.ts
echo     3. Install GitHub Action fallback workflow
echo     4. Apply the listing-drafts dedup fix (already in route.ts)
echo     5. Commit + push
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
REM 4. Stage and commit
REM ----------------------------------------------------------
echo.
echo --- Git status ---
git status --short
echo.

git add -A

git commit -m "feat(quantum-leap-v2): Command Center UI + analytics + draft dedup fix

Backend (already deployed via Supabase):
- ceo-command-center, hot-leads-now, ai-reply-suggestions
- customer-concierge, daily-ai-brief (saves to ceo_briefs)
- bulk-outreach-top-leads, drip-campaign-engine
- system-health-monitor (4h cron)
- auto-flip-default-template (hourly cron)
- supplier-acquisition-cron v2 (config-driven template)
- whatsapp-webhook v14 (first-reply AI mention)

DB changes (already migrated):
- compute_lead_score() rule-based scoring
- lead_intelligence_view materialized (refresh every 15 min)
- track_event() RPC + funnel_7d view
- update_listing_views_from_events() (backfilled 245 views)
- cleanup_orphan_drafts() (daily 2 AM UTC)
- Fraud cleanup (161 -> 94 alerts, 67 auto-resolved)

Frontend (this commit):
- /admin/command-center page with hot leads, KPIs, AI brief panel
- src/lib/analytics.ts: track.pageView/listingView/booking/etc helpers
- listing-drafts/route.ts: dedup now includes 'claimed' status
  (fixes orphan draft explosion from WhatsApp link re-clicks)
- .github/workflows/vercel-deploy-fallback.yml"

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
echo  3. Once live, open:
echo     https://madmonacairo.com/admin/command-center
echo.
echo  OPTIONAL: Set up auto-deploy fallback:
echo  - Vercel dashboard - Project Settings - Git - Deploy Hooks
echo  - Create new hook named "github-actions-fallback"
echo  - Copy the URL
echo  - GitHub repo - Settings - Secrets - Actions - New repository secret
echo  - Name: VERCEL_DEPLOY_HOOK_URL
echo  - Value: paste the hook URL
echo  - Future pushes will fire it automatically.
echo ==========================================================
echo.
pause
