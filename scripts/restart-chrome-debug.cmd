@echo off
echo Closing Chrome...
taskkill /IM chrome.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul
echo Starting Chrome with debug port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Profile 1" "https://www.facebook.com/groups/270091898242860/permalink/1594743139111056/"
timeout /t 8 /nobreak >nul
echo Done.
