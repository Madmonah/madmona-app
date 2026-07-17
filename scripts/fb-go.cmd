@echo off
taskkill /IM chrome.exe /F
timeout /t 6 /nobreak
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Profile 1" "https://www.facebook.com/"
timeout /t 12 /nobreak
echo ---CHROME UP---
cd /d E:\madmona-app\scripts
node fb-shot2.js
