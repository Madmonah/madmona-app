@echo off
chcp 65001 >nul
title Madmona - Phase Omega.11 Admin UIs Deploy
color 0A

echo.
echo  ============================================================
echo   Phase Omega.11 - Admin UIs Deploy
echo   - /admin/agent-health
echo   - /admin/email-queue
echo   - /admin/email-templates
echo  ============================================================
echo.

cd /d C:\madmona-app

echo  [1/4] Staging...
git add src/app/admin/agent-health/page.tsx ^
        src/app/admin/email-queue/page.tsx ^
        src/app/admin/email-templates/page.tsx

echo.
echo  [2/4] Staged:
git diff --cached --name-only

echo.
echo  [3/4] Committing...
git commit -m "Phase Omega.11: admin/agent-health + admin/email-queue + admin/email-templates UIs"

echo.
echo  [4/4] Pushing...
git push origin main

echo.
echo  ============================================================
echo   DONE. Vercel builds in 2 min.
echo   Then visit:
echo     /admin/agent-health    - 49 agents health monitor
echo     /admin/email-queue     - both email outboxes
echo     /admin/email-templates - 7 templates editor
echo  ============================================================
echo.
pause
