@echo off
title Madmona - Chrome for Facebook scraping
echo.
echo  ====================================================
echo   1) هيقفل كل نوافذ كروم المفتوحة
echo   2) هيفتح كروم جديد بمنفذ الديبج
echo   3) سجّل دخول فيسبوك في النافذة دي
echo   4) سيب النافذة دي مفتوحة وارجع قول لكلود "تمام"
echo  ====================================================
echo.
pause

taskkill /IM chrome.exe /F >nul 2>&1
ping 127.0.0.1 -n 6 >nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="E:\madmona-app\scripts\.chrome-fb" ^
  --no-first-run --no-default-browser-check ^
  "https://www.facebook.com/"

ping 127.0.0.1 -n 10 >nul
echo.
curl.exe -s http://127.0.0.1:9222/json/version
echo.
echo.
echo  ^>^> لو شايف Browser: Chrome فوق يبقى تمام
echo  ^>^> سجّل دخول فيسبوك، وسيب النافذة دي (السودا) مفتوحة
echo.
pause
