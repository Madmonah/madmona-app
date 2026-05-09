@echo off
cd /d C:\madmona-app
setlocal enabledelayedexpansion

echo ============================================
echo  SMART PUSH V2 - Step by step
echo ============================================
echo.

echo === STEP 1: Current branch ===
git branch --show-current
echo.

echo === STEP 2: Where origin/main points ===
git ls-remote origin main
echo.

echo === STEP 3: Backup our 3 files to temp ===
mkdir "%TEMP%\buffer-backup" 2>nul
mkdir "%TEMP%\buffer-backup\agent-runners" 2>nul
mkdir "%TEMP%\buffer-backup\admin" 2>nul
copy /Y "src\lib\buffer.ts" "%TEMP%\buffer-backup\buffer.ts" > nul
copy /Y "src\lib\agent-runners\buffer-publisher.ts" "%TEMP%\buffer-backup\agent-runners\buffer-publisher.ts" > nul
copy /Y "src\app\api\admin\buffer-diagnostic\route.ts" "%TEMP%\buffer-backup\admin\route.ts" > nul
echo Backed up 3 files to %TEMP%\buffer-backup
dir "%TEMP%\buffer-backup" /S /B
echo.

echo === STEP 4: Create clean branch from origin/main ===
git checkout -B buffer-graphql origin/main 2>&1
echo.

echo === STEP 5: Restore our 3 files ===
copy /Y "%TEMP%\buffer-backup\buffer.ts" "src\lib\buffer.ts" > nul
copy /Y "%TEMP%\buffer-backup\agent-runners\buffer-publisher.ts" "src\lib\agent-runners\buffer-publisher.ts" > nul

REM Make sure target dir exists for the new file
mkdir "src\app\api\admin\buffer-diagnostic" 2>nul
copy /Y "%TEMP%\buffer-backup\admin\route.ts" "src\app\api\admin\buffer-diagnostic\route.ts" > nul
echo Files restored.
echo.

echo === STEP 6: Git status ===
git status --short
echo.

echo === STEP 7: Stage the 3 files ===
git add src/lib/buffer.ts
git add src/lib/agent-runners/buffer-publisher.ts
git add src/app/api/admin/buffer-diagnostic/route.ts
git status --short
echo.

echo === STEP 8: Diff stats ===
git diff --cached --stat
echo.

echo === STEP 9: Commit ===
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher + diagnostic"
echo.

echo === STEP 10: Push (small - only delta from origin/main) ===
git push origin buffer-graphql --force-with-lease 2>&1
echo.

echo === STEP 11: Verify on GitHub ===
timeout /t 3 /nobreak > nul
git ls-remote origin buffer-graphql
echo.

echo === STEP 12: Switch back to main ===
git checkout main
echo.

echo ============================================
echo  DONE!
echo ============================================
echo.
echo If push succeeded, the branch is on GitHub.
echo Now merge via Pull Request:
echo   https://github.com/Madmonah/madmona-app/compare/main...buffer-graphql
echo.
pause
