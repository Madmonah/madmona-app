@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "feat: developer accounts + /my-projects dashboard (phone login via WhatsApp, no email/password)"
git push origin main > "E:\madmona-app\scripts\push.log" 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
