@echo off
cd /d C:\madmona-app
setlocal enabledelayedexpansion

echo ============================================
echo  PUSH AIOSControls FIX
echo ============================================
echo.

echo === STEP 1: Backup the fixed file ===
mkdir "%TEMP%\fix-backup" 2>nul
copy /Y "src\app\admin\ai-os\AIOSControls.tsx" "%TEMP%\fix-backup\AIOSControls.tsx" > nul
echo Backed up.
echo.

echo === STEP 2: Fetch latest origin/main (which now has buffer-graphql merged) ===
git fetch origin main
echo.

echo === STEP 3: Create fresh branch from origin/main ===
git checkout -B fix-aioscontrols-syntax origin/main 2>&1
echo.

echo === STEP 4: Restore fixed file ===
copy /Y "%TEMP%\fix-backup\AIOSControls.tsx" "src\app\admin\ai-os\AIOSControls.tsx" > nul
echo Restored.
echo.

echo === STEP 5: Stage and diff ===
git add src/app/admin/ai-os/AIOSControls.tsx
git diff --cached --stat
echo.

echo === STEP 6: Commit ===
git commit -m "fix(ai-os): syntax error in AIOSControls.tsx - duplicated closing JSX tags"
echo.

echo === STEP 7: Push the fix branch ===
git push origin fix-aioscontrols-syntax --force-with-lease 2>&1
echo.

echo === STEP 8: Verify ===
timeout /t 3 /nobreak > nul
git ls-remote origin fix-aioscontrols-syntax
echo.

echo === STEP 9: Switch back to main ===
git checkout main
echo.

echo ============================================
echo  DONE!
echo ============================================
echo.
echo PR URL:
echo   https://github.com/Madmonah/madmona-app/compare/main...fix-aioscontrols-syntax
echo.

pause
