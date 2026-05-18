@echo off
chcp 65001 >nul
title Madmona Deploy - Phase Omega (full AI OS realignment)
color 0A

echo.
echo  ============================================================
echo   Madmona Deploy - Phase Omega (AI OS realignment)
echo  ============================================================
echo.
echo   - system_context table (universal knowledge base)
echo   - Health monitor + auto-alerts (push + WA + email)
echo   - Wake-up helper for stale agents
echo   - Orchestrator + prompt-optimizer retrained
echo   - Daily message push integration (toggle + cron)
echo   - 9 critical agents fired immediately
echo.
echo   DB migrations: ALREADY APPLIED (4 migrations)
echo   This script pushes the ONE frontend change:
echo     - /admin/daily-messages: send_as_push toggle
echo  ============================================================
echo.

cd /d C:\madmona-app

echo  [1/4] Staging...
git add src/app/admin/daily-messages/page.tsx

echo.
echo  [2/4] Staged:
git diff --cached --name-only

echo.
echo  [3/4] Committing...
git commit -m "Phase Omega: send_as_push toggle on daily messages admin"

echo.
echo  [4/4] Pushing...
git push origin main

echo.
echo  ============================================================
echo   DONE. Vercel builds in 2 min.
echo  ============================================================
echo.
echo   POST-DEPLOY VERIFICATION:
echo.
echo   1. Check your phone (+201002229982):
echo      - WhatsApp: 9 critical alerts queued (will arrive shortly)
echo      - Push: 9 admin alerts queued
echo      - Email: 9 messages in outbox (need worker to send)
echo.
echo   2. Visit /admin/daily-messages
echo      Edit a message - scroll to bottom - see the new
echo      blue 'tatba't ka push notification' toggle.
echo.
echo   3. Check agent health:
echo      SELECT health_status, COUNT(*) FROM v_agent_health GROUP BY 1;
echo.
echo   4. Auto-check runs every 15 min (cron: madmona_agent_health_check)
echo.
echo   5. Daily push broadcast: every hour the cron checks if any
echo      message is due for that Cairo hour and broadcasts it.
echo.
echo  ============================================================
echo.
pause
