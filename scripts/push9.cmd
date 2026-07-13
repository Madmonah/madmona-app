@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "docs: runbook - chat audit, doc-loss bug, marid honesty rule"
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
