@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo   FIXING GIT - Forcing it to see the changes
echo ================================================================
echo.

REM Touch the files so git sees them as changed (modify timestamps)
copy /b "src\app\api\admin\supplier-action\route.ts" +,, > nul
copy /b "src\app\api\admin\marketplace-suppliers\route.ts" +,, > nul

echo === Git status BEFORE ===
git status --short
echo.

REM Force add even if git thinks nothing changed
git add -A
git update-index --really-refresh
git add -f src/app/api/admin/supplier-action/route.ts
git add -f src/app/api/admin/marketplace-suppliers/route.ts

echo === Git status AFTER force add ===
git status --short
echo.

echo === Show actual file contents that git sees ===
git diff --cached --stat

echo.
echo === Committing with --allow-empty ===
git commit --allow-empty -m "fix: remove @supabase/ssr dependency that broke build"

echo.
echo === Pushing ===
git push origin main

echo.
echo ================================================================
echo  DONE!
echo  Wait 2 minutes then check Vercel deployments
echo ================================================================
echo.
pause
