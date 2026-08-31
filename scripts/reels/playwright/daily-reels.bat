@echo off
cd /d "%~dp0"
title Madmona Daily Reels
rem === النشر اليومي: يقفل أي نسخة قديمة، يشغل الكرومين لو مقفولين، ويبدأ اللوب ===
rem اللوب بيحاول كل 45 دقيقة، وكل منصة بتاخد بوست واحد بس في اليوم (postedToday guard)

wmic process where "name='node.exe' and commandline like '%%madmona-post.js%%'" delete >nul 2>&1

netstat -ano | findstr ":9222" | findstr LISTENING >nul || start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="E:\madmona-app\scripts\reels\playwright\chrome-cdp-profile" --window-size=1200,900 --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check about:blank

netstat -ano | findstr ":9223" | findstr LISTENING >nul || start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9223 --user-data-dir="E:\madmona-app\scripts\reels\playwright\chrome-social-profile" --window-size=1400,900 --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check about:blank

rem ping بدل timeout — timeout بيفشل من غير كونسول تفاعلي (Task Scheduler)
ping -n 21 127.0.0.1 >nul
node madmona-post.js
