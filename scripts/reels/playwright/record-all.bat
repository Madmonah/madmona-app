@echo off
cd /d "%~dp0"
echo === recording all designs in designs.json ===
echo skips files that already have MP4 in output\
echo set FORCE=1 to re-record all
echo.
node record-all.js
pause
