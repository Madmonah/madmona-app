@echo off
REM بيشغّل كروم بمنفذ ديباج وبروفايل ثابت — الجلسة بتفضل بعد القفل
set PROF=E:\madmona-app\.wa-profile
if not exist "%PROF%" mkdir "%PROF%"
set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
echo استخدم: "%CHROME%"
start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="%PROF%" --no-first-run --no-default-browser-check "https://web.whatsapp.com"
