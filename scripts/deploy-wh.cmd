@echo off
cd /d E:\madmona-app
echo === نشر whatsapp-webhook ===
supabase functions deploy whatsapp-webhook --project-ref mjhflxpxunwycbiquoig --no-verify-jwt
echo EXIT=%ERRORLEVEL%
