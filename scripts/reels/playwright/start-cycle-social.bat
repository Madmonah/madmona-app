@echo off
cd /d "%~dp0"
title Madmona Social Cycle - port 9223
echo === Madmona 20-min cycle on port 9223 (social) ===
set CDP_URL=http://localhost:9223
node cycle-all.js
pause
