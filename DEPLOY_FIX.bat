@echo off
echo ================================================================
echo   DEPLOY FIX - max_tokens 8000 + brief JSON
echo ================================================================
echo.

cd /d "C:\madmona-app"

echo === GIT STATUS ===
git status --short
echo.

echo === ADD ALL ===
git add -A
echo.

echo === STATUS AFTER ADD ===
git status --short
echo.

echo === COMMIT ===
git commit -m "fix: bump AI Assistant max_tokens to 8000 + force brief JSON"
echo.

echo === PUSH ===
git push origin main
echo.

echo ================================================================
echo   DONE - wait 2-3 min for Vercel auto-deploy
echo ================================================================
pause
