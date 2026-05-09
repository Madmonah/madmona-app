@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: AI OS Phase 3 - Auto-drain + Reels + QC pages
echo ================================================================
echo.
echo NEW FEATURES:
echo   1. Scheduler now drains pending queue FIRST (before scheduled agents)
echo      - Auto-triggered runs (from booking/listing triggers) get processed
echo      - Add ?drain_only=true to drain without running scheduled agents
echo.
echo   2. NEW PAGES:
echo      - /admin/reels       = Reel scripts gallery
echo      - /admin/qc-reports  = Quality Control reports
echo.
echo   3. UPGRADED:
echo      - /admin/ai-os       = Now shows high-priority insights alert
echo                           = Links to all output pages
echo.
git add .
git status --short
echo.
git commit -m "feat: AI OS Phase 3 - auto-drain + reels page + QC reports page + insights alert"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo After deploy:
echo   madmonacairo.com/admin/ai-os         = main dashboard
echo   madmonacairo.com/admin/reels         = reel scripts
echo   madmonacairo.com/admin/qc-reports    = QC reports
echo.
pause
