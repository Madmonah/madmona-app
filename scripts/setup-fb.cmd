@echo off
cd /d E:\madmona-app\scripts
if not exist package.json npm init -y
npm i puppeteer-core --no-audit --no-fund
node -e "console.log('PUPPETEER OK', require.resolve('puppeteer-core'))"
