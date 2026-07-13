@echo off
cd /d E:\madmona-app
call npx tsc --noEmit -p tsconfig.json > scripts\tsc3.log 2>&1
findstr /i "MarketExplorer projects-media my-projects" scripts\tsc3.log
if errorlevel 1 echo === CLEAN ===
