@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo  STRATEGY: Create new branch and push it (avoids main issues)
echo ================================================================
echo.

git config http.postBuffer 524288000
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999
git config core.compression 0

echo === Current state ===
git log --oneline -3
echo.

echo === Creating new branch from current state ===
git branch -D fix-build 2>nul
git checkout -b fix-build
echo.

echo === Pushing new branch (smaller, just refs to existing objects) ===
git push origin fix-build --force
echo.

echo === If that worked, now merge it into main on GitHub ===
echo Visit: https://github.com/Madmonah/madmona-app/compare/main...fix-build
echo And create a Pull Request, then click "Merge"
echo.
echo OR run this to push main directly:
echo   git checkout main
echo   git push origin main --force
echo.

pause
