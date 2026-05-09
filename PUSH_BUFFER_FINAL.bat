@echo off
cd /d C:\madmona-app

echo ============================================
echo  PUSH BUFFER FINAL - Real changes detected
echo ============================================
echo.

echo [1/5] Status (should show 3 modified files)...
git status --short src/lib/buffer.ts src/lib/agent-runners/buffer-publisher.ts src/app/api/admin/
echo.

echo [2/5] Add the 3 files...
git add src/lib/buffer.ts
git add src/lib/agent-runners/buffer-publisher.ts
git add src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [3/5] Show diff stats...
git diff --cached --stat
echo.

echo [4/5] Commit...
git commit -m "feat: Buffer GraphQL API v2 client + 3-channel publisher + diagnostic endpoint"
echo.

echo [5/5] Push to GitHub...
git push origin main
if errorlevel 1 ( echo ERROR push & pause & exit /b 1 )
echo.

echo ============================================
echo  Waiting 90 seconds for Vercel deploy...
echo ============================================
timeout /t 90 /nobreak

echo.
echo Testing the new endpoint:
curl -s -o nul -w "HTTP %%{http_code}\n" "https://www.madmonacairo.com/api/admin/buffer-diagnostic"
echo.
echo (HTTP 401 = endpoint exists and needs auth - SUCCESS)
echo (HTTP 404 = still missing - deploy may still be in progress, retry in 1 min)
echo.

pause
