@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo   PUSH RETRY - increasing buffer size
echo ================================================================
echo.

REM Increase git's HTTP buffer to handle the large push
git config http.postBuffer 524288000
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

echo === Showing what will be pushed ===
git log origin/main..HEAD --oneline
echo.

echo === Pushing with bigger buffer ===
git push origin main

echo.
echo ================================================================
echo  Done. Check Vercel.
echo ================================================================
echo.
pause
