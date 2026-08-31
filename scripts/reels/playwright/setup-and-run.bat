@echo off
cd /d "%~dp0"
echo === installing puppeteer-core (one-time) ===
call npm install puppeteer-core@latest --no-save 2>nul || call npm install puppeteer-core@latest
echo.
echo === starting cycle ===
node cycle-all.js
pause
