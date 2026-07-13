@echo off
cd /d E:\madmona-app
call npx tsc --noEmit -p tsconfig.json > "E:\madmona-app\scripts\tsc.log" 2>&1
echo TSC_EXIT=%errorlevel%
type "E:\madmona-app\scripts\tsc.log"
