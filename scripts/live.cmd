@echo off
timeout /t 90 /nobreak > nul
curl -s -o nul -w "HTTP=%%{http_code}\n" https://www.madmonacairo.com/admin/business-finance/a1b2c3d4-1111-4111-8111-111111111111/inventory
echo ---DONE---
