@echo off
cd /d "%~dp0"
node diag.js > diag.log 2>&1
type diag.log
pause
