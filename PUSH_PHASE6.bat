@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: PHASE 6 - Inter-Agent Communication
echo ================================================================
echo.
echo NEW:
echo   - orchestrator agent (يخطط ويوزع التاسكات)
echo   - agent_messages table (الـ agents يبعتوا لبعض)
echo   - agent_collaborations table
echo.
echo NEW PAGES:
echo   /admin/collaborations  = launch + monitor agent teams
echo   /admin/prompt-versions = review AI-improved prompts
echo   /admin/performance     = success rates dashboard
echo.
echo NEW DB FUNCTIONS:
echo   - send_agent_message()
echo   - get_pending_messages()
echo   - mark_message_processed()
echo   - snapshot_agent_performance()
echo.
echo TOTAL:
echo   43 agents (41 enabled) across 9 teams
echo.
git add .
git status --short
echo.
git commit -m "feat: Phase 6 - inter-agent communication + orchestrator + collaborations UI"
git push origin main
echo.
echo ================================================================
echo   DONE
echo ================================================================
echo.
echo After deploy:
echo   1. Visit /admin/collaborations
echo   2. Click a preset goal or write your own
echo   3. Click "اطلق Collaboration"
echo   4. Watch orchestrator dispatch tasks to multiple agents
echo.
pause
