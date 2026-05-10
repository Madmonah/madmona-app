@echo off
cd /d "%~dp0"
echo ================================================================
echo   MADMONA REEL RENDERER - Setup ^& Run
echo ================================================================
echo.

REM Check Node
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

REM Install dependencies if missing
if not exist "..\..\node_modules\ffmpeg-static" (
  echo Installing FFmpeg + dependencies...
  cd ..\..
  npm install --save-dev ffmpeg-static node-fetch@2 dotenv
  cd scripts\reels
)

REM Check Pexels API key
findstr /C:"PEXELS_API_KEY" ..\..\.env.local >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo PEXELS_API_KEY not found in .env.local
  echo.
  echo Get free key from: https://www.pexels.com/api/
  echo Then add this line to .env.local:
  echo   PEXELS_API_KEY=your_key_here
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo   What to render?
echo ================================================================
echo   1) Latest reel only (test)
echo   2) All drafted reels (full batch)
echo   3) Specific reel ID
echo.
set /p choice="Pick (1/2/3): "

if "%choice%"=="1" (
  node render-reel.js --latest
) else if "%choice%"=="2" (
  node render-reel.js --all-drafted
) else if "%choice%"=="3" (
  set /p reelid="Enter reel_id (UUID): "
  node render-reel.js !reelid!
) else (
  echo Invalid choice.
)

echo.
echo ================================================================
echo   Output folder: %~dp0output\
echo ================================================================
pause
