@echo off
cd C:\madmona-app

echo ============================================
echo  Buffer GraphQL API Migration + Deploy
echo ============================================
echo.
echo CHANGES IN THIS DEPLOY:
echo   - src/lib/buffer.ts             (rewritten for GraphQL v2)
echo   - src/lib/agent-runners/buffer-publisher.ts (3 channels: IG + FB Page + FB Group)
echo   - src/app/api/admin/buffer-diagnostic/route.ts (NEW test endpoint)
echo.
echo CHANNELS DETECTED:
echo   - Instagram (madmona.cairo)        ID: 69fdaa9d5c4c051afa22bbad
echo   - Facebook Page (Madmona)          ID: 69fdaaca5c4c051afa22bc45
echo   - Facebook Group (Madmona-mdmwna) ID: 69fdab9a5c4c051afa22bf1f
echo.

echo [1/5] Pulling latest from GitHub first...
git pull origin main --no-edit
if errorlevel 1 (
    echo ERROR: git pull failed.
    pause
    exit /b 1
)
echo.

echo [2/5] Adding modified + new files...
git add -f src/lib/buffer.ts
git add -f src/lib/agent-runners/buffer-publisher.ts
git add -f src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [3/5] Status check:
git status --short
echo.

echo [4/5] Commit...
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher (IG + FB Page + FB Group)"
echo.

echo [5/5] Push to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: git push failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS! Vercel will deploy in ~2 minutes
echo ============================================
echo.
echo NEXT STEPS:
echo   1. Wait 2-3 minutes for Vercel deploy to complete
echo   2. Add 5 env vars in Vercel (see VERCEL_BUFFER_ENV_VARS.md)
echo   3. Click Redeploy in Vercel
echo   4. Test: visit /api/admin/buffer-diagnostic?pw=YOUR_ADMIN_PW
echo.
pause
