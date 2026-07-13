@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "feat(erp): add product manually to inventory - no Excel needed, with photo upload"
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
