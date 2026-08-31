@echo off
cd /d "%~dp0"
echo === v4 recording (captureScreenshot loop) ===
node record-design-v4.js "شورت ١ - سؤال وجواب.dc.html" 20 > run-v4.log 2>&1
echo.
echo === log tail ===
type run-v4.log
echo.
echo === output ===
dir output\*.mp4 /B /O-D
pause
