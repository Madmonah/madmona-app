@echo off
cd /d C:\madmona-app

echo ============================================
echo  SMART PUSH - via separate branch
echo ============================================
echo.
echo Strategy: instead of pushing to main (143MB stuck),
echo we create a clean branch with only our 3 files
echo and push that. Then merge on GitHub.
echo.

echo [1/8] Create a fresh branch from origin/main (clean state)...
git fetch origin main
git checkout -B buffer-graphql origin/main
if errorlevel 1 (
    echo ERROR: checkout failed
    pause
    exit /b 1
)
echo.

echo [2/8] Verify we're on the clean branch...
git status
echo.

echo [3/8] Copy our 3 modified files from main to working tree...
echo (Local files preserved - just need to re-add them to clean branch)
git checkout main -- src/lib/buffer.ts
git checkout main -- src/lib/agent-runners/buffer-publisher.ts
git checkout main -- src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [4/8] Stage them on the new branch...
git add src/lib/buffer.ts
git add src/lib/agent-runners/buffer-publisher.ts
git add src/app/api/admin/buffer-diagnostic/route.ts
git status --short
echo.

echo [5/8] Commit on clean branch...
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher + diagnostic endpoint"
if errorlevel 1 (
    echo Empty commit fallback...
    git commit --allow-empty -m "trigger redeploy"
)
echo.

echo [6/8] Push clean branch (should be fast - only 3 small files diff)...
git push origin buffer-graphql --force
if errorlevel 1 (
    echo ERROR: push failed
    pause
    exit /b 1
)
echo.

echo [7/8] Done pushing. Verifying on GitHub...
timeout /t 3 /nobreak > nul
git ls-remote origin buffer-graphql
echo.

echo [8/8] Switch back to main locally...
git checkout main
echo.

echo ============================================
echo  SUCCESS! Branch pushed to GitHub.
echo ============================================
echo.
echo NEXT: Open this URL to create a Pull Request on GitHub:
echo   https://github.com/Madmonah/madmona-app/compare/main...buffer-graphql
echo.
echo Or merge the branch directly. Once merged to main, Vercel will deploy.
echo.

pause
