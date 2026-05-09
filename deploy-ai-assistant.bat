@echo off
REM Deploy: AI Assistant + Anthropic fixes
REM Uses git add -A to catch all changes regardless of path format

echo ================================================================
echo   Deploying: AI Assistant Chat + Anthropic fixes
echo ================================================================
echo.

cd /d "C:\madmona-app"

echo [1/5] Current git status:
git status --short
echo.

echo [2/5] Adding ALL changes...
git add -A

echo.
echo [3/5] What will be committed:
git status --short
echo.

echo [4/5] Committing...
git commit -m "feat: AI Assistant chat interface for natural-language agent control + JSON parser fixes + max_tokens bump"

echo.
echo [5/5] Pushing to main (triggers Vercel auto-deploy)...
git push origin main

echo.
echo ================================================================
echo   Done! Check https://vercel.com/team_j4CSSICBqtcXrCfl4ZP6p06T
echo   for deploy progress (2-3 minutes)
echo.
echo   Then visit: https://madmonacairo.com/admin/ai-assistant
echo ================================================================
pause
