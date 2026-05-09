@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: PHASE 5 - Self-Improving AI Agents
echo ================================================================
echo.
echo NEW AGENTS:
echo   - performance-tracker  (يحسب metrics لكل agent)
echo   - prompt-optimizer     (يحلل ضعف الـ agents ويقترح تحسينات)
echo.
echo NEW DB TABLES:
echo   - agent_performance_metrics
echo   - prompt_versions
echo   - feedback_signals
echo   - agent_improvements
echo.
echo BUG FIX:
echo   content-marketing email send removed (was 50%% failure)
echo.
git add .
git status --short
echo.
git commit -m "feat: Phase 5 - Self-improving AI agents (performance tracker + prompt optimizer + feedback loop)"
git push origin main
echo.
echo ================================================================
echo   DONE
echo ================================================================
echo.
pause
