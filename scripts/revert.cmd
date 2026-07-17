@echo off
cd /d E:\madmona-app
git revert --no-edit ddd72be
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git log --oneline -2
git rev-parse HEAD
git rev-parse origin/main
