@echo off
echo Closing Chrome...
taskkill /IM chrome.exe /F >nul 2>&1
timeout /t 4 /nobreak >nul
echo Starting Chrome (your FB profile) on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Profile 1" "https://www.facebook.com/"
timeout /t 10 /nobreak >nul
curl.exe -s http://127.0.0.1:9222/json/version
echo.
echo ---READY---
