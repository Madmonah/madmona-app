@echo off
chcp 65001 >nul
title Madmona MUA Landing Page Deploy
color 0A
setlocal

echo.
echo  ================================================================
echo   Madmona MUA Landing Page - Safe Deploy Script
echo  ================================================================
echo.

REM ===== Navigate to project root =====
cd /d C:\madmona-app
echo  [INFO] Working in: %CD%
echo.

REM ===== STEP 1: Verify the landing page file exists =====
echo  ================================================================
echo   STEP 1/7: Verify landing page file exists
echo  ================================================================
if not exist "public\mua.html" (
    echo  [ERROR] public\mua.html NOT FOUND!
    echo  [ERROR] Cannot continue. Please tell Claude.
    echo.
    pause
    exit /b 1
)
for %%A in (public\mua.html) do echo  [OK] public\mua.html exists - %%~zA bytes
echo.

REM ===== STEP 2: Create safety backup branch =====
echo  ================================================================
echo   STEP 2/7: Create safety backup branch
echo  ================================================================
git branch backup-before-mua-landing 2>nul
if errorlevel 1 (
    echo  [OK] Backup branch 'backup-before-mua-landing' already exists
) else (
    echo  [OK] Created backup branch 'backup-before-mua-landing'
)
echo  [INFO] To rollback later: git reset --hard backup-before-mua-landing
echo.

REM ===== STEP 3: Show current git status =====
echo  ================================================================
echo   STEP 3/7: Show current git status
echo  ================================================================
git status --short
echo.

REM ===== STEP 4: Stage the new file =====
echo  ================================================================
echo   STEP 4/7: Stage public/mua.html
echo  ================================================================
git add public/mua.html
if errorlevel 1 (
    echo  [ERROR] git add failed!
    pause
    exit /b 1
)
echo  [OK] File staged
echo.

REM ===== STEP 5: Verify staged changes =====
echo  ================================================================
echo   STEP 5/7: Verify staged changes ^(should show public/mua.html^)
echo  ================================================================
git status --short
echo.

REM ===== STEP 6: Commit =====
echo  ================================================================
echo   STEP 6/7: Commit changes
echo  ================================================================
git commit -m "feat: Add MUA landing page at /mua.html + complete remote merge"
if errorlevel 1 (
    echo.
    echo  [WARNING] Commit returned error - possibly nothing to commit
    echo  [INFO] Continuing to push anyway...
)
echo.

REM ===== STEP 7: Push to GitHub =====
echo  ================================================================
echo   STEP 7/7: Push to GitHub ^(triggers Vercel auto-deploy^)
echo  ================================================================
git push origin main
if errorlevel 1 (
    echo.
    echo  [ERROR] Push failed!
    echo  [ERROR] Please copy the output above and send to Claude.
    echo.
    pause
    exit /b 1
)
echo.

REM ===== SUCCESS =====
echo  ================================================================
echo   DEPLOY COMPLETE - Push successful!
echo  ================================================================
echo.
echo   Vercel will auto-deploy in 60-120 seconds.
echo.
echo   FINAL URL FOR THE META AD:
echo   https://madmonacairo.com/mua.html
echo.
echo   SAFETY:
echo   To rollback if needed: git reset --hard backup-before-mua-landing
echo.
echo   Check Vercel deployment at: https://vercel.com
echo.
echo  ================================================================
echo.
pause
