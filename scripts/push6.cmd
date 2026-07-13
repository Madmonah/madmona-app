@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "feat(admin): projects-media inventory - link WhatsApp media to projects with one click"
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD > scripts\h1.txt
git rev-parse origin/main > scripts\h2.txt
type scripts\h1.txt
type scripts\h2.txt
