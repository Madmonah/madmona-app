@echo off
cd /d E:\madmona-app
git add -A
git commit -q -m "feat(borsa): cover image is the hero - branded fallback banner, projects with images first"
git push origin main > "E:\madmona-app\scripts\push.log" 2>&1
echo EXIT=%errorlevel%
git rev-parse HEAD
git rev-parse origin/main
