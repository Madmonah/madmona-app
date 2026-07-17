@echo off
rem نسخة كروم منفصلة للسكرابنج — مش بتقفل اللي مفتوح عندك
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="E:\madmona-app\scripts\.chrome-scrape" ^
  --no-first-run --no-default-browser-check ^
  about:blank
timeout /t 6 /nobreak >nul
curl.exe -s http://127.0.0.1:9222/json/version
echo.
echo ---READY---
