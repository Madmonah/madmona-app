@echo off
cd /d E:\madmona-app
call npx tsc --noEmit -p tsconfig.json > scripts\tsc4.log 2>&1
findstr /i "inventory products\\page MarketExplorer" scripts\tsc4.log
if errorlevel 1 echo === CLEAN ===
