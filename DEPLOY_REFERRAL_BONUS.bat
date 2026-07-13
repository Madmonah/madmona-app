@echo off
setlocal
cd /d "%~dp0"

echo === Madmona: Deploy referral bonus update (50 EGP -> 300 EGP) ===
echo.

REM Remove a stale git lock file if one is present (safe - no git process should be running)
if exist ".git\index.lock" (
    echo Removing stale .git\index.lock ...
    del /f /q ".git\index.lock"
)

echo Staging changed files...
git add "src/components/TermsContent.tsx"
git add "marketing-assets"

echo.
echo Committing...
git commit -m "referral: bump Souq We Eksab bonus 50->300 EGP; add Masr El Gedida outreach kit"

if errorlevel 1 (
    echo.
    echo Nothing to commit or commit failed - check the messages above.
) else (
    echo.
    echo Pushing to origin main...
    git push origin main
)

echo.
echo Done. Press any key to close.
pause >nul
