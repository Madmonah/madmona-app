@echo off
setlocal
for /f "tokens=2 delims==" %%a in ('findstr "REVALIDATE_SECRET" E:\madmona-app\.env.local') do set SEC=%%a
curl.exe -s -X POST "https://www.madmonacairo.com/api/revalidate" -H "Content-Type: application/json" -H "x-revalidate-secret: %SEC%" -d "{\"paths\":[\"/real-estate/market\"]}"
echo.
echo ---DONE---
