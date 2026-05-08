@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   FIX FINAL: Dashboard + Marketplace Suppliers
echo ================================================================
echo.
echo PROBLEMS:
echo   1. Dashboard كان بيعمل 9 queries فبيعلق
echo   2. Marketplace-suppliers كانت بترجع error
echo.
echo SOLUTIONS:
echo   1. Dashboard دلوقتي 1 query بدل 9
echo   2. Suppliers بتستخدم Supabase RPC مباشر بدون API
echo   3. Database functions جديدة مع admin check مدمج
echo.
git add .
git status --short
echo.
git commit -m "fix: dashboard + marketplace-suppliers use direct Supabase RPCs"
git push origin main
echo.
echo ================================================================
echo   DONE - استنى دقيقة وافتح الصفحات من تاني
echo ================================================================
echo.
pause
