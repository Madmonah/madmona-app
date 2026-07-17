@echo off
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="E:\madmona-app\scripts\.chrome-fb" --no-first-run --no-default-browser-check "https://www.facebook.com/"
ping 127.0.0.1 -n 15 >nul
cd /d E:\madmona-app\scripts
node fb-shot2.js
