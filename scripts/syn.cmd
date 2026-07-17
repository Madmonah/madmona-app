@echo off
cd /d E:\madmona-app\scripts
if not exist node_modules\typescript (
  echo --- بسطّب typescript ---
  call npm i typescript@5 --silent --no-fund --no-audit --prefix . 2>nul
)
node syn.js
