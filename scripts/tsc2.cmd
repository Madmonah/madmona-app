@echo off
cd /d E:\madmona-app
call npx tsc --noEmit -p tsconfig.json > scripts\tsc2.log 2>&1
findstr /i "projects-media my-projects" scripts\tsc2.log
if errorlevel 1 echo === NO_ERRORS_IN_MY_FILES ===
