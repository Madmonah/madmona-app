@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "fix: ARQA 3 missing projects, link listings to projects, auto-account trigger, runbook"
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
