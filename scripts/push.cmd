@echo off
cd /d E:\madmona-app
git add -A
git commit -m "fix: voice notes lost - waitUntil; remove price-on-request; add 21 projects"
git push origin main
echo === DONE ===
