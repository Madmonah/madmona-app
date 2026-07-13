@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "feat: wow project cards (hero media, badges, region banners) + marid never claims false saves + doc-loss alert"
git push origin main > scripts\push.log 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
