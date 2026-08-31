@echo off
cd /d "%~dp0"
echo === recording claude design shortcut ===
echo output will go to output\ folder
echo full log: run-v3.log
echo.
node record-design-v3.js "شورت ١ - سؤال وجواب.dc.html" 25 > run-v3.log 2>&1
echo.
echo === done. output: ===
dir output\*.mp4 /B /O-D
echo.
echo === log tail: ===
type run-v3.log | more
pause
