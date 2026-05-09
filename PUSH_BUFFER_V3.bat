@echo off
cd /d C:\madmona-app

echo ============================================
echo  PUSH BUFFER V3 - Smart commit
echo ============================================
echo.

echo [1/7] Verify the 3 files exist locally...
if not exist "src\lib\buffer.ts" ( echo ERROR: buffer.ts MISSING & pause & exit /b 1 )
if not exist "src\lib\agent-runners\buffer-publisher.ts" ( echo ERROR: buffer-publisher.ts MISSING & pause & exit /b 1 )
if not exist "src\app\api\admin\buffer-diagnostic\route.ts" ( echo ERROR: buffer-diagnostic\route.ts MISSING & pause & exit /b 1 )
echo OK - All 3 files present locally
echo.

echo [2/7] Check what's tracked vs the working tree...
echo --- buffer.ts diff vs HEAD: ---
git diff HEAD -- src/lib/buffer.ts > nul 2>&1
git diff --stat HEAD -- src/lib/buffer.ts
echo.
echo --- buffer-publisher.ts diff vs HEAD: ---
git diff --stat HEAD -- src/lib/agent-runners/buffer-publisher.ts
echo.
echo --- buffer-diagnostic route diff vs HEAD: ---
git diff --stat HEAD -- src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [3/7] Pull latest...
git pull origin main --no-edit
if errorlevel 1 ( echo ERROR pull & pause & exit /b 1 )
echo.

echo [4/7] Force-add the 3 files (ignores .gitignore)...
git add -f src/lib/buffer.ts
git add -f src/lib/agent-runners/buffer-publisher.ts
git add -f src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [5/7] Show staged changes...
git status --short
echo.
git diff --cached --stat
echo.

echo [6/7] Commit (allow-empty as fallback)...
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher (IG + FB Page + FB Group)"
if errorlevel 1 (
    echo No changes to commit. Trying allow-empty to force redeploy...
    git commit --allow-empty -m "chore: trigger Vercel redeploy for Buffer GraphQL"
)
echo.

echo [7/7] Push to GitHub...
git push origin main
if errorlevel 1 ( echo ERROR push & pause & exit /b 1 )
echo.

echo ============================================
echo  Done. Vercel will deploy in 2-3 min.
echo ============================================
echo.
echo Next: add 5 env vars to Vercel, then redeploy.
echo.
pause
