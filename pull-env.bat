@echo off
REM ============================================================
REM Pull environment variables from Vercel into .env.local
REM Just double-click this file to run.
REM ============================================================

cd /d "%~dp0"

echo ==============================================
echo   Pulling environment variables from Vercel
echo ==============================================
echo.
echo If this is your first time, a browser window will
echo open asking you to log in to Vercel. After login,
echo come back here.
echo.
pause

REM Step 1: Login (only needed once; safe to run again)
call npx vercel login

REM Step 2: Link this folder to the Vercel project (if not linked)
call npx vercel link --yes

REM Step 3: Pull all environment variables (development scope)
call npx vercel env pull .env.local --yes

echo.
echo ==============================================
if exist .env.local (
  echo   DONE. .env.local was created.
  echo   Now stop the dev server (Ctrl+C) and run:
  echo     npm run dev
) else (
  echo   FAILED. .env.local was NOT created.
  echo   See errors above and try again.
)
echo ==============================================
pause
