@echo off
cd /d "C:\madmona-app"
echo.
echo === Current Status ===
git status
echo.
echo === Last 5 commits ===
git log --oneline -5
echo.
echo === Adding all changes (forced) ===
git add -A -f
echo.
echo === Status after add ===
git status --short
echo.
echo === Committing ===
git commit -m "fix: dashboard + suppliers RPCs - bypass build issues" --allow-empty
echo.
echo === Pushing ===
git push origin main --force-with-lease
echo.
echo ================================================================
echo  DONE!
echo  استنى دقيقتين وافتح Vercel وشوف لو الـ build نجح
echo ================================================================
echo.
pause
