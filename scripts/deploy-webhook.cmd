@echo off
cd /d E:\madmona-app
echo === Deploying whatsapp-webhook ===
npx supabase functions deploy whatsapp-webhook --project-ref mjhflxpxunwycbiquoig --no-verify-jwt
echo === EXIT %ERRORLEVEL% ===
