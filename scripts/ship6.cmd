@echo off
cd /d E:\madmona-app
git add "src/app/api/auth/wa/route.ts" "src/components/WhatsAppLogin.tsx" "src/components/AccountGate.tsx" "src/app/login/page.tsx" "src/app/l/[token]/page.tsx" "src/app/checkout/page.tsx"
git commit -F scripts\msg.txt
git push origin main
echo EXIT=%ERRORLEVEL%
