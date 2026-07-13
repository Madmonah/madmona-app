@echo off
cd /d E:\madmona-app
git push origin main > "E:\madmona-app\scripts\push.log" 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
