@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Buffer GraphQL API integration for auto-publisher
echo ================================================================
echo.
echo CHANGES:
echo   1. src/lib/buffer.ts             = rewritten for GraphQL API v2
echo   2. src/lib/agent-runners/buffer-publisher.ts = uses 3 channel IDs
echo   3. src/app/api/admin/buffer-diagnostic/route.ts = test endpoint
echo.
echo CHANNELS:
echo   - Instagram (madmona.cairo)        = 69fdaa9d5c4c051afa22bbad
echo   - Facebook Page (Madmona)          = 69fdaaca5c4c051afa22bc45
echo   - Facebook Group (Madmona-مضمونة) = 69fdab9a5c4c051afa22bf1f
echo.
git add .
git status --short
echo.
git commit -m "feat: rewrite Buffer client for GraphQL API v2 + 3-channel auto-publisher"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo NEXT STEPS (after Vercel deploys):
echo   1. Add 5 env vars in Vercel (see VERCEL_BUFFER_ENV_VARS.md)
echo   2. Click "Redeploy" so the env vars take effect
echo   3. Test: visit /api/admin/buffer-diagnostic?pw=YOUR_ADMIN_PW
echo   4. If diagnostic shows ok=true, run buffer-publisher from /admin/ai-os
echo.
pause
