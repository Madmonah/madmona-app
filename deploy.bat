@echo off
cd /d "%~dp0"
echo ================================================================
echo   PIPELINE OS: Coordinated Agent Teams
echo ================================================================
echo.
echo   FEATURE: Agents now work as coordinated TEAMS
echo   * 4 pipelines defined:
echo     - daily-content (6am): trend -^> content -^> reel -^> ad -^> carousel
echo     - lead-funnel (every 2h): qualifier -^> outreach -^> followup -^> closer
echo     - quality-trust (every 6h): qc -^> fraud -^> complaints
echo     - pricing-strategy (10am): demand -^> competitors -^> optimizer
echo.
echo   ADMIN UI: New /admin/pipelines page
echo   * Live status indicators for running pipelines
echo   * One-click manual trigger
echo   * Step-by-step run history
echo   * Shared context viewer (see what each agent passed to next)
echo.
echo   New API routes:
echo   * GET  /api/admin/pipelines (list + stats)
echo   * POST /api/admin/pipelines/trigger (manual run)
echo   * GET  /api/admin/pipelines/runs/[id] (run details)
echo.
echo   New Edge Function: pipeline-runner (Supabase, deployed)
echo   New tables: agent_pipelines, pipeline_runs, pipeline_step_runs
echo   New cron jobs: 4 (one per pipeline)
echo.
echo   Affected files:
echo   * src/app/admin/pipelines/page.tsx (NEW - 500 lines)
echo   * src/app/api/admin/pipelines/route.ts (NEW)
echo   * src/app/api/admin/pipelines/trigger/route.ts (NEW)
echo   * src/app/api/admin/pipelines/runs/[id]/route.ts (NEW)
echo   * src/app/admin/dashboard/page.tsx (added Pipeline OS card)
echo.
echo   Pushing to GitHub now...
echo.
git add .
git commit -m "feat: Pipeline OS - coordinated agent teams with admin UI" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 2 min for Vercel deploy then visit:
  echo   https://www.madmonacairo.com/admin/pipelines
) else (
  echo   PUSH FAILED.
)
pause
