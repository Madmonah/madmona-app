@echo off
echo ============================================================
echo  PHASE Ω.14 — Brand Enforcement + Ad Review Page Deploy
echo ============================================================
echo.
echo [1/4] Adding new files...
cd /d C:\madmona-app
git add src/app/admin/ad-review/page.tsx

echo [2/4] Committing...
git commit -m "Phase Omega 14: brand enforcement trigger + ad-designer prompt v2 + ad-review page + PG orchestrator"

echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo ============================================================
echo  DONE. Vercel builds in ~2 min.
echo  Then visit: madmonacairo.com/admin/ad-review
echo  Features:
echo    - Locked palette display (5 colors)
echo    - On-brand / off-brand badge per ad
echo    - Approve / Revise / Regenerate AI buttons
echo    - Live polling every 30s
echo  Backend live:
echo    - trg_enforce_ad_brand_compliance (auto-flags off-brand)
echo    - ad-designer prompt v2 (bakes palette in)
echo    - madmona_orchestrator cron (every 6h)
echo ============================================================
pause
