@echo off
cd /d "%~dp0"
title Madmona 10-platform Cycle
echo === Madmona cycle — 10 platforms every 20 min ===
echo Chrome A on port 9222 (personal): Claude + Facebook
echo Chrome B on port 9223 (Madmona):  IG, X, LinkedIn, YouTube, TikTok, Threads, Bluesky, Pinterest
echo Ctrl+C to stop
echo.
node cycle-all.js
pause
