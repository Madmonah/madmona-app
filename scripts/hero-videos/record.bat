@echo off
title Madmona Hero Recorder

echo.
echo ============================================================
echo   Madmona - Hero Films Auto Recorder
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Install from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies (2-3 minutes first time)...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo Done.
    echo.
)

echo Choose what to record:
echo.
echo   [1] Cosmos V4 - all 3 formats     [PRIMARY, recommended]
echo   [2] All 3 films - all formats     [12 outputs, ~15 minutes]
echo   [3] Cosmos portrait only          [IG Reel/TikTok/Story/YT Short]
echo   [4] Cosmos landscape only         [YouTube/Facebook]
echo   [5] Custom choice
echo.

set /p choice="Choice (1-5): "

if "%choice%"=="1" goto cosmos_all
if "%choice%"=="2" goto all_all
if "%choice%"=="3" goto cosmos_portrait
if "%choice%"=="4" goto cosmos_landscape
if "%choice%"=="5" goto custom
echo Invalid choice.
pause
exit /b 1

:cosmos_all
node record.js cosmos all
goto done

:all_all
node record.js all all
goto done

:cosmos_portrait
node record.js cosmos portrait
goto done

:cosmos_landscape
node record.js cosmos landscape
goto done

:custom
set /p film="Film (cosmos / genesis / storyboard / all): "
set /p fmt="Format (portrait / landscape / square / all): "
node record.js %film% %fmt%
goto done

:done
echo.
echo ============================================================
echo   Done. Output folder: output\
echo ============================================================
explorer output
pause
