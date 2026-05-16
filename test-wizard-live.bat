@echo off
echo Testing live wizard deploy + audit trail...
curl -sS -X POST "https://www.madmonacairo.com/api/listing-drafts" ^
  -H "Content-Type: application/json" ^
  -d "{\"category_slug\":\"vehicles-car\",\"source\":\"deploy_test\",\"current_step\":1}" ^
  -w "\nHTTP: %%{http_code}\nTime: %%{time_total}s\n"
echo.
echo Done. Check DB:
echo   SELECT * FROM listing_drafts WHERE source='deploy_test' ORDER BY created_at DESC LIMIT 1;
echo   SELECT * FROM listing_drafts_audit WHERE op='INSERT' ORDER BY ts DESC LIMIT 1;
pause
