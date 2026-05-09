@echo off
cd /d C:\madmona-app

echo ============================================
echo  FIX: Unlock .git folder + push
echo ============================================
echo.

echo [1/6] Closing any process holding .git lock files...
echo (If prompted by Windows Defender, allow access)
echo.

REM Try to release any locks by aggressive GC
git gc --auto 2>nul

REM Remove stale lock files
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"
if exist ".git\packed-refs.lock" del /f ".git\packed-refs.lock"

echo Lock files cleared.
echo.

echo [2/6] Checking what's locking the pack folder...
echo If you see VS Code, GitHub Desktop, or git GUI running, CLOSE THEM NOW.
echo Press a key when ready to continue...
pause
echo.

echo [3/6] Force git to repack and clean...
git repack -d 2>&1 | findstr /v "warning"
echo.

echo [4/6] Check current state:
git log --oneline -5
echo.
echo Local main is at:
git rev-parse HEAD
echo.
echo Remote main is at:
git rev-parse origin/main
echo.

echo [5/6] Force push (since local has 4 unpushed commits)...
git push origin main --force-with-lease
if errorlevel 1 (
    echo.
    echo ERROR: push failed. Trying without lease...
    git push origin main
)
echo.

echo [6/6] Verify GitHub now has our commit...
timeout /t 5 /nobreak > nul
git ls-remote origin main
echo.
echo If the hash above starts with 7cd47540 - SUCCESS, GitHub has our code.
echo.

echo ============================================
echo  Wait 90 seconds for Vercel deploy...
echo ============================================
timeout /t 90 /nobreak > nul

curl -s -o nul -w "buffer-diagnostic endpoint: HTTP %%{http_code}\n" "https://www.madmonacairo.com/api/admin/buffer-diagnostic"
echo.
echo (HTTP 401 = SUCCESS - endpoint deployed!)
echo (HTTP 404 = still missing - check Vercel dashboard for build errors)
echo.

pause
