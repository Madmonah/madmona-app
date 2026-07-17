@echo off
REM ⚠️ NODE_ENV=production بيكسّر `next dev` — البيلد بس اللي بيتشغّل كده
cd /d E:\madmona-app
call npx next build > scripts\out\build.log 2>&1
echo EXIT=%ERRORLEVEL%
findstr /C:"Failed to compile" /C:"Error:" /C:"Type error" /C:"✓ Compiled" /C:"Generating static" scripts\out\build.log
