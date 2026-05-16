@echo off
title Madmona OBS Recording Guide

echo.
echo ============================================================
echo   OBS Studio Recording - Full Audio + Video Capture
echo ============================================================
echo.
echo This method captures the ORIGINAL Web Audio drone + visuals.
echo Takes ~5 minutes total for all 3 hero films.
echo.
echo PREREQUISITES:
echo   1. Download OBS Studio: https://obsproject.com (free)
echo   2. Install and run OBS once to complete first-time setup
echo.
echo ============================================================
echo   STEPS:
echo ============================================================
echo.
echo 1. Open OBS Studio
echo.
echo 2. Settings -^> Video:
echo    - Base Resolution: 1080x1920  (for Reels/TikTok)
echo      OR 1920x1080  (for YouTube/Facebook)
echo    - Output Resolution: same as base
echo    - FPS: 60
echo.
echo 3. Settings -^> Output:
echo    - Recording Format: MP4
echo    - Recording Quality: High Quality, Medium File Size
echo    - Recording Path: C:\madmona-app\scripts\hero-videos\output\
echo.
echo 4. Settings -^> Audio:
echo    - Desktop Audio: Default  (captures the Web Audio drone)
echo.
echo 5. Add Source -^> Browser:
echo    - URL: https://madmonacairo.com/cosmos.html
echo    - Width: match Base Resolution width
echo    - Height: match Base Resolution height
echo    - Check: "Control audio via OBS"
echo.
echo 6. Click "Start Recording"
echo.
echo 7. Wait 40 seconds (38s video + 2s buffer)
echo.
echo 8. Click "Stop Recording"
echo.
echo 9. Rename the output file:
echo    cosmos_landscape_with_audio.mp4
echo    OR
echo    cosmos_portrait_with_audio.mp4
echo.
echo 10. Repeat for genesis.html and storyboard.html
echo.
echo Press any key to open OBS download page...
pause >nul
start https://obsproject.com
