@echo off
setlocal

cls
echo ================================================
echo   Madmona Agents - Phase 1 Deploy
echo ================================================
echo.

REM ----- Step 1: Install Anthropic SDK -----
echo [1/4] Installing Anthropic SDK...
call npm install @anthropic-ai/sdk
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] SDK installed.
echo.

REM ----- Step 2: Test build -----
echo [2/4] Testing build...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed - see error above
    pause
    exit /b 1
)
echo [OK] Build passed.
echo.

REM ----- Step 3: Git add + commit -----
echo [3/4] Committing...
git add .
git commit -m "feat: add Phase 1 virtual agents"
echo.

REM ----- Step 4: Push to GitHub -----
echo [4/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed - see error above
    pause
    exit /b 1
)

echo.
echo ================================================
echo   DEPLOY DONE
echo ================================================
echo.
echo Next steps:
echo   1. Open: https://vercel.com/dashboard
echo   2. Add 4 environment variables (see docs/VERCEL_ENV_SETUP.md):
echo      - ANTHROPIC_API_KEY
echo      - AGENT_WEBHOOK_SECRET
echo      - CRON_SECRET
echo      - MADMONA_OWNER_EMAIL
echo   3. Redeploy in Vercel
echo.
pause
