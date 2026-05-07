@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "feat: WhatsApp Cloud API foundation + Supplier Outreach agent (Phase 2A)"
git push origin main
echo.
echo Pushed. Vercel auto-deploy starting.
echo.
echo NEXT STEP: We need to add 3 env vars in Vercel:
echo   - WHATSAPP_PHONE_NUMBER_ID
echo   - WHATSAPP_ACCESS_TOKEN
echo   - WHATSAPP_VERIFY_TOKEN  (any random string you choose)
echo.
echo Then configure webhook in Meta:
echo   URL: https://www.madmonacairo.com/api/whatsapp/webhook
echo   Verify token: same as WHATSAPP_VERIFY_TOKEN
echo.
pause
