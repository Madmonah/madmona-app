@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Phase 5 Final - Prompt Versions Review UI
echo ================================================================
echo.
echo NEW PAGES:
echo   /admin/prompt-versions  = review and activate AI-improved prompts
echo.
echo NEW API:
echo   /api/admin/prompt-version-action  = activate/reject prompts
echo.
echo UPGRADED:
echo   /admin/ai-os = adds prompt-versions tile + alert banner
echo.
echo FIXED:
echo   - Schema mismatch: runs_count + metric_date columns added
echo   - snapshot_agent_performance() function created
echo.
git add .
git status --short
echo.
git commit -m "feat: prompt versions review UI + schema alignment for Phase 5"
git push origin main
echo.
echo ================================================================
echo   DONE
echo ================================================================
echo.
echo Next: Test the full self-improvement loop:
echo   1. Visit /admin/prompt-versions
echo   2. Review the v1 prompt for content-marketing
echo   3. Click "فعّل" to activate it
echo   4. Run content-marketing again - should be 100%% success!
echo.
pause
