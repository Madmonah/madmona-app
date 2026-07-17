@echo off
cd /d E:\madmona-app
git add "src/app/real-estate/market/MarketExplorer.tsx" "src/app/real-estate/projects/[slug]/page.tsx" "src/app/real-estate/projects/[slug]/UnitsBooking.tsx" "src/app/my-projects/page.tsx" "src/app/my-projects/UnitsManager.tsx" "src/app/api/my-projects/route.ts" "src/app/api/my-projects/units/route.ts" "supabase/functions/whatsapp-webhook/index.ts"
git commit -F scripts\msg.txt
git push origin main
echo EXIT=%ERRORLEVEL%
