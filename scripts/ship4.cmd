@echo off
cd /d E:\madmona-app
git add "src/app/api/auth/wa/route.ts" "src/app/l/[token]/page.tsx" "src/components/WhatsAppLogin.tsx" "src/app/auth/login/page.tsx" "supabase/functions/whatsapp-webhook/index.ts"
git commit -F scripts\msg.txt
git push origin main
echo EXIT=%ERRORLEVEL%
