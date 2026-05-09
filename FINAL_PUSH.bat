@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo   FINAL PUSH ATTEMPT - with fetch + force
echo ================================================================
echo.

git config http.postBuffer 524288000

echo === Current local commits ===
git log --oneline -5
echo.

echo === Fetching from origin ===
git fetch origin main
echo.

echo === Local vs remote status ===
git log origin/main..HEAD --oneline
echo.

echo === Checking if remote has commits we don't ===
git log HEAD..origin/main --oneline
echo.

echo === Pushing to origin/main ===
git push origin main 2>&1
echo.

echo === IF THE ABOVE FAILS, trying force push ===
git push origin main --force-with-lease 2>&1
echo.

echo === Final state ===
git log --oneline -5
echo.

echo ================================================================
echo  Done. Check GitHub to see if commit appears.
echo  Latest commit should be: 67d44a91
echo ================================================================
echo.
pause
