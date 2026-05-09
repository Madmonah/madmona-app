@echo off
cd /d C:\madmona-app

echo ============================================
echo  PUSH BUFFER V4 - Force git to see changes
echo ============================================
echo.

echo [1/9] Checking what git thinks the buffer.ts hash is...
git ls-files -s src/lib/buffer.ts
echo.

echo [2/9] Checking the actual file hash on disk...
git hash-object src/lib/buffer.ts
echo.

echo [3/9] If hashes differ, git will see the change. Forcing update-index...
git update-index --no-assume-unchanged src/lib/buffer.ts 2>nul
git update-index --no-assume-unchanged src/lib/agent-runners/buffer-publisher.ts 2>nul
git update-index --no-assume-unchanged src/app/api/admin/buffer-diagnostic/route.ts 2>nul
echo.

echo [4/9] Refresh git index...
git update-index --refresh
echo.

echo [5/9] Now check status again...
git status --short src/lib/buffer.ts src/lib/agent-runners/buffer-publisher.ts src/app/api/admin/buffer-diagnostic/
echo.

echo [6/9] Force-add (intentionally re-stage)...
git add -A src/lib/buffer.ts
git add -A src/lib/agent-runners/buffer-publisher.ts
git add -A src/app/api/admin/buffer-diagnostic/
echo.

echo [7/9] Show staged...
git diff --cached --stat
echo.

echo [8/9] Commit...
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher + diagnostic endpoint"
if errorlevel 1 (
    echo No changes detected. Touching files to force change...
    powershell -Command "(Get-Item 'src\lib\buffer.ts').LastWriteTime = Get-Date"
    powershell -Command "(Get-Item 'src\lib\agent-runners\buffer-publisher.ts').LastWriteTime = Get-Date"
    powershell -Command "(Get-Item 'src\app\api\admin\buffer-diagnostic\route.ts').LastWriteTime = Get-Date"
    
    echo Re-reading files and re-staging...
    git add -A src/lib/buffer.ts src/lib/agent-runners/buffer-publisher.ts src/app/api/admin/buffer-diagnostic/
    git status --short
    
    git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher + diagnostic endpoint" 
    if errorlevel 1 (
        echo Truly no changes - file is identical to HEAD. Doing empty commit...
        git commit --allow-empty -m "chore: trigger Vercel redeploy"
    )
)
echo.

echo [9/9] Push to GitHub...
git push origin main
if errorlevel 1 ( echo ERROR push & pause & exit /b 1 )
echo.

echo ============================================
echo  Verifying via Vercel deployment...
echo ============================================
timeout /t 30 /nobreak > nul

echo Testing diagnostic endpoint (looking for 401 not 404):
curl -s -o nul -w "HTTP %%{http_code}\n" "https://www.madmonacairo.com/api/admin/buffer-diagnostic"
echo (401 = endpoint exists & needs auth, 404 = still missing)
echo.

pause
