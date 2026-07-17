@echo off
cd /d E:\madmona-app
git add "src/app/real-estate/market/MarketExplorer.tsx"
git commit -F scripts\msg.txt
git push origin main
echo EXIT=%ERRORLEVEL%
