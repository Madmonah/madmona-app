@echo off
cd /d "%~dp0"
echo ==============================================
echo   Fix: listing detail page hanging on loading
echo ==============================================
pause
git add .
git commit -m "fix: handle supabase rpc/query errors so listing detail loads"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
