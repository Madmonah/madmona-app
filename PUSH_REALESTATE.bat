@echo off
chcp 65001 >nul
REM ============================================================
REM PUSH_REALESTATE.bat — حملة العقارات (يوليو 2026)
REM   1) git push (صفحة /real-estate + ملفات الماركتنج)
REM   2) Vercel production deploy
REM   3) deploy فنكشن المارد v5 (سيكتور real_estate)
REM
REM قبل التشغيل (مرة واحدة):
REM   - شغّل supabase_realestate_campaign.sql في Supabase SQL Editor
REM   - قدّم تمبلت madmona_realestate_intro_v1 (الأمر في
REM     marketing\REAL_ESTATE_CAMPAIGN_JULY2026.md آخر الملف)
REM ============================================================

cd /d E:\madmona-app

echo.
echo ==========================================
echo   MADMONA — Real Estate Campaign Deploy
echo ==========================================
echo.

git add src/app/real-estate/page.tsx supabase/functions/marid-restaurant-agent/index.ts marketing/REAL_ESTATE_CAMPAIGN_JULY2026.md marketing/CONTENT_PACK_REAL_ESTATE.md supabase_realestate_campaign.sql PUSH_REALESTATE.bat
git commit -m "feat(real-estate): campaign July 2026 — /real-estate landing + marid v5 real_estate sector + marketing pack"
git push origin main

echo.
echo [2/3] Vercel production deploy...
call vercel --prod --yes

echo.
echo [3/3] Deploy marid v5 edge function...
call supabase functions deploy marid-restaurant-agent

echo.
echo ==========================================
echo   Done. Test checklist:
echo   1) madmonacairo.com/real-estate
echo      (CTA "ضيف الليستنج" يودي /add-listing?src=re-landing)
echo   2) SQL: whatsapp_config فيه realestate_intro_template
echo   3) جرب المارد dry:
echo      curl -H "x-agent-secret: SECRET" ^
echo        "https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/marid-restaurant-agent?dry=1"
echo      لازم تشوف harvest_real_estate في اللوج
echo   4) بعد اعتماد ميتا للتمبلت — الإرسال هيبدأ لوحده
echo ==========================================
echo.
pause
