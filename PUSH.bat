@echo off
REM ===========================================================
REM  PUSH.bat — الـ deploy الدائم لـ Madmona
REM  استخدمه لأي تغيير، أي وقت. مفيش حاجة تانية.
REM ===========================================================

cd /d C:\madmona-app

echo.
echo [1/3] Adding all changes...
git add -A

echo.
echo [2/3] Committing...
for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set ts=%%I
set ts=%ts:~0,4%-%ts:~4,2%-%ts:~6,2% %ts:~8,2%:%ts:~10,2%
git commit -m "Auto-backup %ts%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ===========================================================
echo  DONE. Vercel builds in ~2 min.
echo ===========================================================
pause
