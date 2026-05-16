@echo off
REM ============================================================================
REM Madmona - One-time Vercel CLI setup
REM ============================================================================
REM ROOT FIX (May 13 2026):
REM   Old system: git push -> GitHub -> Vercel
REM     Problems: 150MB pushes timing out, batch script chaos, silent failures.
REM
REM   New system: Vercel CLI direct upload (incremental, only changed files)
REM     - No git push needed (git stays as code backup, not deploy mechanism)
REM     - Uploads in seconds (only changed files, not full history)
REM     - Cannot fail the same way the git pipeline did
REM
REM   YOU RUN THIS SCRIPT ONCE EVER. After it succeeds, you use DEPLOY.bat
REM   from now on. Forever.
REM ============================================================================

cd /d C:\madmona-app

echo.
echo ============================================================
echo  Step 1/4: Check Node/npm
echo ============================================================
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found. Install Node.js first from https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version
echo.

echo ============================================================
echo  Step 2/4: Install Vercel CLI globally
echo ============================================================
call npm install -g vercel
if errorlevel 1 (
    echo ERROR: Could not install Vercel CLI. Try running this script as admin.
    pause
    exit /b 1
)
echo.
vercel --version
echo.

echo ============================================================
echo  Step 3/4: Login to Vercel
echo ============================================================
echo A browser will open. Login with the SAME account that owns madmonacairo.com.
echo Press any key when ready...
pause >nul
call vercel login
if errorlevel 1 (
    echo ERROR: Vercel login failed.
    pause
    exit /b 1
)
echo.

echo ============================================================
echo  Step 4/4: Link this folder to the madmona-app Vercel project
echo ============================================================
echo When prompted:
echo   - "Set up and deploy?" -^> Yes
echo   - "Which scope?" -^> Pick your Vercel account
echo   - "Link to existing project?" -^> Yes
echo   - "Project name?" -^> madmona-app  (or whatever your project is named)
echo.
call vercel link
if errorlevel 1 (
    echo ERROR: vercel link failed.
    pause
    exit /b 1
)
echo.

echo ============================================================
echo  SETUP COMPLETE
echo ============================================================
echo From now on, every time you want to deploy, just run:
echo.
echo     DEPLOY.bat
echo.
echo Setup is DONE FOREVER. You never run SETUP.bat again unless you
echo change machines or reinstall Windows.
echo.
echo Running first deploy now to verify...
echo.
pause
call DEPLOY.bat
