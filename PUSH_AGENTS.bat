@echo off
setlocal

cls
echo ============================================
echo   Madmona Agents - Quick Deploy
echo ============================================
echo.

cd /d "C:\madmona-app"

echo [1/5] Where am I:
cd
echo.

echo [2/5] Git status (showing untracked + modified):
git status --short
echo.

echo [3/5] Adding all changes...
git add .
echo.

echo [4/5] Committing...
git commit -m "feat: add Phase 1 virtual agents (signup-concierge, content-marketing, daily-report)"
echo.

echo [5/5] Pushing to GitHub...
git push origin main
echo.

echo ============================================
echo   DONE
echo ============================================
echo.
echo Now go to Vercel and:
echo   1. Add 4 env vars (see docs/VERCEL_ENV_SETUP.md)
echo   2. Wait for auto-deploy or click Redeploy
echo.
pause
