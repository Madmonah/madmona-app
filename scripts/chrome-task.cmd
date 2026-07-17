@echo off
taskkill /IM chrome.exe /F >nul 2>&1
ping 127.0.0.1 -n 6 >nul

schtasks /delete /tn MadmonaChrome /f >nul 2>&1

schtasks /create /tn MadmonaChrome /sc once /st 00:00 /it /f ^
 /tr "\"C:\Program Files\Google\Chrome\Application\chrome.exe\" --remote-debugging-port=9222 --user-data-dir=E:\madmona-app\scripts\.chrome-fb --no-first-run --no-default-browser-check https://www.facebook.com/"

schtasks /run /tn MadmonaChrome
ping 127.0.0.1 -n 16 >nul
curl.exe -s http://127.0.0.1:9222/json/version
echo.
echo ---DONE---
