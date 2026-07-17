@echo off
echo Killing chrome...
taskkill /IM chrome.exe /F
ping 127.0.0.1 -n 7 >nul

set SRC=%LOCALAPPDATA%\Google\Chrome\User Data
set DST=E:\madmona-app\scripts\.chrome-fb

echo Copying profile (cookies/login) ...
if not exist "%DST%\Default" mkdir "%DST%\Default"
xcopy "%SRC%\Local State" "%DST%\" /Y >nul 2>&1
robocopy "%SRC%\Profile 1" "%DST%\Default" /E /NFL /NDL /NJH /NJS /NC /NS /XJ /R:0 /W:0 >nul 2>&1

echo Starting chrome on port 9222 with copied profile...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%DST%" --no-first-run --no-default-browser-check "https://www.facebook.com/"
ping 127.0.0.1 -n 14 >nul
curl.exe -s http://127.0.0.1:9222/json/version
echo.
echo ---DONE---
