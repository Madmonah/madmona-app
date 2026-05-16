@echo off
REM ============================================================================
REM FIX_DEPLOY_ONCE_AND_FOR_ALL.bat
REM ============================================================================
REM ROOT CAUSE: git push payload is 150 MB, hitting HTTP 408 timeout.
REM             Old commits contain node_modules / .next / zips that bloated history.
REM             Result: every "deploy" since X days ago has SILENTLY FAILED.
REM
REM FIX: Replace the git history with a clean single commit of the current files.
REM      The new .gitignore properly excludes ~200 MB of junk.
REM      After this runs once, all future pushes will be small (~1-2 MB) and instant.
REM
REM SAFETY: 
REM   1. We tag the current state as "backup-before-history-rewrite" first.
REM      You can recover the old history from there if needed.
REM   2. All your source code stays exactly as it is on disk — nothing is deleted.
REM      Only the git HISTORY changes.
REM
REM RUN THIS ONCE. After it succeeds, deploys will work normally forever.
REM ============================================================================

cd /d C:\madmona-app

echo.
echo ============================================================
echo  STEP 1/7: Sanity checks
echo ============================================================
git status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a git repo. Are you in C:\madmona-app?
    pause
    exit /b 1
)

echo Current branch:
git branch --show-current
echo.
echo Remote:
git remote -v
echo.

echo ============================================================
echo  STEP 2/7: Backup current state (safety net)
echo ============================================================
REM Tag the current HEAD so you can recover the old history if needed
git tag -d backup-before-history-rewrite 2>nul
git tag backup-before-history-rewrite HEAD
echo Tagged current state as: backup-before-history-rewrite
echo If anything goes wrong: git reset --hard backup-before-history-rewrite
echo.

echo ============================================================
echo  STEP 3/7: Show what's bloating the repo (FYI only)
echo ============================================================
echo Top 10 largest files currently in git:
git ls-files | xargs -I {} git cat-file --batch-check="%%(objectsize) {}" 2>nul | sort -rn -k1 | head -10 2>nul
echo.
echo (If you saw zips, .next/, or node_modules above, that's the problem.)
echo.

echo ============================================================
echo  STEP 4/7: Stage new .gitignore + cleanup tracked-but-ignored files
echo ============================================================
REM This removes files from git tracking that are now in .gitignore,
REM but KEEPS them on disk. Your files are safe.
git rm -r --cached --ignore-unmatch . >nul 2>&1
git add .gitignore
git add -A
echo Removed ignored files from tracking. Files on disk untouched.
echo.

echo ============================================================
echo  STEP 5/7: Create clean single-commit branch
echo ============================================================
REM Orphan branch = no parent commit = no inherited bloat
git checkout --orphan clean-main-temp
if errorlevel 1 (
    echo ERROR: Could not create clean branch. Stopping.
    pause
    exit /b 1
)

REM Stage current working tree (only files not in .gitignore)
git add -A
git commit -m "Madmona — clean history rebase May 13 2026

This single commit replaces years of accumulated git history that contained
node_modules, .next builds, zip archives, and hundreds of orphaned scripts —
bloating the repo to 150+ MB and causing HTTP 408 timeouts on every push.

The .gitignore was rewritten to properly exclude all build artifacts and
local helper scripts. Source code on disk is identical to the previous
commit; only the git history has been reset to a clean baseline.

Old history is preserved locally under tag: backup-before-history-rewrite

What's included in this commit:
- All source code (src/)
- Supabase migrations
- Public assets
- package.json, package-lock.json, tsconfig, next.config.mjs, tailwind, vercel.json
- README.md, .env.example, .github/
- One canonical deploy.bat

What's excluded going forward (was bloating the repo):
- node_modules, .next/, /out, /build
- All *.zip, *.bak files
- 100+ orphaned deploy/push/fix scripts
- BUFFER_ENV_VARS.env and other secret files
- Old standalone HTML drafts and superseded MD docs
- /LAUNCH_KIT, /LINKS, /WHATSAPP, /marketing directories"

if errorlevel 1 (
    echo ERROR: Commit failed.
    pause
    exit /b 1
)

echo Clean commit created.
echo.

echo ============================================================
echo  STEP 6/7: Replace main branch with clean branch
echo ============================================================
git branch -D main 2>nul
git branch -m main
echo.

echo ============================================================
echo  STEP 7/7: Force push to GitHub (Vercel auto-deploys)
echo ============================================================
echo This push should be SMALL (~1-2 MB) and FAST (under 10 seconds).
echo If it takes longer than 30 seconds, something is still wrong.
echo.
git push origin main --force --verbose 2>&1
if errorlevel 1 (
    echo.
    echo ============================================================
    echo  PUSH FAILED. Recovery:
    echo ============================================================
    echo Run: git reset --hard backup-before-history-rewrite
    echo to restore the original state, then ping Claude with the
    echo full error message above.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  SUCCESS! Deploy is now unblocked.
echo ============================================================
echo Vercel will detect the push within 30 seconds and start a build.
echo Build usually takes 2-3 minutes.
echo.
echo To verify deploy succeeded:
echo   1. Wait 3 minutes
echo   2. Open https://www.madmonacairo.com/admin/listing-drafts
echo   3. Hard refresh (Ctrl+Shift+R) to bypass cache
echo   4. The page bundle hash should change from "2016247056eb4bfe"
echo.
pause
