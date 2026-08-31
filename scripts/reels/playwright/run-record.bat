@echo off
chcp 65001 >nul
cd /d E:\madmona-app\scripts\reels\playwright
node record-design.js > run.log 2>&1
echo done > done.flag
