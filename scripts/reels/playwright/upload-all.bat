@echo off
cd /d "%~dp0"
echo === record + upload all designs from designs.json ===
echo Each design will be recorded then uploaded to Supabase design_clips.
echo After this finishes, the daily cron auto-rotates through them.
echo.
node record-and-upload.js
pause
